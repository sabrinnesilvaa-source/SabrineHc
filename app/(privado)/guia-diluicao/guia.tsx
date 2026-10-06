"use client";

import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import dados from "@/lib/guia-diluicao/dados.json";

// Os dados vêm de lib/guia-diluicao/dados.json, extraídos sem alteração do
// guia original. Cada item é uma apresentação (medicamento + marca).
type Apresentacao = {
  g: keyof typeof GRUPOS;
  n: string; // nome
  a: string; // apresentação
  rec: string; // reconstituição
  vias: string[][]; // [via, diluente, volume/concentração, tempo]
  ta: string; // estabilidade em temperatura ambiente
  rf: string; // estabilidade sob refrigeração
  obs: string;
  pg: number; // página do guia impresso
  tags: (keyof typeof TAGS)[];
  fleb?: string;
};

const GRUPOS = {
  G: { nome: "Injetáveis gerais", cor: "#1A2F5A" },
  A: { nome: "Anestésicos e controlados", cor: "#566079" },
  M: { nome: "Antimicrobianos", cor: "#0D7C6E" },
  C: { nome: "Cardiovascular", cor: "#B36F12" },
};

const TAGS = {
  mav: { nome: "MAV", classe: "bg-red-700 text-white border-red-700" },
  alerta: { nome: "Atenção", classe: "bg-red-50 text-red-700 border-red-700" },
  flebite: {
    nome: "Flebite",
    classe: "bg-amber-50 text-amber-700 border-amber-700",
  },
  foto: {
    nome: "Fotossensível",
    classe: "bg-violet-50 text-violet-700 border-violet-700",
  },
};
const ORDEM_TAGS = ["mav", "alerta", "flebite", "foto"] as const;
const FILTROS_TAGS = ["mav", "flebite", "foto", "alerta"] as const;

const normalizar = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const vazio = (valor?: string) => !valor || valor === "–" || valor === "-";

const APRESENTACOES = (dados as Apresentacao[])
  .map((d) => ({ ...d, chave: normalizar(`${d.n} ${d.a}`) }))
  .sort(
    (a, b) =>
      normalizar(a.n).localeCompare(normalizar(b.n)) || a.a.localeCompare(b.a),
  );

const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const etiqueta =
  "rounded-sm border px-1.5 py-0.5 text-[11px] font-bold tracking-wide uppercase";
const rotulo =
  "block text-[10.5px] font-bold tracking-wider text-slate-500 uppercase";

function Destaque({ texto, busca }: { texto: string; busca: string }) {
  const termo = busca.trim();
  const inicio = termo ? normalizar(texto).indexOf(normalizar(termo)) : -1;
  if (inicio < 0) return texto;
  return (
    <>
      {texto.slice(0, inicio)}
      <mark className="rounded-sm bg-yellow-200">
        {texto.slice(inicio, inicio + termo.length)}
      </mark>
      {texto.slice(inicio + termo.length)}
    </>
  );
}

export function Etiqueta({ tag }: { tag: keyof typeof TAGS }) {
  return <span className={`${etiqueta} ${TAGS[tag].classe}`}>{TAGS[tag].nome}</span>;
}

