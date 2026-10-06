import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Etiqueta, GuiaDiluicao } from "./guia";

const caixa = "min-w-0 rounded-lg border p-4 text-[13px]";
const tituloDaCaixa = "mb-1.5 font-semibold text-slate-900";
const lista = "grid list-disc gap-1 pl-5";

export default function PaginaGuiaDiluicao() {
  return (
    <>
      <Link
        href="/documentos/guia-de-medicamentos"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-700"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        Guia de medicamentos
      </Link>

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-slate-500">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="flex items-center gap-1.5">
            <Etiqueta tag="mav" /> alta vigilância (ISMP Brasil)
          </span>
          <span className="flex items-center gap-1.5">
            <Etiqueta tag="flebite" /> risco de flebite química
          </span>
          <Etiqueta tag="foto" />
          <span className="flex items-center gap-1.5">
            <Etiqueta tag="alerta" /> restrição de via / incompatibilidade
          </span>
        </span>
        <span>
          TA = temperatura ambiente (15–30 °C) · RF = refrigeração (2–8 °C) ·
          estabilidade após diluição
        </span>
      </div>

      <GuiaDiluicao />

      <section
        aria-label="Referências rápidas"
        className="mt-7 grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-3"
      >
        <div className={`${caixa} border-slate-200 bg-white`}>
          <h4 className={tituloDaCaixa}>Equivalências</h4>
          <ul className={lista}>
            <li>1 mL = 20 gotas = 60 microgotas</li>
            <li>1 gota = 3 microgotas</li>
            <li>1 microgota/min = 1 mL/h</li>
            <li>1 mg = 1000 mcg · 1 g = 1000 mg</li>
          </ul>
        </div>
        <div className={`${caixa} border-slate-200 bg-white`}>
          <h4 className={tituloDaCaixa}>Velocidade de infusão EV</h4>
          <ul className={lista}>
            <li>
              <b>Bolus:</b> até 1 min
            </li>
            <li>
              <b>Rápido:</b> 1 a 30 min
            </li>
            <li>
              <b>Lento:</b> 30 a 60 min
            </li>
            <li>
              <b>Contínuo:</b> acima de 60 min, ininterrupto
            </li>
            <li>
              <b>Intermitente:</b> acima de 60 min, não contínuo
            </li>
          </ul>
        </div>
        <div className={`${caixa} border-slate-200 bg-white`}>
          <h4 className={tituloDaCaixa}>Reduzir risco de flebite química</h4>
          <ul className={lista}>
            <li>Seguir diluição e tempo padronizados</li>
            <li>Usar BIC, filtro ou equipo fotossensível quando indicado</li>
            <li>Trocar EV por VO sempre que possível</li>
            <li>
              Vesicante, pH extremo ou alta osmolaridade: preferir acesso
              central
            </li>
          </ul>
        </div>
        <div className={`${caixa} border-red-700 bg-red-50`}>
          <h4 className={tituloDaCaixa}>Uso deste guia</h4>
          <ul className={lista}>
            <li>
              Material de apoio. Não substitui a prescrição, a bula do
              fabricante nem a orientação da Farmácia Clínica.
            </li>
            <li>
              Confira sempre a <b>marca e a concentração</b> disponíveis na
              unidade: a diluição muda entre apresentações.
            </li>
            <li>
              Fonte:{" "}
              <i>Guia Prático de Diluição e Administração de Medicamentos</i>{" "}
              (Aridiane T. C. S. Costa, 1ª ed., 2025), com base em Micromedex,
              bulas ANVISA/fabricante e Hospital Sírio-Libanês.
            </li>
            <li>
              Classificação MAV acrescentada pela instituição conforme lista
              ISMP Brasil.
            </li>
          </ul>
        </div>
      </section>
    </>
  );
}
