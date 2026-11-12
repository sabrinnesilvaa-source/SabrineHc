import { FileText } from "lucide-react";

// Animação de carregamento usada em todas as páginas da área logada.
// "cobrir" ocupa o espaço do elemento pai (ex.: sobre o PDF); sem ele,
// ocupa a área da página.
export function Carregando({
  texto = "Carregando…",
  cobrir = false,
}: {
  texto?: string;
  cobrir?: boolean;
}) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center gap-4 ${
        cobrir ? "absolute inset-0 bg-white" : "min-h-[60vh] w-full flex-1"
      }`}
    >
      <span className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 animate-spin rounded-full border-4 border-teal-100 border-t-teal-600" />
        <FileText aria-hidden className="h-6 w-6 animate-pulse text-teal-700" />
      </span>
      <p className="text-sm font-medium text-slate-500">{texto}</p>
    </div>
  );
}
