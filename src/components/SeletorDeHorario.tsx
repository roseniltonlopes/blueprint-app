import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { horaValida } from "../domain/agenda";
import { MOTION, RADIUS, SIZES, SPACING } from "../styles/theme";
import { useTheme } from "../theme/ThemeProvider";
import { CURVA } from "../ui/motion";
import { PressableEscala } from "../ui/PressableEscala";
import { Text } from "../ui/Text";
import BotaoAcao from "./BotaoAcao";

type SeletorDeHorarioProps = {
  valor: string | null;
  aoMudar: (hora: string) => void;
  rotulo: string;
  /** Bloco alto com a hora em número grande (formulário do compromisso) */
  bloco?: boolean;
};

export const HORAS = Array.from({ length: 24 }, (_, i) => i);
export const MINUTOS = Array.from({ length: 12 }, (_, i) => i * 5);
const HORA_PADRAO = { horas: 8, minutos: 0 };
const COLUNAS = 6;

const doisDigitos = (n: number) => String(n).padStart(2, "0");

/** "07:30" → { horas: 7, minutos: 30 }. Sem hora válida, 08:00. */
export function partesDaHora(hora: string | null): { horas: number; minutos: number } {
  if (hora === null || !horaValida(hora)) return HORA_PADRAO;
  const [horas, minutos] = hora.split(":").map(Number);
  return { horas, minutos };
}

export function montarHora(horas: number, minutos: number): string {
  return `${doisDigitos(horas)}:${doisDigitos(minutos)}`;
}

type GradeProps = {
  titulo: string;
  valores: readonly number[];
  escolhido: number;
  aoEscolher: (valor: number) => void;
  /** "Hora 07" / "Minuto 30" para o leitor de tela */
  prefixo: string;
};

/** Grade de botões em 6 colunas, no visual dos chips do app. */
function Grade({ titulo, valores, escolhido, aoEscolher, prefixo }: GradeProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.grupo}>
      <Text variant="caption" color="mute">
        {titulo}
      </Text>
      <View style={styles.grade} accessibilityRole="radiogroup" accessibilityLabel={titulo}>
        {valores.map((valor) => {
          const ativo = valor === escolhido;
          return (
            <PressableEscala
              key={valor}
              accessibilityRole="radio"
              accessibilityLabel={`${prefixo} ${doisDigitos(valor)}`}
              accessibilityState={{ selected: ativo }}
              onPress={() => aoEscolher(valor)}
              haptica={ativo ? undefined : "selecao"}
              escala={0.92}
              style={[styles.opcao, { backgroundColor: ativo ? colors.ink : colors.sunk }]}
            >
              <Text variant="body" weight={ativo ? 700 : 500} color={ativo ? "onInk" : "ink"}>
                {doisDigitos(valor)}
              </Text>
            </PressableEscala>
          );
        })}
      </View>
    </View>
  );
}

type PainelProps = {
  rotulo: string;
  valor: string | null;
  aoConfirmar: (hora: string) => void;
  aoFechar: () => void;
};

