"use client";

import { Eye, EyeOff, Lock, LogIn, User } from "lucide-react";
import { useActionState, useState } from "react";
import { entrar, type EstadoLogin } from "./actions";

const estadoInicial: EstadoLogin = { erro: "" };

const campo =
  "w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-11 text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15";
const iconeDoCampo =
  "pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400";

export function LoginForm() {
  const [estado, formAction, enviando] = useActionState(entrar, estadoInicial);
  const [senhaVisivel, setSenhaVisivel] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-semibold text-slate-700">
          Usuário
        </label>
        <div className="relative">
          <User aria-hidden className={iconeDoCampo} />
          <input
            id="email"
            name="email"
            type="text"
            autoComplete="username"
            defaultValue={estado.email}
            required
            className={`${campo} pr-4`}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="senha" className="text-sm font-semibold text-slate-700">
          Senha
        </label>
        <div className="relative">
          <Lock aria-hidden className={iconeDoCampo} />
          <input
            id="senha"
            name="senha"
            type={senhaVisivel ? "text" : "password"}
            autoComplete="current-password"
            required
            className={`${campo} pr-11`}
          />
          <button
            type="button"
            onClick={() => setSenhaVisivel((visivel) => !visivel)}
            aria-label={senhaVisivel ? "Ocultar senha" : "Mostrar senha"}
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
          >
            {senhaVisivel ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {estado.erro && (
        <p aria-live="polite" className="text-sm text-red-600">
          {estado.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-3 font-semibold tracking-wide text-white uppercase transition hover:bg-teal-800 disabled:opacity-60"
      >
        <LogIn aria-hidden className="h-4 w-4" />
        {enviando ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
