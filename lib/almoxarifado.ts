import { randomUUID } from "node:crypto";
import { banco } from "./local/banco";
import { modoLocal } from "./supabase/config";
import { createClient } from "./supabase/server";

// Dados do almoxarifado. Usa o Supabase quando ele está configurado e o
// banco local (lib/local/banco.ts) quando não está. O saldo nunca é
// gravado: é a soma dos movimentos de cada item.

export type Item = {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  minimo: number;
  local: string;
};

export type TipoMovimento = "entrada" | "saida" | "ajuste";

export type Movimento = {
  id: string;
  itemId: string;
  tipo: TipoMovimento;
  qtd: number; // no ajuste vem com sinal
  data: string; // AAAA-MM-DD
  origemDestino: string;
  retiradoPor: string;
  obs: string;
  estornoDe: string | null;
  estornado: boolean;
  motivoEstorno: string;
  registradoPor: string;
  criadoEm: string;
};

export type DadosItem = Omit<Item, "id">;
export type NovoMovimento = Pick<
  Movimento,
  "itemId" | "tipo" | "qtd" | "data" | "origemDestino" | "retiradoPor" | "obs"
> & { estornoDe?: string };
export type Autor = { nome: string; email: string };

type LinhaItem = {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  minimo: number;
  local: string | null;
};
type LinhaMovimento = {
  id: string;
  item_id: string;
  tipo: TipoMovimento;
  qtd: number;
  data: string;
  origem_destino: string | null;
  retirado_por: string | null;
  obs: string | null;
  estorno_de: string | null;
  estornado: boolean | number;
  motivo_estorno: string | null;
  registrado_por: string;
  criado_em: string;
};

const paraItem = (l: LinhaItem): Item => ({
  id: l.id,
  codigo: l.codigo,
  descricao: l.descricao,
  unidade: l.unidade,
  minimo: Number(l.minimo),
  local: l.local ?? "",
});

const paraMovimento = (l: LinhaMovimento): Movimento => ({
  id: l.id,
  itemId: l.item_id,
  tipo: l.tipo,
  qtd: Number(l.qtd),
  data: l.data,
  origemDestino: l.origem_destino ?? "",
  retiradoPor: l.retirado_por ?? "",
  obs: l.obs ?? "",
  estornoDe: l.estorno_de,
  estornado: Boolean(l.estornado),
  motivoEstorno: l.motivo_estorno ?? "",
  registradoPor: l.registrado_por,
  criadoEm: l.criado_em,
});

const linhaItem = (d: DadosItem) => ({
  codigo: d.codigo,
  descricao: d.descricao,
  unidade: d.unidade,
  minimo: d.minimo,
  local: d.local || null,
});

const linhaMovimento = (m: NovoMovimento, autor: Autor) => ({
  item_id: m.itemId,
  tipo: m.tipo,
  qtd: m.qtd,
  data: m.data,
  origem_destino: m.origemDestino || null,
  retirado_por: m.retiradoPor || null,
  obs: m.obs || null,
  estorno_de: m.estornoDe ?? null,
  registrado_por: autor.nome,
  registrado_email: autor.email,
});

/** Itens e movimentos; devolve null se não foi possível consultar. */
export async function carregarAlmoxarifado(): Promise<{
  itens: Item[];
  movimentos: Movimento[];
} | null> {
  if (modoLocal) {
    const itens = banco()
      .prepare("select * from almox_itens order by descricao")
      .all() as LinhaItem[];
    const movimentos = banco()
      .prepare("select * from almox_movimentos order by data desc, criado_em desc")
      .all() as LinhaMovimento[];
    return { itens: itens.map(paraItem), movimentos: movimentos.map(paraMovimento) };
  }

  const supabase = await createClient();
  const [itens, movimentos] = await Promise.all([
    supabase.from("almox_itens").select("*").order("descricao"),
    supabase
      .from("almox_movimentos")
      .select("*")
      .order("data", { ascending: false })
      .order("criado_em", { ascending: false })
      .range(0, 49999),
  ]);
  if (itens.error || movimentos.error) return null;
  return {
    itens: (itens.data as LinhaItem[]).map(paraItem),
    movimentos: (movimentos.data as LinhaMovimento[]).map(paraMovimento),
  };
}

/** Cria o item, ou altera o item `id`. */
export async function gravarItem(dados: DadosItem, id?: string) {
  if (modoLocal) {
    const l = linhaItem(dados);
    if (id) {
      banco()
        .prepare(
          "update almox_itens set codigo = ?, descricao = ?, unidade = ?, minimo = ?, local = ? where id = ?",
        )
        .run(l.codigo, l.descricao, l.unidade, l.minimo, l.local, id);
    } else {
      banco()
        .prepare(
          "insert into almox_itens (id, codigo, descricao, unidade, minimo, local) values (?, ?, ?, ?, ?, ?)",
        )
        .run(randomUUID(), l.codigo, l.descricao, l.unidade, l.minimo, l.local);
    }
    return;
  }

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("almox_itens").update(linhaItem(dados)).eq("id", id)
    : await supabase.from("almox_itens").insert(linhaItem(dados));
  if (error) throw new Error(error.message);
}

/** Cadastra os itens novos e atualiza os que já têm o mesmo código. */
export async function importarItens(lista: DadosItem[]) {
  if (modoLocal) {
    const comando = banco().prepare(
      `insert into almox_itens (id, codigo, descricao, unidade, minimo, local)
       values (?, ?, ?, ?, ?, ?)
       on conflict (codigo) do update set descricao = excluded.descricao,
         unidade = excluded.unidade, minimo = excluded.minimo, local = excluded.local`,
    );
    for (const d of lista) {
      const l = linhaItem(d);
      comando.run(randomUUID(), l.codigo, l.descricao, l.unidade, l.minimo, l.local);
    }
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("almox_itens")
    .upsert(lista.map(linhaItem), { onConflict: "codigo" });
  if (error) throw new Error(error.message);
}

export async function apagarItem(id: string) {
  if (modoLocal) {
    banco().prepare("delete from almox_itens where id = ?").run(id);
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase.from("almox_itens").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function incluirMovimentos(lista: NovoMovimento[], autor: Autor) {
  if (modoLocal) {
    const comando = banco().prepare(
      `insert into almox_movimentos (id, item_id, tipo, qtd, data, origem_destino,
         retirado_por, obs, estorno_de, registrado_por, registrado_email)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const m of lista) {
      const l = linhaMovimento(m, autor);
      comando.run(
        randomUUID(), l.item_id, l.tipo, l.qtd, l.data, l.origem_destino,
        l.retirado_por, l.obs, l.estorno_de, l.registrado_por, l.registrado_email,
      );
    }
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("almox_movimentos")
    .insert(lista.map((m) => linhaMovimento(m, autor)));
  if (error) throw new Error(error.message);
}

export async function marcarEstornado(id: string, motivo: string) {
  if (modoLocal) {
    banco()
      .prepare("update almox_movimentos set estornado = 1, motivo_estorno = ? where id = ?")
      .run(motivo, id);
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("almox_movimentos")
    .update({ estornado: true, motivo_estorno: motivo })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
