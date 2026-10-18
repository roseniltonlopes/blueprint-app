const NOMES_CONHECIDOS: Record<string, string> = {
  "America/Sao_Paulo": "América/São Paulo",
  "America/Manaus": "América/Manaus",
  "America/Fortaleza": "América/Fortaleza",
  "America/Recife": "América/Recife",
  "America/Bahia": "América/Bahia",
  "America/Belem": "América/Belém",
  "America/Cuiaba": "América/Cuiabá",
  "America/Rio_Branco": "América/Rio Branco",
  "America/Noronha": "América/Noronha",
};

/**
 * Fuso IANA do aparelho (ex.: "America/Sao_Paulo") ou null se o motor JS não
 * expõe Intl. O Hermes do Expo SDK 57 expõe; o null cobre motores sem Intl.
 */
export function fusoDoAparelho(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/** "America/Sao_Paulo" → "América/São Paulo" */
export function nomeDoFuso(fuso: string | null): string {
  if (!fuso) {
    return "Horário do aparelho";
  }
  return NOMES_CONHECIDOS[fuso] ?? fuso.replace(/_/g, " ");
}
