import { criarAcao, type Acao } from "../domain/acoes";
import { CATEGORIAS_FIXAS } from "../domain/categorias";
import { inicioDoDia, somarDias } from "../domain/datas";

/**
 * SOMENTE DESENVOLVIMENTO. Gera ações dos últimos dias para testar Histórico,
 * Calendário e Perfil no aparelho. A interface só oferece isto quando __DEV__ é true.
 */
export function gerarDadosDeExemplo(hoje: Date, dias = 35, semente = 7): Acao[] {
  let estado = semente;
  // Gerador congruente simples: mesmos dados a cada geração, sem Math.random.
  const aleatorio = () => {
    estado = (estado * 1103515245 + 12345) % 2147483648;
    return estado / 2147483648;
  };

  const acoes: Acao[] = [];
  for (let d = dias - 1; d >= 1; d--) {
    const dia = somarDias(inicioDoDia(hoje), -d);
    const quantidade = aleatorio() < 0.15 ? 0 : Math.floor(aleatorio() * 7);
    for (let i = 0; i < quantidade; i++) {
      const categoria = CATEGORIAS_FIXAS[Math.floor(aleatorio() * CATEGORIAS_FIXAS.length)];
      const quando = new Date(dia);
      quando.setHours(7 + Math.floor(aleatorio() * 15), Math.floor(aleatorio() * 60));
      acoes.push(criarAcao(categoria.id, quando));
    }
  }
  return acoes;
}
