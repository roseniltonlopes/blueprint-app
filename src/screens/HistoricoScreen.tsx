import { useMemo, useState } from "react";
import { Pressable, SectionList, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import GraficoSemanal from "../components/GraficoSemanal";
import Resumo from "../components/Resumo";
import { gerarDadosDeExemplo } from "../dev/dadosDeExemplo";
import { gerarUuid } from "../domain/ids";
import type { Acao } from "../domain/acoes";
import { nomeDaCategoria } from "../domain/categorias";
import {
  DIAS_ABREVIADOS,
  formatarHora,
  formatarIntervalo,
  inicioDaSemana,
  somarDias,
} from "../domain/datas";
import {
  agruparPorDia,
  contarPorDia,
  indiceDoMelhorDia,
  semanaDoGrafico,
  sequenciaAtual,
  type GrupoDoDia,
} from "../domain/estatisticas";
import { plural } from "../domain/texto";
import { useAcoes } from "../hooks/useAcoes";
import { useTheme } from "../theme/ThemeProvider";
import { RADIUS, SIZES, SPACING } from "../styles/theme";
import { Card } from "../ui/Card";
import { Icon } from "../ui/Icon";
import { entrada } from "../ui/motion";
import { Screen } from "../ui/Screen";
import { SegmentedControl } from "../ui/SegmentedControl";
import { Text } from "../ui/Text";

type Visao = "semana" | "mes";

function ItemDaLista({ acao }: { acao: Acao }) {
  const { colors } = useTheme();
  const nome = acao.rotulo ?? nomeDaCategoria(acao.categoria);
  const hora = formatarHora(new Date(acao.criadoEm));
  return (
    <View style={styles.item} accessible accessibilityLabel={`${hora}, ${nome}`}>
      <Text variant="support" color="mute" style={styles.hora}>
        {hora}
      </Text>
      <View style={[styles.circulo, { backgroundColor: colors.sunk }]}>
        <Icon name={acao.categoria} color={colors.ink} size={20} />
      </View>
      <Text variant="body" numberOfLines={1} style={styles.nomeItem}>
        {nome}
      </Text>
    </View>
  );
}

function FerramentasDeDesenvolvimento() {
  const { substituir, relogio } = useAcoes();
  if (!__DEV__) {
    return null;
  }
  return (
    <View style={styles.dev}>
      <Text variant="caption" color="mute">
        DEV
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => substituir(gerarDadosDeExemplo(relogio(), gerarUuid))}
        style={styles.devBotao}
      >
        <Text variant="caption" color="accentText" weight={600}>
          Gerar dados de exemplo
        </Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => substituir([])} style={styles.devBotao}>
        <Text variant="caption" color="accentText" weight={600}>
          Limpar
        </Text>
      </Pressable>
    </View>
  );
}

/** Histórico (docs/03 tela 7; docs/05 F13, F14 e F15). */
export default function HistoricoScreen() {
  const { acoes, relogio } = useAcoes();
  const { colors } = useTheme();
  const [visao, setVisao] = useState<Visao>("semana");
  const [semanasAtras, setSemanasAtras] = useState(0);

  const hoje = relogio();
  const porDia = useMemo(() => contarPorDia(acoes), [acoes]);
  const domingo = somarDias(inicioDaSemana(hoje), -7 * semanasAtras);
  const dias = semanaDoGrafico(domingo, porDia, hoje);
  const totalSemana = dias.reduce((soma, dia) => soma + dia.total, 0);
  const melhor = indiceDoMelhorDia(dias);
  const grupos = useMemo(() => agruparPorDia(acoes, relogio()), [acoes, relogio]);

  const cabecalho = (
    <View style={styles.cabecalho}>
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
              <View style={styles.navegacao}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Semana anterior"
                  onPress={() => setSemanasAtras((n) => n + 1)}
                  style={styles.seta}
                >
                  <Icon name="anterior" color={colors.ink} />
                </Pressable>
                <Text variant="support" weight={500} style={styles.intervalo}>
                  {formatarIntervalo(dias[0].data, dias[6].data)}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Próxima semana"
                  accessibilityState={{ disabled: semanasAtras === 0 }}
                  disabled={semanasAtras === 0}
                  onPress={() => setSemanasAtras((n) => Math.max(0, n - 1))}
                  style={[styles.seta, semanasAtras === 0 && styles.desabilitado]}
                >
                  <Icon name="proximo" color={colors.ink} />
                </Pressable>
              </View>
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
        </>
      ) : (
        <Card style={styles.cartaoGrafico}>
          <Text variant="body">Visão mensal</Text>
          <Text variant="support" color="mute">
            O conteúdo da visão por mês ainda não foi especificado no design (docs/05, F16).
          </Text>
        </Card>
      )}

      <FerramentasDeDesenvolvimento />
    </View>
  );

  return (
    <Screen contentStyle={styles.semPadding}>
      <SectionList<Acao, GrupoDoDia>
        sections={grupos}
        keyExtractor={(acao) => acao.id}
        renderItem={({ item }) => <ItemDaLista acao={item} />}
        renderSectionHeader={({ section }) => (
          <View style={[styles.secao, { backgroundColor: colors.bg }]}>
            <Text variant="section" accessibilityRole="header">
              {section.titulo}
            </Text>
            <Text variant="support" color="mute">
              {plural(section.total, "ação", "ações")}
            </Text>
          </View>
        )}
        ListHeaderComponent={cabecalho}
        ListEmptyComponent={
          <Text variant="support" color="mute" style={styles.vazio}>
            Nenhuma ação registrada ainda. Registre a primeira na aba Hoje.
          </Text>
        }
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.lista}
        showsVerticalScrollIndicator={false}
        initialNumToRender={20}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  semPadding: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 },
  lista: { paddingHorizontal: SPACING.screen, paddingTop: SPACING.xxl, paddingBottom: SPACING.xxl },
  cabecalho: { gap: 14 },
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
  secao: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xs,
  },
  item: { flexDirection: "row", alignItems: "center", gap: 14, height: 60 },
  hora: { width: 46, fontVariant: ["tabular-nums"] },
  circulo: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  nomeItem: { flex: 1 },
  vazio: { marginTop: SPACING.xl },
  dev: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  devBotao: { minHeight: SIZES.touchMin, justifyContent: "center", paddingHorizontal: SPACING.sm },
});
