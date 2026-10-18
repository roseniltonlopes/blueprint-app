import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import CalendarioMensal from "../components/CalendarioMensal";
import Resumo from "../components/Resumo";
import { acoesDoDia, contarPorCategoria } from "../domain/acoes";
import { CATEGORIAS } from "../domain/categorias";
import {
  MESES,
  chaveDoDia,
  formatarDataCabecalho,
  formatarDiaMes,
  formatarMesAno,
  inicioDoDia,
} from "../domain/datas";
import { contarPorDia, resumoDoMes } from "../domain/estatisticas";
import { plural } from "../domain/texto";
import { useAcoes } from "../hooks/useAcoes";
import { useTheme } from "../theme/ThemeProvider";
import { RADIUS, SIZES, SPACING } from "../styles/theme";
import { Card } from "../ui/Card";
import { Icon } from "../ui/Icon";
import { entrada } from "../ui/motion";
import { Screen } from "../ui/Screen";
import { Text } from "../ui/Text";

function tituloDoDia(dia: Date, hoje: Date): string {
  return chaveDoDia(dia) === chaveDoDia(hoje)
    ? `Hoje, ${formatarDiaMes(dia)}`
    : formatarDataCabecalho(dia);
}

/** Calendário (docs/03 tela 6; docs/05 F11 e F12). */
export default function CalendarioScreen() {
  const { acoes, relogio } = useAcoes();
  const { colors } = useTheme();
  const hoje = relogio();
  const [mesVisivel, setMesVisivel] = useState({ ano: hoje.getFullYear(), mes: hoje.getMonth() });
  const [selecionado, setSelecionado] = useState(() => inicioDoDia(hoje));

  const porDia = useMemo(() => contarPorDia(acoes), [acoes]);
  const resumo = resumoDoMes(porDia, mesVisivel.ano, mesVisivel.mes);
  const chaveSelecionado = chaveDoDia(selecionado);
  const doDia = useMemo(
    () => contarPorCategoria(acoesDoDia(acoes, chaveSelecionado)),
    [acoes, chaveSelecionado],
  );
  const totalDoDia = porDia.get(chaveSelecionado) ?? 0;
  const futuro = selecionado.getTime() > inicioDoDia(hoje).getTime();

  function mudarMes(delta: number) {
    setMesVisivel(({ ano, mes }) => {
      const alvo = new Date(ano, mes + delta, 1);
      return { ano: alvo.getFullYear(), mes: alvo.getMonth() };
    });
  }

  function selecionar(dia: Date) {
    setSelecionado(dia);
    if (dia.getMonth() !== mesVisivel.mes || dia.getFullYear() !== mesVisivel.ano) {
      setMesVisivel({ ano: dia.getFullYear(), mes: dia.getMonth() });
    }
  }

  return (
    <Screen scroll contentStyle={styles.conteudo}>
      <Animated.View entering={entrada(0)}>
        <Text variant="h1" accessibilityRole="header">
          Calendário
        </Text>
      </Animated.View>

      <Animated.View entering={entrada(50)} style={styles.navegacao}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mês anterior"
          onPress={() => mudarMes(-1)}
          style={styles.seta}
        >
          <Icon name="anterior" color={colors.ink} />
        </Pressable>
        <Text variant="cardTitle" accessibilityRole="header">
          {formatarMesAno(mesVisivel.ano, mesVisivel.mes)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Próximo mês"
          onPress={() => mudarMes(1)}
          style={styles.seta}
        >
          <Icon name="proximo" color={colors.ink} />
        </Pressable>
      </Animated.View>

      <CalendarioMensal
        key={`${mesVisivel.ano}-${mesVisivel.mes}`}
        ano={mesVisivel.ano}
        mes={mesVisivel.mes}
        porDia={porDia}
        hoje={hoje}
        selecionado={selecionado}
        aoSelecionar={selecionar}
      />

      <Animated.View entering={entrada(450)}>
        <Card style={styles.cartaoDia}>
          <View style={styles.tituloDia}>
            <Text variant="cardTitle" style={styles.flex}>
              {tituloDoDia(selecionado, hoje)}
            </Text>
            <Text variant="support" color="mute">
              {plural(totalDoDia, "ação", "ações")}
            </Text>
          </View>
          {totalDoDia > 0 ? (
            <View style={styles.chips}>
              {CATEGORIAS.filter((c) => doDia[c.id] > 0).map((categoria) => (
                <View key={categoria.id} style={[styles.chip, { backgroundColor: colors.sunk }]}>
                  <Icon name={categoria.id} color={colors.ink} size={18} />
                  <Text variant="support" weight={500}>
                    {categoria.nome} {doDia[categoria.id]}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text variant="support" color="mute" style={styles.vazio}>
              {futuro ? "Este dia ainda não chegou." : "Nenhuma ação neste dia."}
            </Text>
          )}
        </Card>
      </Animated.View>

      <Animated.View entering={entrada(520)}>
        <Resumo
          itens={[
            { valor: String(resumo.total), rotulo: `ações em ${MESES[mesVisivel.mes]}` },
            { valor: String(resumo.diasComRegistro), rotulo: "dias com registro" },
          ]}
        />
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  conteudo: { gap: SPACING.md },
  navegacao: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  seta: {
    width: SIZES.touchMin,
    height: SIZES.touchMin,
    alignItems: "center",
    justifyContent: "center",
  },
  cartaoDia: { marginTop: SPACING.xs },
  tituloDia: { flexDirection: "row", alignItems: "baseline", gap: SPACING.sm },
  flex: { flex: 1 },
  chips: { marginTop: SPACING.md, flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  chip: {
    height: 40,
    paddingLeft: 10,
    paddingRight: 14,
    borderRadius: RADIUS.pill,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  vazio: { marginTop: SPACING.sm },
});
