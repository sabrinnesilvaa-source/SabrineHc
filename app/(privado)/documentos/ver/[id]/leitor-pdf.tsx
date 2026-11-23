"use client";

import { Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { Carregando } from "../../../carregando";

// Mostra o PDF dentro do próprio site, desenhando cada página na tela com o
// PDF.js. Não depende do leitor de PDF do navegador, então o arquivo nunca é
// baixado para o computador e não aparecem botões de baixar ou imprimir.
// O worker fica em public/pdf.worker.min.mjs (copiado de pdfjs-dist/build;
// ao atualizar o pdfjs-dist, copie o arquivo de novo).

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;

export function LeitorPdf({ src, titulo }: { src: string; titulo: string }) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [erro, setErro] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [largura, setLargura] = useState(0);
  const caixa = useRef<HTMLDivElement>(null);

  // Carrega o arquivo e abre com o PDF.js.
  useEffect(() => {
    let cancelado = false;
    let aberto: PDFDocumentProxy | null = null;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const resposta = await fetch(src.split("#")[0]);
        if (!resposta.ok) throw new Error(String(resposta.status));
        const dados = new Uint8Array(await resposta.arrayBuffer());
        aberto = await pdfjs.getDocument({ data: dados }).promise;
        if (cancelado) aberto.destroy();
        else setPdf(aberto);
      } catch {
        if (!cancelado) setErro(true);
      }
    })();
    return () => {
      cancelado = true;
      aberto?.destroy();
    };
  }, [src]);

  // Acompanha a largura da área para as páginas ocuparem a tela toda.
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const observar = new ResizeObserver(([e]) => setLargura(e.contentRect.width));
    observar.observe(el);
    return () => observar.disconnect();
  }, []);

  const mudarZoom = (delta: number) =>
    setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round((z + delta) * 100) / 100)));

  return (
    <div className="relative flex min-h-[60vh] w-full flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600">
        <span>{pdf ? `${pdf.numPages} página${pdf.numPages > 1 ? "s" : ""}` : " "}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => mudarZoom(-0.25)}
            aria-label="Diminuir zoom"
            className="rounded-md p-1.5 hover:bg-slate-100"
          >
            <Minus aria-hidden className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="min-w-14 rounded-md px-2 py-1 text-center hover:bg-slate-100"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={() => mudarZoom(0.25)}
            aria-label="Aumentar zoom"
            className="rounded-md p-1.5 hover:bg-slate-100"
          >
            <Plus aria-hidden className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={caixa}
        className="flex-1 overflow-auto"
        onContextMenu={(e) => e.preventDefault()}
      >
        {erro ? (
          <p className="p-6 text-center text-sm text-red-600">
            Não foi possível abrir “{titulo}”. Tente recarregar a página.
          </p>
        ) : !pdf || !largura ? (
          <Carregando cobrir texto="Carregando documento…" />
        ) : (
          <div className="flex flex-col items-center gap-3 p-3">
            {Array.from({ length: pdf.numPages }, (_, i) => (
              <Pagina
                key={i}
                pdf={pdf}
                numero={i + 1}
                largura={Math.max(200, (largura - 24) * zoom)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Uma página: reserva o espaço e só desenha quando chega perto da tela.
function Pagina({
  pdf,
  numero,
  largura,
}: {
  pdf: PDFDocumentProxy;
  numero: number;
  largura: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [proporcao, setProporcao] = useState(1.414); // A4 até saber o tamanho real
  const [visivel, setVisivel] = useState(numero <= 2);

  useEffect(() => {
    const el = canvas.current;
    if (!el || visivel) return;
    const observar = new IntersectionObserver(
      ([e]) => e.isIntersecting && setVisivel(true),
      { rootMargin: "800px 0px" },
    );
    observar.observe(el);
    return () => observar.disconnect();
  }, [visivel]);

  useEffect(() => {
    if (!visivel) return;
    let tarefa: { cancel: () => void } | null = null;
    let cancelado = false;
    (async () => {
      const pagina = await pdf.getPage(numero);
      if (cancelado) return;
      const base = pagina.getViewport({ scale: 1 });
      setProporcao(base.height / base.width);
      const nitidez = window.devicePixelRatio || 1;
      const vista = pagina.getViewport({ scale: (largura / base.width) * nitidez });
      const el = canvas.current;
      if (!el) return;
      el.width = Math.floor(vista.width);
      el.height = Math.floor(vista.height);
      const render = pagina.render({ canvas: el, viewport: vista });
      tarefa = render;
      await render.promise.catch(() => {});
    })();
    return () => {
      cancelado = true;
      tarefa?.cancel();
    };
  }, [pdf, numero, largura, visivel]);

  return (
    <canvas
      ref={canvas}
      aria-label={`Página ${numero}`}
      className="bg-white shadow-sm"
      style={{ width: largura, height: largura * proporcao }}
    />
  );
}
