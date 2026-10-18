import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { AcoesRemotas } from "../data/AcoesRemotas";
import { sincronizar, temPendencias } from "../data/sincronizacao";
import {
  ESTADO_INICIAL,
  acoesReducer,
  aplicarSincronizacao,
  type Acao,
  type EstadoAcoes,
} from "../domain/acoes";
import { AcoesProvider, ATRASO_DA_SINCRONIZACAO_MS } from "../hooks/useAcoes";
import HomeScreen from "../screens/HomeScreen";
import { ThemeProvider } from "../theme/ThemeProvider";
import { AGORA, METRICAS, gerarIdDeTeste, nova, relogioFixo } from "./utils";

/** Servidor em memória que imita o RLS da migração 002 (Desfazer só até 5 minutos). */
function servidorFalso() {
  const linhas = new Map<string, Acao & { recebidoEm: number }>();
  let agora = 0;
  let foraDoAr = false;
  const chamadas = { enviar: 0, excluir: 0, listar: 0 };
  const remotas: AcoesRemotas = {
    async enviar(acoes) {
      chamadas.enviar += 1;
      if (foraDoAr) throw new TypeError("Network request failed");
      for (const a of acoes) {
        if (!linhas.has(a.id)) {
          const { sincronizada: _s, ...limpa } = a;
          linhas.set(a.id, { ...limpa, recebidoEm: agora });
        }
      }
    },
    async excluir(ids) {
      chamadas.excluir += 1;
      if (foraDoAr) throw new TypeError("Network request failed");
      for (const id of ids) {
        const linha = linhas.get(id);
        if (linha && agora - linha.recebidoEm < 5 * 60_000) linhas.delete(id);
      }
    },
    async listar() {
      chamadas.listar += 1;
      if (foraDoAr) throw new TypeError("Network request failed");
      return [...linhas.values()].map(({ recebidoEm: _r, ...a }) => ({ ...a, sincronizada: true }));
    },
  };
  return {
    remotas,
    linhas,
    chamadas,
    avancar: (ms: number) => (agora += ms),
    desligar: (valor: boolean) => (foraDoAr = valor),
  };
}

async function rodada(estado: EstadoAcoes, remotas: AcoesRemotas) {
  return aplicarSincronizacao(estado, await sincronizar(estado, remotas));
}

describe("rodada de sincronização", () => {
  it("envia as novas, marca como sincronizadas e não duplica em reenvio", async () => {
    const servidor = servidorFalso();
    const a = nova("estudo", AGORA);
    let estado: EstadoAcoes = { ...ESTADO_INICIAL, acoes: [a] };

    estado = await rodada(estado, servidor.remotas);
    expect(estado.acoes).toEqual([{ ...a, sincronizada: true }]);
    expect(temPendencias(estado)).toBe(false);

    // Reenvio da mesma ação (ex.: resposta perdida na rede) não cria cópia.
    await servidor.remotas.enviar([a]);
    expect(servidor.linhas.size).toBe(1);
  });

  it("Desfazer apaga no servidor dentro da janela de 5 minutos", async () => {
    const servidor = servidorFalso();
    const a = nova("estudo", AGORA);
    let estado = await rodada({ ...ESTADO_INICIAL, acoes: [a] }, servidor.remotas);

    estado = acoesReducer(estado, { tipo: "remover", id: a.id });
    expect(estado.exclusoesPendentes).toEqual([a.id]);
    estado = await rodada(estado, servidor.remotas);

    expect(servidor.linhas.size).toBe(0);
    expect(estado.acoes).toEqual([]);
    expect(estado.exclusoesPendentes).toEqual([]);
  });

  it("exclusão recusada pelo servidor (fora da janela) não faz a ação voltar", async () => {
    const servidor = servidorFalso();
    const a = nova("estudo", AGORA);
    let estado = await rodada({ ...ESTADO_INICIAL, acoes: [a] }, servidor.remotas);

    estado = acoesReducer(estado, { tipo: "remover", id: a.id });
    servidor.avancar(10 * 60_000);
    estado = await rodada(estado, servidor.remotas);

    expect(servidor.linhas.size).toBe(1);
    expect(estado.acoes).toEqual([]);
    expect(estado.lapides).toContain(a.id);
  });

  it("traz ações de outro aparelho e remove as apagadas em outro lugar", async () => {
    const servidor = servidorFalso();
    const local = nova("estudo", AGORA);
    const deOutroAparelho = nova("descanso", AGORA);
    let estado = await rodada({ ...ESTADO_INICIAL, acoes: [local] }, servidor.remotas);

    await servidor.remotas.enviar([deOutroAparelho]);
    servidor.linhas.delete(local.id);
    estado = await rodada(estado, servidor.remotas);

    expect(estado.acoes).toEqual([{ ...deOutroAparelho, sincronizada: true }]);
  });

  it("sem rede: lança erro e nada é marcado como enviado", async () => {
    const servidor = servidorFalso();
    servidor.desligar(true);
    const estado: EstadoAcoes = { ...ESTADO_INICIAL, acoes: [nova("estudo", AGORA)] };
    await expect(sincronizar(estado, servidor.remotas)).rejects.toThrow("Network request failed");
    expect(temPendencias(estado)).toBe(true);
  });

  it("preserva o que mudou durante a rodada", () => {
    const enviada = nova("estudo", AGORA);
    const criadaDurante = nova("descanso", AGORA);
    const estado: EstadoAcoes = { ...ESTADO_INICIAL, acoes: [enviada, criadaDurante] };
    const resultado = aplicarSincronizacao(estado, {
      enviadas: [enviada.id],
      excluidas: [],
      doServidor: [{ ...enviada, sincronizada: true }],
    });
    expect(resultado.acoes).toEqual([{ ...enviada, sincronizada: true }, criadaDurante]);
  });
});

