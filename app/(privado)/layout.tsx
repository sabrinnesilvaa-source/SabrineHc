import { ChevronDown, LogOut } from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { sair } from "@/app/actions";
import { usuarioAtual } from "@/lib/auth";
import { BarraLateral, TituloDaPagina } from "./navegacao";

// Tudo dentro de app/(privado) exige login. O proxy.ts já redireciona,
// mas a sessão é conferida de novo aqui, no servidor.
export default function LayoutPrivado({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <AreaPrivada>{children}</AreaPrivada>
    </Suspense>
  );
}

async function AreaPrivada({ children }: { children: React.ReactNode }) {
  const usuario = await usuarioAtual();

  if (!usuario) redirect("/");

  return (
    <div className="flex flex-1">
      <BarraLateral />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 bg-teal-50 px-6 py-4 shadow-sm">
          <TituloDaPagina />

          <details className="relative shrink-0">
            <summary className="flex cursor-pointer list-none items-center gap-3 rounded-lg px-2 py-1 hover:bg-teal-100/60 [&::-webkit-details-marker]:hidden">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-700 uppercase">
                {usuario.nome.charAt(0)}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block font-semibold text-teal-700">
                  {usuario.nome}
                </span>
                <span className="block text-sm text-slate-500">
                  {usuario.email}
                </span>
              </span>
              <ChevronDown aria-hidden className="h-4 w-4 text-teal-700" />
            </summary>
            <form
              action={sair}
              className="absolute right-0 z-10 mt-2 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
            >
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
                <LogOut aria-hidden className="h-4 w-4" />
                Sair
              </button>
            </form>
          </details>
        </header>

        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
