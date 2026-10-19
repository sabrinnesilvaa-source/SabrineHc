"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { Item, Movimento } from "@/lib/almoxarifado";
import { calcularSaldos } from "@/lib/almoxarifado-saldo";
import {
  estornar,
  excluirItem,
  importarPlanilha,
  lancarInventario,
  recarregar,
  registrarMovimento,
  salvarItem,
  type Resultado,
} from "./actions";

type Dados = { itens: Item[]; movimentos: Movimento[] };
type Aba = "painel" | "mov" | "itens" | "inv" | "rel";
type Aviso = { texto: string; ok: boolean } | null;

const ABAS: { id: Aba; nome: string }[] = [
  { id: "painel", nome: "Painel" },
  { id: "mov", nome: "Entrada / Saída" },
  { id: "itens", nome: "Itens" },
  { id: "inv", nome: "Inventário" },
  { id: "rel", nome: "Relatórios" },
];
const UNIDADES = ["UN", "CX", "PCT", "KG", "L", "M", "RL", "PAR"];
const MEMORIA = "almox.ultimos";

const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const fdata = (d: string) => d.split("-").reverse().join("/");
const hoje = () => new Date().toISOString().slice(0, 10);
const up = (s: string) => s.toUpperCase();

// Estilos repetidos
const painel = "min-w-0 rounded-lg border border-slate-200 bg-white p-5";
const tituloPainel = "mb-3 font-semibold text-slate-900";
const rotulo = "grid gap-1 text-xs font-semibold text-slate-500";
const campo =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 uppercase focus:border-teal-600 focus:outline-none";
const botao =
  "rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-50";
const botaoLeve =
  "rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-teal-700 transition hover:bg-teal-50";
const th = "border-b border-slate-200 px-2 py-2 text-left text-[11px] font-semibold tracking-wide text-slate-500 uppercase whitespace-nowrap";
const td = "border-b border-slate-100 px-2 py-2 align-top uppercase";
const tdN = `${td} text-right font-mono tabular-nums whitespace-nowrap`;

function Selo({ tipo, children }: { tipo: "ok" | "baixo" | "zero" | "in" | "out" | "aviso"; children: React.ReactNode }) {
  const cores = {
    ok: "border border-teal-700 text-teal-700",
    in: "border border-teal-700 text-teal-700",
    out: "border border-red-700 text-red-700",
    baixo: "bg-amber-50 text-amber-700",
    aviso: "bg-amber-50 text-amber-700",
    zero: "bg-red-50 text-red-700",
  };
  return <span className={`inline-block rounded-full px-2 py-px text-[11px] font-semibold whitespace-nowrap ${cores[tipo]}`}>{children}</span>;
}

function SeloMovimento({ m }: { m: Movimento }) {
  return (
    <span className="flex flex-wrap gap-1">
      {m.estornoDe ? <Selo tipo="aviso">Estorno</Selo>
        : m.tipo === "ajuste" ? <Selo tipo="aviso">Ajuste</Selo>
        : m.tipo === "entrada" ? <Selo tipo="in">Entrada</Selo>
        : <Selo tipo="out">Saída</Selo>}
      {m.estornado && <Selo tipo="zero">Estornado</Selo>}
    </span>
  );
}

const qtdTexto = (m: Movimento) => (m.tipo === "ajuste" && m.qtd > 0 ? "+" : "") + fmt(m.qtd);

