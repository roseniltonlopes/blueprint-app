function canais(hex: string): [number, number, number] {
  const valor = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(valor)) {
    throw new Error(`Cor hexadecimal inválida: ${hex}`);
  }
  return [0, 2, 4].map((i) => parseInt(valor.slice(i, i + 2), 16)) as [number, number, number];
}

/** Arredonda .5 para o inteiro par, a mesma regra que gerou as cores do canvas. */
function arredondarParaPar(valor: number): number {
  const piso = Math.floor(valor);
  const resto = valor - piso;
  if (Math.abs(resto - 0.5) < 1e-9) {
    return piso % 2 === 0 ? piso : piso + 1;
  }
  return Math.round(valor);
}

/** Interpola linearmente duas cores #RRGGBB. t vai de 0 (início) a 1 (fim). */
export function interpolarCor(inicio: string, fim: string, t: number): string {
  const peso = Math.min(1, Math.max(0, t));
  const a = canais(inicio);
  const b = canais(fim);
  const mistura = a.map((canal, i) => arredondarParaPar(canal + (b[i] - canal) * peso));
  return `#${mistura
    .map((canal) => canal.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

/** Cor de cada segmento do anel: gradiente distribuído do primeiro ao último segmento. */
export function coresDosSegmentos(gradiente: readonly [string, string], total: number): string[] {
  return Array.from({ length: total }, (_, i) =>
    interpolarCor(gradiente[0], gradiente[1], total > 1 ? i / (total - 1) : 0),
  );
}
