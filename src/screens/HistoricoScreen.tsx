import { useMemo, useState, type ComponentType } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import GraficoSemanal from "../components/GraficoSemanal";
import ListaDeDias from "../components/ListaDeDias";
import PainelDeCompromissos from "../components/PainelDeCompromissos";
import Resumo from "../components/Resumo";
import ResumoPorCategoria from "../components/ResumoPorCategoria";
import type { Acao } from "../domain/acoes";
import {
  DIAS_ABREVIADOS,
  MESES,
  chaveDoDia,
  formatarIntervalo,
  formatarMesAno,
  inicioDaSemana,
  somarDias,
} from "../domain/datas";
import {
  contagemPorCategoria,
  contarPorDia,
  indiceDoMelhorDia,
  resumoDoMes,
  semanaDoGrafico,
  sequenciaAtual,
} from "../domain/estatisticas";
import { painelDoMes } from "../domain/painel";
import { useAcoes } from "../hooks/useAcoes";
import { useAgenda } from "../hooks/useAgenda";
import { useTheme } from "../theme/ThemeProvider";
import { SIZES, SPACING } from "../styles/theme";
import { Card } from "../ui/Card";
import { Icon } from "../ui/Icon";
import { entrada } from "../ui/motion";
import { Screen } from "../ui/Screen";
import { SegmentedControl } from "../ui/SegmentedControl";
import { Text } from "../ui/Text";

type Visao = "semana" | "mes";

// Ferramentas de desenvolvimento: o require só existe dentro do if (__DEV__), para o Metro
// descartar o módulo de exemplo no build de produção.
let FerramentasDeDesenvolvimento: ComponentType | null = null;
if (__DEV__) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const modulo = require("../dev/FerramentasDoHistorico") as { default: ComponentType };
  FerramentasDeDesenvolvimento = modulo.default;
}

type NavegacaoProps = {
  titulo: string;
  rotuloAnterior: string;
  rotuloProximo: string;
  podeAvancar: boolean;
  aoVoltar: () => void;
  aoAvancar: () => void;
};

function Navegacao({
  titulo,
  rotuloAnterior,
  rotuloProximo,
  podeAvancar,
  aoVoltar,
  aoAvancar,
}: NavegacaoProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.navegacao}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={rotuloAnterior}
        onPress={aoVoltar}
        style={styles.seta}
      >
        <Icon name="anterior" color={colors.ink} />
      </Pressable>
      <Text variant="support" weight={500} style={styles.intervalo}>
        {titulo}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={rotuloProximo}
        accessibilityState={{ disabled: !podeAvancar }}
        disabled={!podeAvancar}
        onPress={aoAvancar}
        style={[styles.seta, !podeAvancar && styles.desabilitado]}
      >
        <Icon name="proximo" color={colors.ink} />
      </Pressable>
    </View>
  );
}

/**
 * Histórico. A semana mostra o gráfico e uma linha por dia (as ações abrem ao tocar); o mês
 * mostra quantas vezes cada categoria apareceu e como isso se compara ao mês anterior.
 */
