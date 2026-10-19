import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

// Banco local (SQLite) para testar o site sem o Supabase.
// O arquivo local/banco.db é criado sozinho na primeira execução, com os
// usuários e documentos de local/dados-iniciais.json. Usuários novos do
// JSON são incluídos ao reiniciar o servidor. Para recomeçar do zero,
// apague local/banco.db.

const PASTA = path.join(process.cwd(), "local");
export const PASTA_ARQUIVOS = path.join(PASTA, "arquivos");
const DURACAO_SESSAO = 7 * 24 * 60 * 60 * 1000; // 7 dias

export type UsuarioLocal = { email: string; nome: string };
export type DocumentoLocal = {
  id: number;
  titulo: string;
  descricao: string | null;
  caminho: string;
};

type DadosIniciais = {
  usuarios: { email: string; nome: string; senha: string }[];
  documentos: {
    titulo: string;
    descricao?: string;
    caminho: string;
    categoria: string; // slug de lib/categorias.ts
  }[];
};

const global = globalThis as { bancoLocal?: DatabaseSync };

export function banco() {
  if (global.bancoLocal) return global.bancoLocal;

  const db = new DatabaseSync(path.join(PASTA, "banco.db"));
  db.exec(`
    create table if not exists usuarios (
      id integer primary key,
      email text not null unique,
      nome text not null,
      senha_hash text not null
    );
    create table if not exists sessoes (
      token text primary key,
      usuario_id integer not null references usuarios (id),
      expira_em integer not null
    );
    create table if not exists documentos (
      id integer primary key,
      titulo text not null,
      descricao text,
      caminho text not null,
      categoria text not null default 'protocolos',
      criado_em text not null default current_timestamp
    );
    create table if not exists almox_itens (
      id text primary key,
      codigo text not null unique,
      descricao text not null,
      unidade text not null default 'UN',
      minimo real not null default 0,
      local text,
      criado_em text not null default current_timestamp
    );
    create table if not exists almox_movimentos (
      id text primary key,
      item_id text not null references almox_itens (id),
      tipo text not null,
      qtd real not null,
      data text not null,
      origem_destino text,
      retirado_por text,
      obs text,
      estorno_de text,
      estornado integer not null default 0,
      motivo_estorno text,
      registrado_por text not null,
      registrado_email text not null,
      criado_em text not null default (strftime('%Y-%m-%dT%H:%M:%fZ'))
    );
  `);

  // Bancos criados antes de existirem as categorias ganham a coluna aqui.
  const colunas = db.prepare("pragma table_info(documentos)").all() as {
    name: string;
  }[];
  if (!colunas.some((coluna) => coluna.name === "categoria")) {
    db.exec(
      "alter table documentos add column categoria text not null default 'protocolos'",
    );
  }

  const dados: DadosIniciais = JSON.parse(
    fs.readFileSync(path.join(PASTA, "dados-iniciais.json"), "utf8"),
  );

  // Usuários novos do JSON entram a cada inicialização; os que já existem
  // no banco não são alterados.
  const novoUsuario = db.prepare(
    "insert or ignore into usuarios (email, nome, senha_hash) values (?, ?, ?)",
  );
  for (const u of dados.usuarios) {
    novoUsuario.run(u.email.toLowerCase(), u.nome, gerarHash(u.senha));
  }

  const { total } = db
    .prepare("select count(*) as total from documentos")
    .get() as { total: number };
  if (total === 0) {
    const novoDocumento = db.prepare(
      "insert into documentos (titulo, descricao, caminho, categoria) values (?, ?, ?, ?)",
    );
    for (const d of dados.documentos) {
      novoDocumento.run(d.titulo, d.descricao ?? null, d.caminho, d.categoria);
    }
  }

  global.bancoLocal = db;
  return db;
}

function gerarHash(senha: string) {
  const sal = randomBytes(16).toString("hex");
  return `${sal}:${scryptSync(senha, sal, 64).toString("hex")}`;
}

function senhaConfere(senha: string, senhaHash: string) {
  const [sal, hash] = senhaHash.split(":");
  const esperado = Buffer.from(hash, "hex");
  return timingSafeEqual(scryptSync(senha, sal, esperado.length), esperado);
}

/** Confere e-mail e senha; devolve o token da nova sessão ou null. */
export function criarSessao(email: string, senha: string) {
  const usuario = banco()
    .prepare("select id, senha_hash from usuarios where email = ?")
    .get(email.toLowerCase()) as { id: number; senha_hash: string } | undefined;

  if (!usuario || !senhaConfere(senha, usuario.senha_hash)) return null;

  const token = randomBytes(32).toString("hex");
  const expiraEm = Date.now() + DURACAO_SESSAO;
  banco()
    .prepare("insert into sessoes (token, usuario_id, expira_em) values (?, ?, ?)")
    .run(token, usuario.id, expiraEm);
  return { token, expiraEm };
}

export function usuarioDaSessao(token: string | undefined) {
  if (!token) return null;
  const usuario = banco()
    .prepare(
      `select u.email, u.nome from sessoes s
       join usuarios u on u.id = s.usuario_id
       where s.token = ? and s.expira_em > unixepoch('subsec') * 1000`,
    )
    .get(token) as UsuarioLocal | undefined;
  return usuario ?? null;
}

export function apagarSessao(token: string) {
  banco().prepare("delete from sessoes where token = ?").run(token);
}

export function listarDocumentosLocais(categoria: string) {
  return banco()
    .prepare(
      "select id, titulo, descricao, caminho from documentos where categoria = ? order by criado_em desc, id desc",
    )
    .all(categoria) as DocumentoLocal[];
}

export function buscarDocumentoLocal(id: number) {
  const documento = banco()
    .prepare("select id, titulo, descricao, caminho from documentos where id = ?")
    .get(id) as DocumentoLocal | undefined;
  return documento ?? null;
}