describe("AcoesProvider sincronizando", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  async function abrir(servidor: ReturnType<typeof servidorFalso>) {
    await render(
      <SafeAreaProvider initialMetrics={METRICAS}>
        <ThemeProvider initialMode="light">
          <AcoesProvider
            relogio={relogioFixo()}
            gerarId={gerarIdDeTeste}
            remotas={servidor.remotas}
          >
            <HomeScreen />
          </AcoesProvider>
        </ThemeProvider>
      </SafeAreaProvider>,
    );
  }

  it("envia o registro logo depois e o Desfazer apaga no servidor", async () => {
    const servidor = servidorFalso();
    await abrir(servidor);

    await fireEvent.press(screen.getByRole("button", { name: /^Estudo/ }));
    await fireEvent.press(screen.getByText("Registrar Estudo"));
    await act(async () => {
      jest.advanceTimersByTime(ATRASO_DA_SINCRONIZACAO_MS);
    });
    await waitFor(() => expect(servidor.linhas.size).toBe(1));

    await fireEvent.press(screen.getByRole("button", { name: "Desfazer" }));
    await act(async () => {
      jest.advanceTimersByTime(ATRASO_DA_SINCRONIZACAO_MS);
    });
    await waitFor(() => expect(servidor.linhas.size).toBe(0));
    expect(screen.getByTestId("progresso-total").props.children).toBe(0);
  });

  it("sem rede o registro continua no aparelho e sobe quando a rede volta", async () => {
    const servidor = servidorFalso();
    servidor.desligar(true);
    await abrir(servidor);

    await fireEvent.press(screen.getByRole("button", { name: /^Hidratação/ }));
    await fireEvent.press(screen.getByText("Registrar Hidratação"));
    await act(async () => {
      jest.advanceTimersByTime(ATRASO_DA_SINCRONIZACAO_MS);
    });
    expect(screen.getByTestId("progresso-total").props.children).toBe(1);
    expect(servidor.linhas.size).toBe(0);

    servidor.desligar(false);
    await fireEvent.press(screen.getByRole("button", { name: /^Descanso/ }));
    await fireEvent.press(screen.getByText("Registrar Descanso"));
    await act(async () => {
      jest.advanceTimersByTime(ATRASO_DA_SINCRONIZACAO_MS);
    });
    await waitFor(() => expect(servidor.linhas.size).toBe(2));
  });
});