export default function HistoricoScreen() {
  const { acoes, relogio } = useAcoes();
  const { dados: agenda } = useAgenda();
  const [visao, setVisao] = useState<Visao>("semana");
  const [semanasAtras, setSemanasAtras] = useState(0);
  const [mesesAtras, setMesesAtras] = useState(0);

  const hoje = relogio();
  const porDia = useMemo(() => contarPorDia(acoes), [acoes]);
  const acoesPorDia = useMemo(() => {
    const mapa = new Map<string, Acao[]>();
    const recentesPrimeiro = [...acoes].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
    for (const acao of recentesPrimeiro) {
      const chave = chaveDoDia(new Date(acao.criadoEm));
      mapa.set(chave, [...(mapa.get(chave) ?? []), acao]);
    }
    return mapa;
  }, [acoes]);

  const domingo = somarDias(inicioDaSemana(hoje), -7 * semanasAtras);
  const dias = semanaDoGrafico(domingo, porDia, hoje);
  const totalSemana = dias.reduce((soma, dia) => soma + dia.total, 0);
  const melhor = indiceDoMelhorDia(dias);

  const mesExibido = new Date(hoje.getFullYear(), hoje.getMonth() - mesesAtras, 1);
  const anoDoMes = mesExibido.getFullYear();
  const numeroDoMes = mesExibido.getMonth();
  const mesAnterior = new Date(anoDoMes, numeroDoMes - 1, 1);
  const anoAnterior = mesAnterior.getFullYear();
  const numeroAnterior = mesAnterior.getMonth();
  const doMes = contagemPorCategoria(acoes, anoDoMes, numeroDoMes);
  const doMesAnterior = contagemPorCategoria(acoes, anoAnterior, numeroAnterior);
  const resumoMes = resumoDoMes(porDia, anoDoMes, numeroDoMes);
  // Até 31 dias de ocorrências: barato o bastante para calcular a cada render.
  const painel = painelDoMes(agenda, anoDoMes, numeroDoMes, hoje);

  return (
    <Screen scroll contentStyle={styles.conteudo}>
      <Animated.View entering={entrada(0)}>
        <Text variant="h1" accessibilityRole="header">
          Histórico
        </Text>
      </Animated.View>

      <Animated.View entering={entrada(50)}>
        <SegmentedControl<Visao>
          accessibilityLabel="Período"
          value={visao}
          onChange={setVisao}
          options={[
            { value: "semana", label: "Semana" },
            { value: "mes", label: "Mês" },
          ]}
        />
      </Animated.View>

      {visao === "semana" ? (
        <>
          <Animated.View entering={entrada(100)}>
            <Card style={styles.cartaoGrafico}>
              <Navegacao
                titulo={formatarIntervalo(dias[0].data, dias[6].data)}
                rotuloAnterior="Semana anterior"
                rotuloProximo="Próxima semana"
                podeAvancar={semanasAtras > 0}
                aoVoltar={() => setSemanasAtras((n) => n + 1)}
                aoAvancar={() => setSemanasAtras((n) => Math.max(0, n - 1))}
              />
              <GraficoSemanal dias={dias} />
            </Card>
          </Animated.View>

          <Animated.View entering={entrada(200)}>
            <Resumo
              itens={[
                { valor: String(totalSemana), rotulo: "ações na semana" },
                { valor: String(sequenciaAtual(porDia, hoje)), rotulo: "dias seguidos" },
                {
                  valor: melhor === null ? "–" : DIAS_ABREVIADOS[dias[melhor].data.getDay()],
                  rotulo: "melhor dia",
                },
              ]}
            />
          </Animated.View>

          {acoes.length === 0 ? (
            <Text variant="support" color="mute" style={styles.vazio}>
              Nenhuma ação registrada ainda. Registre a primeira na aba Hoje.
            </Text>
          ) : (
            <>
              <Text variant="section" accessibilityRole="header" style={styles.titulo}>
                Dia a dia
              </Text>
              <ListaDeDias dias={dias} acoesPorDia={acoesPorDia} hoje={hoje} />
            </>
          )}
        </>
      ) : (
        <>
          <Navegacao
            titulo={formatarMesAno(anoDoMes, numeroDoMes)}
            rotuloAnterior="Mês anterior"
            rotuloProximo="Próximo mês"
            podeAvancar={mesesAtras > 0}
            aoVoltar={() => setMesesAtras((n) => n + 1)}
            aoAvancar={() => setMesesAtras((n) => Math.max(0, n - 1))}
          />
          <Resumo
            itens={[
              { valor: String(resumoMes.total), rotulo: "ações no mês" },
              { valor: String(resumoMes.diasComRegistro), rotulo: "dias com registro" },
            ]}
          />
          {doMes.length === 0 ? (
            <Text variant="support" color="mute" style={styles.vazio}>
              Nenhuma ação registrada neste mês.
            </Text>
          ) : (
            <>
              <Text variant="section" accessibilityRole="header" style={styles.titulo}>
                Por categoria
              </Text>
              <ResumoPorCategoria
                atual={doMes}
                anterior={doMesAnterior.length > 0 ? doMesAnterior : null}
              />
            </>
          )}
          <Text variant="section" accessibilityRole="header" style={styles.titulo}>
            Compromissos da agenda
          </Text>
          <PainelDeCompromissos painel={painel} nomeDoMes={MESES[numeroDoMes]} />
        </>
      )}

      {FerramentasDeDesenvolvimento ? <FerramentasDeDesenvolvimento /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  conteudo: { gap: 14, paddingBottom: SPACING.xxl },
  cartaoGrafico: { paddingTop: 6, paddingHorizontal: SPACING.md, paddingBottom: SPACING.lg },
  navegacao: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  seta: {
    width: SIZES.touchMin,
    height: SIZES.touchMin,
    alignItems: "center",
    justifyContent: "center",
  },
  desabilitado: { opacity: 0.3 },
  intervalo: { fontSize: 15 },
  titulo: { marginTop: SPACING.sm },
  vazio: { marginTop: SPACING.sm },
});
