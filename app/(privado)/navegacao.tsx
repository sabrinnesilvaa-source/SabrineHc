"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAVEGACAO, SITE } from "@/lib/navegacao";

function useItemAtual() {
  const pathname = usePathname();
  return NAVEGACAO.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
}

export function BarraLateral() {
  const atual = useItemAtual();

  return (
    <aside className="flex w-[70px] shrink-0 flex-col items-center border-r border-slate-200 bg-white">
      <Link
        href="/menu"
        aria-label={SITE.nome}
        className="my-3 flex h-10 w-10 items-center justify-center rounded-lg bg-teal-600 font-bold text-white"
      >
        {SITE.sigla}
      </Link>
      <nav className="flex w-full flex-col gap-1 border-t border-slate-200 px-2.5 pt-3">
        {NAVEGACAO.filter((item) => item.naBarraLateral).map((item) => {
          const ativo = item === atual;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.titulo}
              aria-label={item.titulo}
              aria-current={ativo ? "page" : undefined}
              className={`relative flex h-10 items-center justify-center rounded-lg transition ${
                ativo
                  ? "bg-teal-50 text-teal-700 before:absolute before:top-2 before:bottom-2 before:left-0 before:w-[3px] before:rounded-full before:bg-teal-700"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              }`}
            >
              <item.icone aria-hidden className="h-5 w-5" />
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function TituloDaPagina() {
  const atual = useItemAtual();

  return (
    <div className="min-w-0">
      <h1 className="truncate text-2xl font-semibold text-teal-700">
        {atual?.titulo ?? SITE.nome}
      </h1>
      <p className="truncate text-slate-500">
        {atual?.descricao ?? SITE.subtitulo}
      </p>
    </div>
  );
}