function Tabela({ cabecalho, children }: { cabecalho: (string | [string, "n"])[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {cabecalho.map((c, i) => (
              <th key={i} className={`${th} ${Array.isArray(c) ? "text-right" : ""}`}>{Array.isArray(c) ? c[0] : c}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Vazio({ colunas, texto }: { colunas: number; texto: string }) {
  return (
    <tr>
      <td colSpan={colunas} className="py-8 text-center text-sm text-slate-400">{texto}</td>
    </tr>
  );
}

function Mensagem({ aviso }: { aviso: Aviso }) {
  if (!aviso) return null;
  return <p className={`mt-2 text-sm ${aviso.ok ? "text-teal-700" : "text-red-600"}`}>{aviso.texto}</p>;
}

function baixarCsv(nome: string, cabecalho: string[], linhas: (string | number)[][]) {
  const q = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const texto = "﻿" + [cabecalho, ...linhas].map((l) => l.map((v) => q(typeof v === "number" ? String(v).replace(".", ",") : v)).join(";")).join("\n");
  const url = URL.createObjectURL(new Blob([texto], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

// Lê CSV separado por ";" ou "," (com aspas), como o Excel salva.
function lerCsv(texto: string) {
  const linhas = texto.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (!linhas.length) return [];
  const sep = (linhas[0].match(/;/g)?.length ?? 0) >= (linhas[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const partir = (linha: string) => {
    const campos: string[] = [];
    let atual = "", aspas = false;
    for (let i = 0; i < linha.length; i++) {
      const c = linha[i];
      if (c === '"') {
        if (aspas && linha[i + 1] === '"') { atual += '"'; i++; } else aspas = !aspas;
      } else if (c === sep && !aspas) { campos.push(atual); atual = ""; } else atual += c;
    }
    campos.push(atual);
    return campos.map((s) => s.trim());
  };
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const cab = partir(linhas[0]).map(norm);
  const col = (...nomes: string[]) => cab.findIndex((c) => nomes.some((n) => c.startsWith(n)));
  const idx = { codigo: col("cod"), descricao: col("desc", "nome", "item"), unidade: col("un"), minimo: col("min", "estoque min"), local: col("local", "prat") };
  return linhas.slice(1).map((l) => {
    const c = partir(l);
    const v = (i: number) => (i >= 0 ? c[i] ?? "" : "");
    return { codigo: v(idx.codigo), descricao: v(idx.descricao), unidade: v(idx.unidade), minimo: Number(v(idx.minimo).replace(",", ".")) || 0, local: v(idx.local) };
  });
}

export function Almoxarifado({ inicial }: { inicial: Dados }) {
  const [dados, setDados] = useState<Dados>(inicial);
  const [aba, setAba] = useState<Aba>("painel");
  const [pendente, iniciar] = useTransition();
  const { itens, movimentos } = dados;
  const saldos = useMemo(() => calcularSaldos(movimentos), [movimentos]);
  const itemPorId = useMemo(() => new Map(itens.map((i) => [i.id, i])), [itens]);
  const itensOrdenados = useMemo(() => [...itens].sort((a, b) => a.descricao.localeCompare(b.descricao)), [itens]);

  // Executa uma ação do servidor e atualiza a tela com os dados que ela devolve.
  function rodar(acao: () => Promise<Resultado>, aoTerminar: (r: Resultado) => void) {
    iniciar(async () => {
      const r = await acao();
      if (r.ok) setDados({ itens: r.itens, movimentos: r.movimentos });
      aoTerminar(r);
    });
  }

  // Atualiza os dados a cada minuto, para ver o que outras pessoas lançaram.
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") recarregar().then((r) => r.ok && setDados({ itens: r.itens, movimentos: r.movimentos }));
    }, 60000);
    return () => clearInterval(t);
  }, []);

  const contexto = { dados, saldos, itemPorId, itensOrdenados, rodar, pendente };

  return (
    <div className="grid gap-4">
      <nav className="flex flex-wrap gap-1" role="tablist">
        {ABAS.map((a) => (
          <button
            key={a.id}
            role="tab"
            aria-selected={aba === a.id}
            onClick={() => setAba(a.id)}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${aba === a.id ? "border-teal-700 bg-teal-700 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
          >
            {a.nome}
          </button>
        ))}
      </nav>
      {aba === "painel" && <Painel {...contexto} />}
      {aba === "mov" && <Movimentar {...contexto} />}
      {aba === "itens" && <Itens {...contexto} />}
      {aba === "inv" && <Inventario {...contexto} />}
      {aba === "rel" && <Relatorios {...contexto} />}
    </div>
  );
}

type Contexto = {
  dados: Dados;
  saldos: Record<string, number>;
  itemPorId: Map<string, Item>;
  itensOrdenados: Item[];
  rodar: (acao: () => Promise<Resultado>, aoTerminar: (r: Resultado) => void) => void;
  pendente: boolean;
};

function Painel({ dados, saldos }: Contexto) {
  const [busca, setBusca] = useState("");
  const linhas = dados.itens.map((i) => {
    const saldo = saldos[i.id] ?? 0;
    const nivel = saldo <= 0 ? 0 : saldo < i.minimo ? 1 : 2;
    return { i, saldo, nivel };
  });
  const compras = linhas.filter((l) => l.saldo < l.i.minimo).map((l) => ({ ...l, comprar: l.i.minimo * 2 - l.saldo })).sort((a, b) => a.i.descricao.localeCompare(b.i.descricao));
  const mes = hoje().slice(0, 7);
  const q = busca.toLowerCase();
  const visiveis = linhas
    .filter((l) => !q || `${l.i.codigo} ${l.i.descricao}`.toLowerCase().includes(q))
    .sort((a, b) => a.nivel - b.nivel || a.i.descricao.localeCompare(b.i.descricao));

  const numeros = [
    ["Itens cadastrados", dados.itens.length],
    ["Abaixo do mínimo", linhas.filter((l) => l.nivel === 1).length],
    ["Zerados", linhas.filter((l) => l.nivel === 0).length],
    ["Movimentos no mês", dados.movimentos.filter((m) => m.data.startsWith(mes)).length],
  ] as const;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {numeros.map(([nome, valor]) => (
          <div key={nome} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
            <span className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{nome}</span>
            <b className="block text-2xl font-semibold text-slate-900 tabular-nums">{valor}</b>
          </div>
        ))}
      </div>

      <section className={painel}>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-slate-900">Lista de compras</h2>
          {compras.length > 0 && (
            <button
              className={botaoLeve}
              onClick={() => baixarCsv(`lista-de-compras-${hoje()}.csv`, ["Código", "Descrição", "Unidade", "Saldo", "Mínimo", "Comprar"], compras.map((c) => [c.i.codigo, c.i.descricao, c.i.unidade, c.saldo, c.i.minimo, c.comprar]))}
            >
              Baixar lista
            </button>
          )}
        </div>
        <p className="mb-3 text-sm text-slate-500">Itens abaixo do mínimo. A sugestão repõe até o dobro do estoque mínimo.</p>
        <Tabela cabecalho={["Código", "Descrição", ["Saldo", "n"], ["Mínimo", "n"], ["Comprar", "n"]]}>
          {compras.length ? compras.map((c) => (
            <tr key={c.i.id}>
              <td className={`${td} font-mono text-xs`}>{c.i.codigo}</td>
              <td className={td}>{c.i.descricao}</td>
              <td className={tdN}>{fmt(c.saldo)}</td>
              <td className={tdN}>{fmt(c.i.minimo)}</td>
              <td className={`${tdN} font-semibold`}>{fmt(c.comprar)} {c.i.unidade}</td>
            </tr>
          )) : <Vazio colunas={5} texto="Nada a comprar. Todos os itens estão no mínimo ou acima." />}
        </Tabela>
      </section>

      <section className={painel}>
        <h2 className={tituloPainel}>Estoque atual</h2>
        <input className={`${campo} mb-3`} placeholder="Buscar por código ou descrição (aceita leitor)" value={busca} onChange={(e) => setBusca(up(e.target.value))} />
        <Tabela cabecalho={["Código", "Descrição", "Local", ["Saldo", "n"], ["Mínimo", "n"], "Situação"]}>
          {visiveis.length ? visiveis.map((l) => (
            <tr key={l.i.id}>
              <td className={`${td} font-mono text-xs`}>{l.i.codigo}</td>
              <td className={td}>{l.i.descricao}</td>
              <td className={td}>{l.i.local}</td>
              <td className={tdN}>{fmt(l.saldo)} {l.i.unidade}</td>
              <td className={tdN}>{fmt(l.i.minimo)}</td>
              <td className={td}>
                {l.nivel === 0 ? <Selo tipo="zero">Zerado</Selo> : l.nivel === 1 ? <Selo tipo="baixo">Abaixo do mínimo</Selo> : <Selo tipo="ok">OK</Selo>}
              </td>
            </tr>
          )) : <Vazio colunas={6} texto={dados.itens.length ? "Nenhum item encontrado." : "Nenhum item ainda. Cadastre o primeiro na aba Itens."} />}
        </Tabela>
      </section>
    </>
  );
}

function Movimentar({ dados, saldos, itemPorId, itensOrdenados, rodar, pendente }: Contexto) {
  // Tipo, origem/destino, retirado por e leitura automática ficam lembrados neste computador.
  // Esta aba só aparece depois de um clique, nunca no servidor: dá para ler o localStorage já no início.
  const [memoria] = useState(() => {
    try { return JSON.parse(localStorage.getItem(MEMORIA) ?? "null") ?? {}; } catch { return {}; }
  });
  const [tipo, setTipo] = useState<"entrada" | "saida">(memoria.tipo === "saida" ? "saida" : "entrada");
  const [itemId, setItemId] = useState("");
  const [qtd, setQtd] = useState("");
  const [data, setData] = useState(hoje());
  const [origem, setOrigem] = useState<string>(memoria.origem ?? "");
  const [retirado, setRetirado] = useState<string>(memoria.retirado ?? "");
  const [obs, setObs] = useState("");
  const [auto, setAuto] = useState(Boolean(memoria.auto));
  const [leitura, setLeitura] = useState("");
  const [aviso, setAviso] = useState<Aviso>(null);
  const [estornando, setEstornando] = useState<Movimento | null>(null);
  const [motivo, setMotivo] = useState("");
  const [avisoEstorno, setAvisoEstorno] = useState<Aviso>(null);
  const leitor = useRef<HTMLInputElement>(null);
  const campoQtd = useRef<HTMLInputElement>(null);

  useEffect(() => leitor.current?.focus(), []);
  useEffect(() => {
    try { localStorage.setItem(MEMORIA, JSON.stringify({ tipo, origem, retirado, auto })); } catch {}
  }, [tipo, origem, retirado, auto]);

  function registrar(id = itemId, quantidade = qtd) {
    rodar(
      () => registrarMovimento({ tipo, itemId: id, qtd: Number(quantidade.replace(",", ".")), data, origemDestino: origem, retiradoPor: retirado, obs }),
      (r) => {
        if (!r.ok) return setAviso({ texto: r.erro, ok: false });
        const item = itemPorId.get(id);
        setAviso({ texto: `${tipo === "entrada" ? "Entrada" : "Saída"} registrada: ${quantidade} ${item?.unidade ?? ""} de ${item?.descricao ?? ""}.`, ok: true });
        setQtd(""); setObs(""); setLeitura("");
        leitor.current?.focus();
      },
    );
  }

  function aoLer(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const codigo = leitura.trim().toLowerCase();
    if (!codigo) return;
    const item = dados.itens.find((i) => i.codigo.toLowerCase() === codigo);
    if (!item) { setAviso({ texto: `Código ${leitura} não cadastrado. Cadastre-o na aba Itens.`, ok: false }); leitor.current?.select(); return; }
    setItemId(item.id);
    if (auto) registrar(item.id, "1");
    else { setAviso({ texto: `${item.descricao} selecionado. Informe a quantidade.`, ok: true }); campoQtd.current?.focus(); }
  }

  function confirmarEstorno(e: React.FormEvent) {
    e.preventDefault();
    if (!estornando) return;
    rodar(() => estornar(estornando.id, motivo), (r) => {
      if (!r.ok) return setAvisoEstorno({ texto: r.erro, ok: false });
      setEstornando(null); setMotivo(""); setAviso({ texto: "Estorno lançado.", ok: true });
    });
  }

  const ultimos = dados.movimentos.slice(0, 20);
  const itemEstorno = estornando && itemPorId.get(estornando.itemId);

  return (
    <>
      <section className={painel}>
        <h2 className={tituloPainel}>Registrar movimentação</h2>
        <div className="mb-4 flex max-w-sm overflow-hidden rounded-lg border border-slate-200">
          {(["entrada", "saida"] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tipo === t}
              onClick={() => { setTipo(t); leitor.current?.focus(); }}
              className={`flex-1 py-2 text-sm font-semibold transition ${tipo === t ? (t === "entrada" ? "bg-teal-700 text-white" : "bg-red-700 text-white") : "bg-white text-slate-700"}`}
            >
              {t === "entrada" ? "Entrada" : "Saída"}
            </button>
          ))}
        </div>
        <form className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] items-end gap-3" onSubmit={(e) => { e.preventDefault(); registrar(); }}>
          <label className={rotulo}>Código de barras
            <input ref={leitor} className={campo} placeholder="Passe o leitor aqui" autoComplete="off" value={leitura} onChange={(e) => setLeitura(up(e.target.value))} onKeyDown={aoLer} />
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="h-4 w-4 accent-teal-700" />
            Registrar 1 unidade a cada leitura
          </label>
          <label className={rotulo}>Item
            <select className={campo} required value={itemId} onChange={(e) => setItemId(e.target.value)}>
              <option value="">{itensOrdenados.length ? "Escolha o item" : "Cadastre um item primeiro"}</option>
              {itensOrdenados.map((i) => (
                <option key={i.id} value={i.id}>{i.codigo} — {i.descricao} (saldo {fmt(saldos[i.id] ?? 0)} {i.unidade})</option>
              ))}
            </select>
          </label>
          <label className={rotulo}>Quantidade
            <input ref={campoQtd} className={campo} type="number" min="0.01" step="any" required value={qtd} onChange={(e) => setQtd(e.target.value)} />
          </label>
          <label className={rotulo}>Data
            <input className={campo} type="date" required value={data} onChange={(e) => setData(e.target.value)} />
          </label>
          <label className={rotulo}>{tipo === "entrada" ? "Fornecedor / Nota fiscal" : "Setor / Solicitante"}
            <input className={campo} value={origem} onChange={(e) => setOrigem(up(e.target.value))} />
          </label>
          <label className={rotulo}>{tipo === "entrada" ? "Entregue por" : "Retirado por"}
            <input className={campo} value={retirado} onChange={(e) => setRetirado(up(e.target.value))} />
          </label>
          <label className={rotulo}>Observação
            <input className={campo} value={obs} onChange={(e) => setObs(up(e.target.value))} />
          </label>
          <button className={botao} type="submit" disabled={pendente}>Registrar</button>
        </form>
        <Mensagem aviso={aviso} />
      </section>

      {estornando && (
        <section className={`${painel} border-amber-300`}>
          <h2 className={tituloPainel}>Estornar movimentação</h2>
          <p className="mb-3 text-sm text-slate-600 uppercase">
            {estornando.tipo} de {qtdTexto(estornando)} {itemEstorno?.unidade} — {itemEstorno?.descricao} em {fdata(estornando.data)}.
            Será lançado um movimento inverso; o original fica no histórico marcado como estornado.
          </p>
          <form className="flex flex-wrap items-end gap-3" onSubmit={confirmarEstorno}>
            <label className={`${rotulo} min-w-0 flex-1`}>Motivo do estorno
              <input className={campo} required autoFocus placeholder="Ex.: QUANTIDADE LANÇADA ERRADA" value={motivo} onChange={(e) => setMotivo(up(e.target.value))} />
            </label>
            <button className={botao} type="submit" disabled={pendente}>Confirmar estorno</button>
            <button className={botaoLeve} type="button" onClick={() => { setEstornando(null); setAvisoEstorno(null); }}>Cancelar</button>
          </form>
          <Mensagem aviso={avisoEstorno} />
        </section>
      )}

      <section className={painel}>
        <h2 className={tituloPainel}>Últimas movimentações</h2>
        <Tabela cabecalho={["Data", "Tipo", "Item", ["Qtd", "n"], "Destino / origem", "Registrado por", ""]}>
          {ultimos.length ? ultimos.map((m) => (
            <tr key={m.id}>
              <td className={td}>{fdata(m.data)}</td>
              <td className={td}><SeloMovimento m={m} /></td>
              <td className={td}>{itemPorId.get(m.itemId)?.descricao ?? "(item excluído)"}</td>
              <td className={tdN}>{qtdTexto(m)}</td>
              <td className={td}>{m.origemDestino}</td>
              <td className={td}>{m.registradoPor}</td>
              <td className={td}>
                {!m.estornado && !m.estornoDe && (
                  <button className={botaoLeve} onClick={() => { setEstornando(m); setMotivo(""); setAvisoEstorno(null); }}>Estornar</button>
                )}
              </td>
            </tr>
          )) : <Vazio colunas={7} texto="Nenhuma movimentação registrada." />}
        </Tabela>
      </section>
    </>
  );
}

const ITEM_VAZIO = { codigo: "", descricao: "", unidade: "UN", minimo: "0", local: "" };

function Itens({ dados, rodar, pendente }: Contexto) {
  const [form, setForm] = useState(ITEM_VAZIO);
  const [editando, setEditando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<Aviso>(null);
  const [avisoImport, setAvisoImport] = useState<Aviso>(null);
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const descricao = useRef<HTMLInputElement>(null);

  const mudar = (campoNome: keyof typeof ITEM_VAZIO) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [campoNome]: campoNome === "minimo" ? e.target.value : up(e.target.value) });

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    rodar(() => salvarItem({ ...form, minimo: Number(form.minimo.replace(",", ".")) }, editando ?? undefined), (r) => {
      if (!r.ok) return setAviso({ texto: r.erro, ok: false });
      setAviso({ texto: editando ? "Item atualizado." : "Item cadastrado.", ok: true });
      setForm(ITEM_VAZIO); setEditando(null);
    });
  }

  async function importar(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    if (!/\.csv$/i.test(arquivo.name)) {
      return setAvisoImport({ texto: "Use um arquivo CSV. No Excel: Arquivo > Salvar como > CSV (separado por vírgulas ou ponto e vírgula).", ok: false });
    }
    const linhas = lerCsv(await arquivo.text());
    const validas = linhas.filter((l) => l.codigo && l.descricao);
    rodar(() => importarPlanilha(validas), (r) => {
      if (!r.ok) return setAvisoImport({ texto: r.erro, ok: false });
      const ignoradas = linhas.length - validas.length;
      setAvisoImport({ texto: `${validas.length} itens importados${ignoradas ? `, ${ignoradas} linhas sem código ou descrição ignoradas` : ""}.`, ok: true });
    });
  }

  function excluir(id: string) {
    if (confirmar !== id) { setConfirmar(id); setTimeout(() => setConfirmar((c) => (c === id ? null : c)), 3000); return; }
    setConfirmar(null);
    rodar(() => excluirItem(id), (r) => setAviso(r.ok ? { texto: "Item excluído.", ok: true } : { texto: r.erro, ok: false }));
  }

  const ordenados = [...dados.itens].sort((a, b) => a.codigo.localeCompare(b.codigo));

  return (
    <>
      <section className={painel}>
        <h2 className={tituloPainel}>{editando ? "Editar item" : "Cadastrar item"}</h2>
        <form className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] items-end gap-3" onSubmit={salvar}>
          <label className={rotulo}>Código (aceita leitor)
            <input className={campo} required value={form.codigo} onChange={mudar("codigo")} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); descricao.current?.focus(); } }} />
          </label>
          <label className={rotulo}>Descrição
            <input ref={descricao} className={campo} required value={form.descricao} onChange={mudar("descricao")} />
          </label>
          <label className={rotulo}>Unidade
            <select className={campo} value={form.unidade} onChange={mudar("unidade")}>
              {UNIDADES.map((u) => <option key={u}>{u}</option>)}
            </select>
          </label>
          <label className={rotulo}>Estoque mínimo
            <input className={campo} type="number" min="0" step="any" value={form.minimo} onChange={mudar("minimo")} />
          </label>
          <label className={rotulo}>Local (prateleira)
            <input className={campo} placeholder="Ex.: A-03" value={form.local} onChange={mudar("local")} />
          </label>
          <div className="flex gap-2">
            <button className={botao} type="submit" disabled={pendente}>{editando ? "Salvar alterações" : "Salvar item"}</button>
            {editando && <button className={botaoLeve} type="button" onClick={() => { setEditando(null); setForm(ITEM_VAZIO); }}>Cancelar</button>}
          </div>
        </form>
        <Mensagem aviso={aviso} />
      </section>

      <section className={painel}>
        <h2 className={tituloPainel}>Importar planilha</h2>
        <p className="mb-3 text-sm text-slate-500">
          Arquivo CSV com as colunas Código, Descrição, Unidade, Mínimo e Local. Itens com código já cadastrado são atualizados.
          No Excel, use Arquivo &gt; Salvar como &gt; CSV.
        </p>
        <input type="file" accept=".csv" onChange={importar} disabled={pendente} className="text-sm" />
        <Mensagem aviso={avisoImport} />
      </section>

      <section className={painel}>
        <h2 className={tituloPainel}>Itens cadastrados</h2>
        <Tabela cabecalho={["Código", "Descrição", "Un.", ["Mínimo", "n"], "Local", ""]}>
          {ordenados.length ? ordenados.map((i) => (
            <tr key={i.id}>
              <td className={`${td} font-mono text-xs`}>{i.codigo}</td>
              <td className={td}>{i.descricao}</td>
              <td className={td}>{i.unidade}</td>
              <td className={tdN}>{fmt(i.minimo)}</td>
              <td className={td}>{i.local}</td>
              <td className={`${td} whitespace-nowrap`}>
                <span className="flex gap-1">
                  <button className={botaoLeve} onClick={() => { setEditando(i.id); setForm({ codigo: i.codigo, descricao: i.descricao, unidade: i.unidade, minimo: String(i.minimo), local: i.local }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Editar</button>
                  <button className={botaoLeve} onClick={() => excluir(i.id)}>{confirmar === i.id ? "Confirmar?" : "Excluir"}</button>
                </span>
              </td>
            </tr>
          )) : <Vazio colunas={6} texto="Nenhum item cadastrado." />}
        </Tabela>
      </section>
    </>
  );
}

function Inventario({ dados, saldos, rodar, pendente }: Contexto) {
  const [contagens, setContagens] = useState<Record<string, string>>({});
  const [motivo, setMotivo] = useState("");
  const [leitura, setLeitura] = useState("");
  const [aviso, setAviso] = useState<Aviso>(null);

  const ordenados = [...dados.itens].sort((a, b) => a.local.localeCompare(b.local) || a.codigo.localeCompare(b.codigo));
  const diferenca = (id: string) => (contagens[id] === undefined || contagens[id] === "" ? null : Number(contagens[id].replace(",", ".")) - (saldos[id] ?? 0));
  const comDiferenca = ordenados.filter((i) => { const d = diferenca(i.id); return d !== null && d !== 0; }).length;

  function aoLer(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const item = dados.itens.find((i) => i.codigo.toLowerCase() === leitura.trim().toLowerCase());
    setLeitura("");
    if (!item) return setAviso({ texto: "Código não cadastrado.", ok: false });
    const novo = String(Number(contagens[item.id] || 0) + 1);
    setContagens({ ...contagens, [item.id]: novo });
    setAviso({ texto: `${item.descricao}: ${novo}`, ok: true });
  }

  function lancar() {
    const numeros = Object.fromEntries(Object.entries(contagens).filter(([, v]) => v !== "").map(([k, v]) => [k, Number(v.replace(",", "."))]));
    rodar(() => lancarInventario(numeros, motivo), (r) => {
      if (!r.ok) return setAviso({ texto: r.erro, ok: false });
      setAviso({ texto: `${comDiferenca} ajuste(s) lançado(s).`, ok: true });
      setContagens({}); setMotivo("");
    });
  }

  return (
    <section className={painel}>
      <h2 className={tituloPainel}>Inventário (contagem física)</h2>
      <p className="mb-3 text-sm text-slate-500">
        Digite a quantidade contada em cada prateleira, ou passe o leitor uma vez por unidade. Deixe em branco o que não foi contado.
        Ao lançar, o site cria ajustes só para as diferenças.
      </p>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] items-end gap-3">
        <label className={rotulo}>Contar com leitor
          <input className={campo} placeholder="Passe o leitor aqui" autoComplete="off" value={leitura} onChange={(e) => setLeitura(up(e.target.value))} onKeyDown={aoLer} />
        </label>
        <label className={rotulo}>Motivo / referência
          <input className={campo} placeholder="Ex.: INVENTÁRIO MENSAL" value={motivo} onChange={(e) => setMotivo(up(e.target.value))} />
        </label>
        <button className={botao} type="button" onClick={lancar} disabled={pendente}>Lançar ajustes</button>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <Mensagem aviso={aviso} />
        {comDiferenca > 0 && <span className="text-sm text-slate-500">{comDiferenca} item(ns) com diferença.</span>}
      </div>
      <div className="mt-3">
        <Tabela cabecalho={["Código", "Descrição", "Local", ["Sistema", "n"], "Contado", ["Diferença", "n"]]}>
          {ordenados.length ? ordenados.map((i) => {
            const d = diferenca(i.id);
            return (
              <tr key={i.id}>
                <td className={`${td} font-mono text-xs`}>{i.codigo}</td>
                <td className={td}>{i.descricao}</td>
                <td className={td}>{i.local}</td>
                <td className={tdN}>{fmt(saldos[i.id] ?? 0)} {i.unidade}</td>
                <td className={`${td} w-28`}>
                  <input className={campo} type="number" min="0" step="any" aria-label={`Contagem de ${i.descricao}`} value={contagens[i.id] ?? ""} onChange={(e) => setContagens({ ...contagens, [i.id]: e.target.value })} />
                </td>
                <td className={tdN}>
                  {d === null ? "" : d === 0 ? <Selo tipo="ok">Confere</Selo> : <Selo tipo={d > 0 ? "in" : "out"}>{d > 0 ? "+" : ""}{fmt(d)}</Selo>}
                </td>
              </tr>
            );
          }) : <Vazio colunas={6} texto="Nenhum item cadastrado." />}
        </Tabela>
      </div>
    </section>
  );
}

