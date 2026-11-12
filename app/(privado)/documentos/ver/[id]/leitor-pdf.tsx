"use client";

import { useState } from "react";
import { Carregando } from "../../../carregando";

// Mostra a animação de carregamento sobre o PDF até o arquivo chegar.
export function LeitorPdf({ src, titulo }: { src: string; titulo: string }) {
  const [carregado, setCarregado] = useState(false);

  return (
    <div className="relative min-h-[60vh] w-full flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white">
      {!carregado && <Carregando cobrir texto="Carregando documento…" />}
      <iframe
        src={src}
        title={titulo}
        onLoad={() => setCarregado(true)}
        className={`h-full w-full transition-opacity duration-300 ${carregado ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