function Filtro({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm font-semibold transition ${
        ativo
          ? "border-teal-700 bg-teal-700 text-white"
          : "border-slate-300 bg-white text-slate-700 hover:bg-teal-50"
      }`}
    >
      {children}
    </button>
  );
}

function Ficha({ d, busca }: { d: Apresentacao; busca: string }) {
  const grupo = GRUPOS[d.g];
  const critico = d.tags.includes("alerta") || d.tags.includes("mav");

  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div
        className="grid gap-1 border-l-[5px] px-3 py-2"
        style={{ borderLeftColor: grupo.cor }}
      >
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <h3 className="text-lg leading-tight font-bold text-slate-900">
            <Destaque texto={d.n} busca={busca} />
          </h3>
          <span
            className="text-[10.5px] font-bold tracking-wider uppercase"
            style={{ color: grupo.cor }}
          >
            {grupo.nome}
          </span>
        </div>
        <div className="text-[13px] text-slate-500">
          <Destaque texto={d.a} busca={busca} />
        </div>
        {d.tags.length > 0 && (
          <div className="mt-0.5 flex flex-wrap gap-1">
            {ORDEM_TAGS.filter((tag) => d.tags.includes(tag)).map((tag) => (
              <Etiqueta key={tag} tag={tag} />
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-2 border-t border-slate-200 bg-slate-50 px-3 py-1.5 text-[13px] sm:grid-cols-[1fr_auto]">
        <div>
          <b className={rotulo}>Reconstituição</b>
          {d.rec || "–"}
        </div>
        <div className="flex gap-3 sm:text-right">
          <div>
            <b className={rotulo}>Estab. TA</b>
            <span className="font-mono text-xs">{d.ta || "–"}</span>
          </div>
          <div>
            <b className={rotulo}>Estab. RF</b>
            <span className="font-mono text-xs">{d.rf || "–"}</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {["Via", "Diluente", "Volume / concentração", "Tempo"].map(
                (coluna) => (
                  <th
                    key={coluna}
                    className="border-t border-slate-200 px-2 py-1 text-left text-[10.5px] font-bold tracking-wider text-slate-500 uppercase"
                  >
                    {coluna}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {d.vias.map((via, i) => (
              <tr key={i}>
                <td className="border-t border-slate-200 px-2 py-1.5 align-top font-bold whitespace-nowrap text-teal-800">
                  {via[0]}
                </td>
                {[1, 2, 3].map((j) => (
                  <td
                    key={j}
                    className={`border-t border-slate-200 px-2 py-1.5 align-top ${
                      vazio(via[j]) ? "text-slate-400" : ""
                    }`}
                  >
                    {via[j] || "–"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!vazio(d.obs) && (
        <p
          className={`flex items-start gap-2 border-t border-slate-200 px-3 py-2 text-[13px] ${
            critico ? "bg-red-50" : ""
          }`}
        >
          <span
            className={`shrink-0 pt-0.5 text-[10.5px] font-bold tracking-wider uppercase ${
              critico ? "text-red-700" : "text-slate-500"
            }`}
          >
            {critico ? "Atenção" : "Obs."}
          </span>
          <span>{d.obs}</span>
        </p>
      )}

      <div className="mt-auto flex justify-between gap-2 border-t border-dashed border-slate-200 px-3 py-1 text-[11.5px] text-slate-500">
        {d.fleb ? (
          <span className="font-semibold text-amber-700">Flebite: {d.fleb}</span>
        ) : (
          <span>Flebite: –</span>
        )}
        <span>Guia p. {d.pg}</span>
      </div>
    </article>
  );
}

export function GuiaDiluicao() {
  const [busca, setBusca] = useState("");
  const [grupo, setGrupo] = useState("");
  const [tag, setTag] = useState("");
  const campoBusca = useRef<HTMLInputElement>(null);

  // Atalhos: "/" foca a busca e Esc limpa.
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      const campo = campoBusca.current;
      if (!campo) return;
      if (e.key === "/" && document.activeElement !== campo) {
        e.preventDefault();
        campo.focus();
        campo.select();
      }
      if (e.key === "Escape" && document.activeElement === campo) {
        setBusca("");
      }
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, []);

  const { porLetra, total } = useMemo(() => {
    const termo = normalizar(busca.trim());
    const filtradas = APRESENTACOES.filter(
      (d) =>
        (!grupo || d.g === grupo) &&
        (!tag || d.tags.includes(tag as keyof typeof TAGS)) &&
        (!termo || d.chave.includes(termo)),
    );
    const porLetra = new Map<string, Apresentacao[]>();
    for (const d of filtradas) {
      const letra = normalizar(d.n)[0].toUpperCase();
      porLetra.set(letra, [...(porLetra.get(letra) ?? []), d]);
    }
    return { porLetra, total: filtradas.length };
  }, [busca, grupo, tag]);

  return (
    <>
      <div className="sticky top-0 z-10 -mx-6 grid gap-3 border-b border-slate-200 bg-slate-50/95 px-6 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-0 flex-1 basis-72">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
            <input
              ref={campoBusca}
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar medicamento, marca ou fabricante…  (atalho: /)"
              aria-label="Buscar medicamento"
              autoComplete="off"
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pr-4 pl-11 font-medium text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
            />
          </div>
          <span className="font-mono text-xs text-slate-500">
            {total} de {APRESENTACOES.length} apresentações
          </span>
        </div>

        <div role="group" aria-label="Filtros" className="flex flex-wrap gap-1.5">
          <Filtro ativo={!grupo} onClick={() => setGrupo("")}>
            Todos
          </Filtro>
          {Object.entries(GRUPOS).map(([chave, g]) => (
            <Filtro
              key={chave}
              ativo={grupo === chave}
              onClick={() => setGrupo(grupo === chave ? "" : chave)}
            >
              {g.nome}
            </Filtro>
          ))}
          <span aria-hidden className="mx-1 w-px bg-slate-300" />
          {FILTROS_TAGS.map((chave) => (
            <Filtro
              key={chave}
              ativo={tag === chave}
              onClick={() => setTag(tag === chave ? "" : chave)}
            >
              {TAGS[chave].nome}
            </Filtro>
          ))}
        </div>

        <nav
          aria-label="Índice alfabético"
          className="flex flex-wrap gap-0.5 font-mono text-xs"
        >
          {ALFABETO.map((letra) =>
            porLetra.has(letra) ? (
              <button
                key={letra}
                type="button"
                onClick={() =>
                  document
                    .getElementById(`letra-${letra}`)
                    ?.scrollIntoView({ block: "start", behavior: "smooth" })
                }
                className="rounded px-1.5 py-0.5 font-semibold text-teal-700 hover:bg-teal-100"
              >
                {letra}
              </button>
            ) : (
              <span key={letra} className="px-1.5 py-0.5 text-slate-300">
                {letra}
              </span>
            ),
          )}
        </nav>
      </div>

      {total === 0 ? (
        <p className="px-2 py-10 text-center text-slate-500">
          Nenhum medicamento encontrado. Confira a grafia ou limpe os filtros.
        </p>
      ) : (
        [...porLetra.keys()].sort().map((letra) => (
          <section key={letra}>
            <h2
              id={`letra-${letra}`}
              className="mt-5 mb-2 scroll-mt-44 border-b-2 border-slate-200 pb-1 text-xl font-bold text-teal-700"
            >
              {letra}
            </h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,430px),1fr))] items-start gap-2.5">
              {porLetra.get(letra)!.map((d) => (
                <Ficha key={`${d.n}|${d.a}`} d={d} busca={busca} />
              ))}
            </div>
          </section>
        ))
      )}
    </>
  );
}
