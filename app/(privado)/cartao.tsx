import type { LucideIcon } from "lucide-react";
import Link from "next/link";

export function CartaoLink({
  href,
  titulo,
  descricao,
  icone: Icone,
  total,
}: {
  href: string;
  titulo: string;
  descricao: string;
  icone: LucideIcon;
  total?: number; // quantidade de documentos, exibida à direita do ícone
}) {
  return (
    <Link
      href={href}
      className="block h-full rounded-lg border border-t-[3px] border-slate-200 border-t-teal-700 bg-white p-5 transition hover:shadow-md"
    >
      <span className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
          <Icone aria-hidden className="h-5 w-5" />
        </span>
        {total !== undefined && (
          <span
            className="text-2xl font-semibold text-teal-700 tabular-nums"
            aria-label={`${total} ${total === 1 ? "documento" : "documentos"}`}
          >
            {total}
          </span>
        )}
      </span>
      <h2 className="mt-4 font-semibold text-slate-900 uppercase">{titulo}</h2>
      <p className="mt-1 text-sm text-slate-500">{descricao}</p>
    </Link>
  );
}