function Relatorios({ dados, itemPorId, itensOrdenados }: Contexto) {
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [itemId, setItemId] = useState("");
  const [tipo, setTipo] = useState("");

  const filtrados = dados.movimentos.filter((m) => (!de || m.data >= de) && (!ate || m.data <= ate) && (!itemId || m.itemId === itemId) && (!tipo || m.tipo === tipo));
  const soma = (t: string) => filtrados.filter((m) => m.tipo === t).reduce((a, m) => a + m.qtd, 0);

  function baixar() {
    baixarCsv("movimentacoes-almoxarifado.csv",
      ["Data", "Tipo", "Código", "Item", "Quantidade", "Unidade", "Destino/Origem", "Retirado/Entregue por", "Registrado por", "Observação"],
      filtrados.map((m) => {
        const i = itemPorId.get(m.itemId);
        return [fdata(m.data), m.estornoDe ? "ESTORNO" : m.tipo.toUpperCase(), i?.codigo ?? "", i?.descricao ?? "", m.qtd, i?.unidade ?? "", m.origemDestino, m.retiradoPor, m.registradoPor, m.obs];
      }));
  }

  return (
    <section className={painel}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-slate-900">Histórico de movimentações</h2>
        <button className={botaoLeve} onClick={baixar} disabled={!filtrados.length}>Baixar CSV</button>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,170px),1fr))] gap-3">
        <label className={rotulo}>De<input className={campo} type="date" value={de} onChange={(e) => setDe(e.target.value)} /></label>
        <label className={rotulo}>Até<input className={campo} type="date" value={ate} onChange={(e) => setAte(e.target.value)} /></label>
        <label className={rotulo}>Item
          <select className={campo} value={itemId} onChange={(e) => setItemId(e.target.value)}>
            <option value="">Todos</option>
            {itensOrdenados.map((i) => <option key={i.id} value={i.id}>{i.codigo} — {i.descricao}</option>)}
          </select>
        </label>
        <label className={rotulo}>Tipo
          <select className={campo} value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todos</option>
            <option value="entrada">Entradas</option>
            <option value="saida">Saídas</option>
            <option value="ajuste">Ajustes de inventário</option>
          </select>
        </label>
      </div>
      <div className="my-4 grid grid-cols-3 gap-3">
        {([["Movimentos", filtrados.length], ["Total entradas", soma("entrada")], ["Total saídas", soma("saida")]] as const).map(([nome, valor]) => (
          <div key={nome} className="rounded-lg border border-slate-200 px-4 py-3">
            <span className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{nome}</span>
            <b className="block text-xl font-semibold tabular-nums">{fmt(valor)}</b>
          </div>
        ))}
      </div>
      <Tabela cabecalho={["Data", "Tipo", "Código", "Item", ["Qtd", "n"], "Destino / origem", "Retirado / entregue por", "Registrado por", "Obs. / motivo"]}>
        {filtrados.length ? filtrados.map((m) => {
          const i = itemPorId.get(m.itemId);
          return (
            <tr key={m.id}>
              <td className={td}>{fdata(m.data)}</td>
              <td className={td}><SeloMovimento m={m} /></td>
              <td className={`${td} font-mono text-xs`}>{i?.codigo}</td>
              <td className={td}>{i?.descricao ?? "(item excluído)"}</td>
              <td className={tdN}>{qtdTexto(m)} {i?.unidade}</td>
              <td className={td}>{m.origemDestino}</td>
              <td className={td}>{m.retiradoPor}</td>
              <td className={td}>{m.registradoPor}</td>
              <td className={td}>{m.obs}{m.motivoEstorno && ` (ESTORNADO: ${m.motivoEstorno})`}</td>
            </tr>
          );
        }) : <Vazio colunas={9} texto="Nenhuma movimentação no filtro escolhido." />}
      </Tabela>
    </section>
  );
}
