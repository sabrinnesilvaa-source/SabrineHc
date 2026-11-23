import { createSign } from "node:crypto";

// Leitura de pastas do Google Drive com uma conta de serviço.
// A pasta continua privada: basta compartilhá-la (como Leitor) com o e-mail
// da conta de serviço. Variáveis no Vercel:
//   GOOGLE_SERVICE_ACCOUNT_EMAIL  e-mail da conta de serviço
//   GOOGLE_SERVICE_ACCOUNT_KEY    chave privada (campo "private_key" do JSON)
//   DRIVE_PASTA_POPS              id da pasta "PDF's Site" (opcional)

const EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "";
const CHAVE = (process.env.GOOGLE_SERVICE_ACCOUNT_KEY ?? "").replace(/\\n/g, "\n");

export const driveConfigurado = Boolean(EMAIL && CHAVE);

// Categorias do site cuja lista vem de uma pasta do Drive.
// Entrou ou saiu um PDF da pasta, o site mostra na hora.
export const PASTAS_DO_DRIVE: Record<string, string> = {
  protocolos: process.env.DRIVE_PASTA_POPS || "1rhDG9IFgxkpd0l8yQjB0VmKya3LIsUOQ", // "PDF's Site"
};

export const pastaDaCategoria = (categoria: string | null | undefined) =>
  driveConfigurado && categoria ? PASTAS_DO_DRIVE[categoria] : undefined;

// Documentos do Drive usam ids com este prefixo no site.
export const PREFIXO_DRIVE = "drive-";

export type ArquivoDrive = { id: string; nome: string; pastas: string[] };

let token: { valor: string; expiraEm: number } | null = null;

async function tokenDeAcesso() {
  if (token && token.expiraEm > Date.now() + 60_000) return token.valor;
  const agora = Math.floor(Date.now() / 1000);
  const base64 = (obj: object) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const corpo = `${base64({ alg: "RS256", typ: "JWT" })}.${base64({
    iss: EMAIL,
    scope: "https://www.googleapis.com/auth/drive.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: agora,
    exp: agora + 3600,
  })}`;
  const assinatura = createSign("RSA-SHA256").update(corpo).sign(CHAVE, "base64url");
  const resposta = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${corpo}.${assinatura}`,
    }),
    cache: "no-store",
  });
  if (!resposta.ok) throw new Error(`Drive: falha no login (${resposta.status})`);
  const dados = (await resposta.json()) as { access_token: string; expires_in: number };
  token = { valor: dados.access_token, expiraEm: Date.now() + dados.expires_in * 1000 };
  return token.valor;
}

async function chamarDrive(caminho: string, params: Record<string, string>) {
  const url = `https://www.googleapis.com/drive/v3/${caminho}?${new URLSearchParams({
    supportsAllDrives: "true",
    ...params,
  })}`;
  return fetch(url, {
    headers: { Authorization: `Bearer ${await tokenDeAcesso()}` },
    cache: "no-store",
  });
}

/** PDFs da pasta (sem subpastas), em ordem de nome. null se não deu para consultar. */
export async function listarPdfsDaPasta(pasta: string): Promise<ArquivoDrive[] | null> {
  try {
    const arquivos: ArquivoDrive[] = [];
    let pagina: string | undefined;
    do {
      const resposta = await chamarDrive("files", {
        q: `'${pasta}' in parents and mimeType = 'application/pdf' and trashed = false`,
        fields: "nextPageToken, files(id, name, parents)",
        orderBy: "name_natural",
        pageSize: "1000",
        includeItemsFromAllDrives: "true",
        ...(pagina ? { pageToken: pagina } : {}),
      });
      if (!resposta.ok) return null;
      const dados = (await resposta.json()) as {
        nextPageToken?: string;
        files: { id: string; name: string; parents?: string[] }[];
      };
      arquivos.push(
        ...dados.files.map((f) => ({ id: f.id, nome: f.name, pastas: f.parents ?? [] })),
      );
      pagina = dados.nextPageToken;
    } while (pagina);
    return arquivos;
  } catch {
    return null;
  }
}

/** Dados de um arquivo, para conferir em que pasta ele está. */
export async function buscarArquivoDrive(id: string): Promise<ArquivoDrive | null> {
  try {
    const resposta = await chamarDrive(`files/${encodeURIComponent(id)}`, {
      fields: "id, name, parents, trashed",
    });
    if (!resposta.ok) return null;
    const f = (await resposta.json()) as {
      id: string;
      name: string;
      parents?: string[];
      trashed?: boolean;
    };
    return f.trashed ? null : { id: f.id, nome: f.name, pastas: f.parents ?? [] };
  } catch {
    return null;
  }
}

/** Conteúdo do arquivo. */
export async function baixarArquivoDrive(id: string): Promise<ArrayBuffer | null> {
  try {
    const resposta = await chamarDrive(`files/${encodeURIComponent(id)}`, { alt: "media" });
    return resposta.ok ? await resposta.arrayBuffer() : null;
  } catch {
    return null;
  }
}

/** Categoria do site a que o arquivo pertence (pela pasta), ou null. */
export function categoriaDoArquivo(arquivo: ArquivoDrive) {
  if (!driveConfigurado) return null;
  const entrada = Object.entries(PASTAS_DO_DRIVE).find(([, pasta]) =>
    arquivo.pastas.includes(pasta),
  );
  return entrada?.[0] ?? null;
}

/** "POP 02 - SEPSE.pdf" vira "POP 02 – SEPSE". */
export const tituloDoArquivo = (nome: string) =>
  nome.replace(/\.pdf$/i, "").replace(/^((?:POP|FX)\s*\d+)\s*-\s*/i, "$1 – ").trim();
