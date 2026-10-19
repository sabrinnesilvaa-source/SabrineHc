"use server";

import { usuarioAtual } from "@/lib/auth";
import {
  apagarItem,
  carregarAlmoxarifado,
  gravarItem,
  importarItens,
  incluirMovimentos,
  marcarEstornado,
  type DadosItem,
  type Item,
  type Movimento,
  type NovoMovimento,
} from "@/lib/almoxarifado";
import { calcularSaldos } from "@/lib/almoxarifado-saldo";

// Toda ação confere o login de novo e devolve os dados atualizados, para a
// tela não precisar recarregar.
export type Resultado =
  | { ok: true; itens: Item[]; movimentos: Movimento[] }
  | { ok: false; erro: string };

const maiusculo = (texto: unknown) => String(texto ?? "").trim().toUpperCase();
const numero = (valor: unknown) => Number(String(valor ?? "").replace(",", "."));
const hoje = () => new Date().toISOString().slice(0, 10);

async function executar(
  acao: (autor: { nome: string; email: string }) => Promise<string | void>,
): Promise<Resultado> {
  const usuario = await usuarioAtual();
  if (!usuario) return { ok: false, erro: "Sua sessão expirou. Entre de novo." };
  try {
    const erro = await acao(usuario);
    if (erro) return { ok: false, erro };
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : String(e);
    if (mensagem.includes("duplicate") || mensagem.includes("UNIQUE")) {
      return { ok: false, erro: "Já existe um item com esse código." };
    }
    return { ok: false, erro: `Não foi possível salvar: ${mensagem}` };
  }
  const dados = await carregarAlmoxarifado();
  if (!dados) return { ok: false, erro: "Não foi possível consultar o almoxarifado." };
  return { ok: true, ...dados };
}

function limparItem(d: Partial<DadosItem>): DadosItem | string {
  const item = {
    codigo: maiusculo(d.codigo),
    descricao: maiusculo(d.descricao),
    unidade: maiusculo(d.unidade) || "UN",
    minimo: numero(d.minimo) || 0,
    local: maiusculo(d.local),
  };
  if (!item.codigo || !item.descricao) return "Informe o código e a descrição.";
  if (item.minimo < 0) return "O estoque mínimo não pode ser negativo.";
  return item;
}

export async function recarregar() {
  return executar(async () => {});
}

export async function salvarItem(dados: Partial<DadosItem>, id?: string) {
  return executar(async () => {
    const item = limparItem(dados);
    if (typeof item === "string") return item;
    await gravarItem(item, id);
  });
}

export async function importarPlanilha(linhas: Partial<DadosItem>[]) {
  return executar(async () => {
    const itens = linhas.map(limparItem).filter((i) => typeof i !== "string");
    if (!itens.length) return "Nenhuma linha com código e descrição.";
    await importarItens(itens);
  });
}

export async function excluirItem(id: string) {
  return executar(async () => {
    const dados = await carregarAlmoxarifado();
    if (dados?.movimentos.some((m) => m.itemId === id)) {
      return "Este item tem movimentações e não pode ser excluído.";
    }
    await apagarItem(id);
  });
}

export async function registrarMovimento(m: Partial<NovoMovimento>) {
  return executar(async (autor) => {
    const tipo = m.tipo === "saida" ? "saida" : "entrada";
    const qtd = numero(m.qtd);
    if (!m.itemId) return "Escolha um item.";
    if (!(qtd > 0)) return "Informe uma quantidade maior que zero.";
    const dados = await carregarAlmoxarifado();
    if (!dados?.itens.some((i) => i.id === m.itemId)) return "Item não encontrado.";
    const saldo = calcularSaldos(dados.movimentos)[m.itemId] ?? 0;
    if (tipo === "saida" && qtd > saldo) {
      return `Saldo insuficiente: há ${saldo.toLocaleString("pt-BR")} em estoque.`;
    }
    await incluirMovimentos(
      [
        {
          itemId: m.itemId,
          tipo,
          qtd,
          data: /^\d{4}-\d{2}-\d{2}$/.test(m.data ?? "") ? m.data! : hoje(),
          origemDestino: maiusculo(m.origemDestino),
          retiradoPor: maiusculo(m.retiradoPor),
          obs: maiusculo(m.obs),
        },
      ],
      autor,
    );
  });
}

export async function estornar(id: string, motivo: string) {
  return executar(async (autor) => {
    const texto = maiusculo(motivo);
    if (!texto) return "Informe o motivo do estorno.";
    const dados = await carregarAlmoxarifado();
    const original = dados?.movimentos.find((m) => m.id === id);
    if (!dados || !original) return "Movimentação não encontrada.";
    if (original.estornado || original.estornoDe) return "Esta movimentação não pode ser estornada.";
    const inverso: NovoMovimento =
      original.tipo === "ajuste"
        ? { ...base(original), tipo: "ajuste", qtd: -original.qtd }
        : {
            ...base(original),
            tipo: original.tipo === "entrada" ? "saida" : "entrada",
            qtd: original.qtd,
          };
    const saldo = calcularSaldos(dados.movimentos)[original.itemId] ?? 0;
    const efeito = inverso.tipo === "saida" ? -inverso.qtd : inverso.tipo === "ajuste" ? inverso.qtd : 0;
    if (saldo + efeito < 0) return "Não dá para estornar: o saldo atual ficaria negativo.";
    await incluirMovimentos([{ ...inverso, obs: `ESTORNO: ${texto}`, estornoDe: id }], autor);
    await marcarEstornado(id, texto);
  });

  function base(o: Movimento) {
    return { itemId: o.itemId, data: hoje(), origemDestino: "", retiradoPor: "", obs: "" };
  }
}

/** Lança um ajuste para cada item cuja contagem difere do saldo. */
export async function lancarInventario(contagens: Record<string, number>, motivo: string) {
  return executar(async (autor) => {
    const dados = await carregarAlmoxarifado();
    if (!dados) return "Não foi possível consultar o almoxarifado.";
    const saldos = calcularSaldos(dados.movimentos);
    const data = hoje();
    const obs = maiusculo(motivo) || `INVENTÁRIO ${data.split("-").reverse().join("/")}`;
    const ajustes: NovoMovimento[] = Object.entries(contagens)
      .filter(([itemId, contado]) => dados.itens.some((i) => i.id === itemId) && Number.isFinite(contado) && contado >= 0)
      .map(([itemId, contado]) => ({ itemId, d: contado - (saldos[itemId] ?? 0) }))
      .filter(({ d }) => d !== 0)
      .map(({ itemId, d }) => ({
        itemId,
        tipo: "ajuste",
        qtd: d,
        data,
        origemDestino: "INVENTÁRIO",
        retiradoPor: "",
        obs,
      }));
    if (!ajustes.length) return "Nenhuma diferença para ajustar.";
    await incluirMovimentos(ajustes, autor);
  });
}
