import { useEffect, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ROTULO_MAX, normalizarRotulo } from "../domain/acoes";
import { useTheme } from "../theme/ThemeProvider";
import { FONT_FAMILY, MOTION, RADIUS, SIZES, SPACING } from "../styles/theme";
import { CURVA } from "../ui/motion";
import { Text } from "../ui/Text";
import BotaoAcao from "./BotaoAcao";

export const SUGESTOES_OUTRO = ["Meditação", "Alongamento", "Organização"] as const;

type OutraAcaoSheetProps = {
  aoFechar: () => void;
  aoRegistrar: (rotulo: string) => void;
};

/** Acompanha o teclado para não somar a margem da barra de navegação acima dele. */
function useTecladoAberto(): boolean {
  const [aberto, setAberto] = useState(false);
  useEffect(() => {
    const mostrar = Keyboard.addListener("keyboardDidShow", () => setAberto(true));
    const esconder = Keyboard.addListener("keyboardDidHide", () => setAberto(false));
    return () => {
      mostrar.remove();
      esconder.remove();
    };
  }, []);
  return aberto;
}

/**
 * Bottom sheet "Outra ação" (docs/03 tela 4; docs/05 F06).
 * Monte só quando aberto: cada abertura começa com o campo vazio.
 *
 * A entrada usa estilo animado (translateY) e não layout animation: dentro de um
 * Modal no Android a layout animation deixava a área de toque fora do lugar.
 */
export default function OutraAcaoSheet({ aoFechar, aoRegistrar }: OutraAcaoSheetProps) {
  const { colors, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: alturaTela } = useWindowDimensions();
  const tecladoAberto = useTecladoAberto();
  const [texto, setTexto] = useState("");
  const rotulo = normalizarRotulo(texto);

  const deslocamento = useSharedValue(alturaTela);
  const opacidadeVeu = useSharedValue(0);

  useEffect(() => {
    const reduzir = ReduceMotion.System;
    deslocamento.value = withTiming(0, {
      duration: MOTION.sheet.duration,
      easing: CURVA,
      reduceMotion: reduzir,
    });
    opacidadeVeu.value = withTiming(1, { duration: 400, reduceMotion: reduzir });
  }, [deslocamento, opacidadeVeu]);

  const estiloSheet = useAnimatedStyle(() => ({
    transform: [{ translateY: deslocamento.value }],
  }));
  const estiloVeu = useAnimatedStyle(() => ({ opacity: opacidadeVeu.value }));

  function confirmar() {
    if (rotulo !== null) {
      aoRegistrar(rotulo);
    }
  }

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={aoFechar}
    >
      <KeyboardAvoidingView behavior="padding" style={styles.raiz}>
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
          accessibilityLabel="Registrar outra ação"
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              boxShadow: shadows.sheet,
              paddingBottom: 28 + (tecladoAberto ? 0 : insets.bottom),
            },
            estiloSheet,
          ]}
        >
          <View style={[styles.alca, { backgroundColor: colors.hair }]} />

          <View>
            <Text variant="sheetTitle" accessibilityRole="header">
              Outra ação
            </Text>
            <Text variant="support" color="mute" style={styles.descricao}>
              Dê um nome curto. Ele aparece assim no seu histórico.
            </Text>
          </View>

          <View style={styles.campo}>
            <Text variant="support" weight={600} nativeID="rotulo-outro">
              O que você fez?
            </Text>
            <TextInput
              accessibilityLabelledBy="rotulo-outro"
              accessibilityLabel="O que você fez?"
              value={texto}
              onChangeText={setTexto}
              autoFocus
              maxLength={ROTULO_MAX}
              returnKeyType="done"
              onSubmitEditing={confirmar}
              placeholder="Ex.: meditação de 10 minutos"
              placeholderTextColor={colors.placeholder}
              style={[
                styles.input,
                { borderColor: colors.hair, backgroundColor: colors.card, color: colors.ink },
              ]}
            />
          </View>

          <View style={styles.sugestoes}>
            {SUGESTOES_OUTRO.map((sugestao) => (
              <Pressable
                key={sugestao}
                accessibilityRole="button"
                accessibilityLabel={`Sugestão: ${sugestao}`}
                onPress={() => setTexto(sugestao)}
                style={[styles.chip, { backgroundColor: colors.sunk }]}
              >
                <Text variant="support" weight={500}>
                  {sugestao}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.acao}>
            <BotaoAcao
              titulo="Registrar ação"
              desabilitado={rotulo === null}
              aoPressionar={confirmar}
            />
          </View>

          <Pressable accessibilityRole="button" onPress={aoFechar} style={styles.cancelar}>
            <Text variant="support" weight={500} color="mute" style={styles.cancelarTexto}>
              Cancelar
            </Text>
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.screenAuth,
    borderTopLeftRadius: RADIUS.progress,
    borderTopRightRadius: RADIUS.progress,
    gap: SPACING.lg,
  },
  alca: { alignSelf: "center", width: 44, height: 5, borderRadius: 3 },
  descricao: { marginTop: SPACING.xs, fontSize: 15, lineHeight: 22 },
  campo: { gap: SPACING.sm },
  input: {
    height: SIZES.field,
    paddingHorizontal: SPACING.lg,
    borderWidth: 1,
    borderRadius: RADIUS.field,
    fontFamily: FONT_FAMILY[400],
    fontSize: 16,
  },
  sugestoes: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  chip: {
    height: SIZES.touchMin,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.pill,
    justifyContent: "center",
  },
  acao: { marginTop: SPACING.xs },
  cancelar: { height: SIZES.touchMin, alignItems: "center", justifyContent: "center" },
  cancelarTexto: { fontSize: 15 },
});
