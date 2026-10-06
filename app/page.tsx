import { SITE } from "@/lib/navegacao";
import { LoginForm } from "./login-form";

export default function PaginaLogin() {
  return (
    <main className="fundo-grade relative flex flex-1 items-center px-4 py-10">
      {/* Faixa verde com a linha de batimento, atrás do cartão. */}
      <div className="absolute inset-x-0 top-1/2 h-56 -translate-y-1/2 overflow-hidden bg-gradient-to-r from-teal-800 via-teal-700 to-teal-800">
        <svg
          aria-hidden
          viewBox="0 0 1200 100"
          preserveAspectRatio="none"
          className="absolute inset-x-0 top-1/2 h-28 w-full -translate-y-1/2 text-teal-500/40"
        >
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            points="0,50 340,50 352,20 362,62 370,50 560,50 568,44 574,56 580,50 596,50 606,8 618,92 628,50 1080,50 1088,44 1094,56 1100,50 1116,50 1126,8 1138,92 1148,50 1200,50"
          />
        </svg>
      </div>

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[1fr_auto]">
        <div className="hidden text-white lg:block">
          <h1 className="text-5xl font-medium">Bem-vindo!</h1>
          <p className="mt-3 text-xl text-teal-50">
            Digite seus dados para acessar o sistema.
          </p>
        </div>

        <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white px-10 py-10 shadow-xl shadow-slate-900/10 lg:w-[30rem]">
          <div className="flex items-center justify-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-800 text-xl font-bold text-white">
              {SITE.sigla}
            </span>
            <span className="text-2xl font-bold text-teal-800">{SITE.nome}</span>
          </div>
          <p className="mt-3 mb-8 text-center text-xs font-semibold tracking-widest text-slate-500 uppercase">
            {SITE.subtitulo}
          </p>

          <LoginForm />

          <p className="mt-8 text-center text-sm text-slate-400">
            Acesso restrito
          </p>
        </div>
      </div>
    </main>
  );
}
