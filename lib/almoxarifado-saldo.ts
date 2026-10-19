import type { Movimento } from "./almoxarifado";

// Saldo de cada item = soma dos movimentos (o ajuste já vem com sinal).
// Fica separado de lib/almoxarifado.ts para poder ser usado também no navegador.
export function calcularSaldos(movimentos: Movimento[]) {
  const saldos: Record<string, number> = {};
  for (const m of movimentos) {
    const sinal = m.tipo === "saida" ? -1 : 1;
    saldos[m.itemId] = (saldos[m.itemId] ?? 0) + sinal * m.qtd;
  }
  return saldos;
}