/** Painel que sobe de baixo com as horas (00 a 23) e os minutos (de 5 em 5). */
function PainelDeHorario({ rotulo, valor, aoConfirmar, aoFechar }: PainelProps) {
  const { colors, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: alturaTela } = useWindowDimensions();
  const inicial = partesDaHora(valor);
  const [horas, setHoras] = useState(inicial.horas);
  const [minutos, setMinutos] = useState(inicial.minutos);

  const deslocamento = useSharedValue(alturaTela);
  const opacidadeVeu = useSharedValue(0);

  useEffect(() => {
    const reduzir = ReduceMotion.System;
    deslocamento.value = withTiming(0, {
      duration: MOTION.sheet.duration,
      easing: CURVA,
      reduceMotion: reduzir,
    });
    opacidadeVeu.value = withTiming(1, { duration: 300, reduceMotion: reduzir });
  }, [deslocamento, opacidadeVeu]);

  const estiloSheet = useAnimatedStyle(() => ({
    transform: [{ translateY: deslocamento.value }],
  }));
  const estiloVeu = useAnimatedStyle(() => ({ opacity: opacidadeVeu.value }));

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={aoFechar}
    >
      <View style={styles.raiz}>
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }, estiloVeu]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={aoFechar}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
          />
        </Animated.View>

        <Animated.View
          accessibilityViewIsModal
          accessibilityLabel={`Definir horário: ${rotulo}`}
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              boxShadow: shadows.sheet,
              paddingBottom: SPACING.lg + insets.bottom,
            },
            estiloSheet,
          ]}
        >
          <View style={[styles.alca, { backgroundColor: colors.hair }]} />
          <View style={styles.topo}>
            <Text variant="section" accessibilityRole="header">
              {rotulo}
            </Text>
            <View style={[styles.visor, { backgroundColor: colors.sunk }]}>
              <Text
                variant="h1"
                weight={300}
                color="accentText"
                style={styles.numeroDoVisor}
                accessibilityLiveRegion="polite"
                testID="visor-do-horario"
              >
                {montarHora(horas, minutos)}
              </Text>
            </View>
          </View>

          <Grade
            titulo="Hora"
            valores={HORAS}
            escolhido={horas}
            aoEscolher={setHoras}
            prefixo="Hora"
          />
          <Grade
            titulo="Minutos"
            valores={MINUTOS}
            escolhido={minutos}
            aoEscolher={setMinutos}
            prefixo="Minuto"
          />

          <BotaoAcao
            titulo="Definir horário"
            comMais={false}
            aoPressionar={() => aoConfirmar(montarHora(horas, minutos))}
          />
          <Pressable accessibilityRole="button" onPress={aoFechar} style={styles.cancelar}>
            <Text variant="support" weight={500} color="mute">
              Cancelar
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

/**
 * Campo de horário no visual do app: mostra a hora e, ao tocar, abre o painel com a grade de
 * horas e minutos. Substitui o relógio nativo do sistema, que não seguia a identidade do app.
 */
export default function SeletorDeHorario({
  valor,
  aoMudar,
  rotulo,
  bloco = false,
}: SeletorDeHorarioProps) {
  const { colors } = useTheme();
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <PressableEscala
        accessibilityRole="button"
        accessibilityLabel={valor === null ? `${rotulo}: escolher horário` : `${rotulo}: ${valor}`}
        onPress={() => setAberto(true)}
        escala={0.97}
        style={[
          styles.campo,
          bloco && styles.bloco,
          { borderColor: colors.hair, backgroundColor: colors.card },
        ]}
      >
        <Text
          variant={bloco ? "h1" : "body"}
          weight={bloco ? 300 : undefined}
          color={valor === null ? "placeholder" : "ink"}
          style={bloco ? styles.numeroDoBloco : undefined}
        >
          {valor ?? "--:--"}
        </Text>
      </PressableEscala>
      {aberto ? (
        <PainelDeHorario
          rotulo={rotulo}
          valor={valor}
          aoFechar={() => setAberto(false)}
          aoConfirmar={(hora) => {
            setAberto(false);
            aoMudar(hora);
          }}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  campo: {
    minHeight: SIZES.field,
    borderWidth: 1,
    borderRadius: RADIUS.field,
    paddingHorizontal: SPACING.lg,
    justifyContent: "center",
  },
  bloco: { minHeight: 64, borderRadius: RADIUS.category },
  numeroDoBloco: { fontSize: 28, lineHeight: 34, fontVariant: ["tabular-nums"] },
  raiz: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.screenAuth,
    borderTopLeftRadius: RADIUS.progress,
    borderTopRightRadius: RADIUS.progress,
    gap: SPACING.md,
  },
  alca: { alignSelf: "center", width: 44, height: 5, borderRadius: 3 },
  topo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  visor: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.field,
  },
  numeroDoVisor: { fontVariant: ["tabular-nums"] },
  grupo: { gap: SPACING.xs },
  grade: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  opcao: {
    // 6 colunas com 5 vãos de 6 pt: cada botão ocupa 1/6 da linha menos a sua parte dos vãos.
    flexBasis: `${100 / COLUNAS - 2}%`,
    flexGrow: 1,
    minHeight: SIZES.touchMin,
    borderRadius: RADIUS.field,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelar: { height: SIZES.touchMin, alignItems: "center", justifyContent: "center" },
});
