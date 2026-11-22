import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MOTION, RADIUS, SPACING } from "../styles/theme";
import { useTheme } from "../theme/ThemeProvider";
import { Icon, type IconName } from "../ui/Icon";
import { CURVA } from "../ui/motion";
import { PressableEscala } from "../ui/PressableEscala";
import { Text } from "../ui/Text";

export type RotaDaAba = "Hoje" | "Agenda" | "Calendario" | "Historico" | "Perfil";

const ABAS: Record<RotaDaAba, { rotulo: string; icone: IconName }> = {
  Hoje: { rotulo: "Hoje", icone: "hoje" },
  Agenda: { rotulo: "Agenda", icone: "agenda" },
  Calendario: { rotulo: "Calendário", icone: "calendario" },
  Historico: { rotulo: "Histórico", icone: "historico" },
  Perfil: { rotulo: "Perfil", icone: "perfil" },
};

const LARGURA_MARCADOR = 24;
const MARGEM_LATERAL = SPACING.sm;

/**
 * Barra inferior de 5 abas. A aba ativa fica em tinta cheia; um marcador laranja desliza até
 * ela ao trocar de aba. Cada troca dá um toque leve de seleção.
 */
export default function BarraDeAbas({ state, navigation }: BottomTabBarProps) {
  const { colors, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const [larguraDaAba, setLarguraDaAba] = useState(0);
  const posicao = useSharedValue(0);

  const larguraAnterior = useRef(0);

  useEffect(() => {
    const destino = state.index * larguraDaAba + (larguraDaAba - LARGURA_MARCADOR) / 2;
    // Medida nova (primeira abertura, rotação, janela redimensionada): posiciona sem animar.
    // Só a troca de aba desliza o marcador.
    if (larguraAnterior.current !== larguraDaAba) {
      larguraAnterior.current = larguraDaAba;
      posicao.set(destino);
      return;
    }
    posicao.set(
      withTiming(destino, {
        duration: MOTION.sheet.duration,
        easing: CURVA,
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [state.index, larguraDaAba, posicao]);

  const marcador = useAnimatedStyle(() => ({ transform: [{ translateX: posicao.value }] }));

  function medir(evento: LayoutChangeEvent) {
    const largura = evento.nativeEvent.layout.width - MARGEM_LATERAL * 2;
    setLarguraDaAba(Math.max(0, largura / state.routes.length));
  }

  return (
    <View
      accessibilityRole="tablist"
      onLayout={medir}
      style={[
        styles.barra,
        {
          backgroundColor: colors.card,
          borderTopColor: colors.hair,
          boxShadow: shadows.tabBar,
          paddingBottom: Math.max(insets.bottom, SPACING.sm) + 6,
        },
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.marcador,
          { backgroundColor: larguraDaAba > 0 ? colors.accent : "transparent" },
          marcador,
        ]}
      />
      {state.routes.map((rota, indice) => {
        const aba = ABAS[rota.name as RotaDaAba];
        const ativa = state.index === indice;
        const cor = ativa ? colors.ink : colors.mute;

        function aoPressionar() {
          const evento = navigation.emit({
            type: "tabPress",
            target: rota.key,
            canPreventDefault: true,
          });
          if (!ativa && !evento.defaultPrevented) {
            navigation.navigate(rota.name, rota.params);
          }
        }

        return (
          <PressableEscala
            key={rota.key}
            accessibilityRole="tab"
            accessibilityLabel={aba.rotulo}
            accessibilityState={{ selected: ativa }}
            onPress={aoPressionar}
            haptica={ativa ? undefined : "selecao"}
            escala={0.94}
            style={styles.aba}
          >
            <Icon name={aba.icone} color={cor} strokeWidth={ativa ? 2.2 : 1.8} />
            <Text
              variant="caption"
              weight={ativa ? 600 : 500}
              numberOfLines={1}
              style={[styles.rotulo, { color: cor }]}
            >
              {aba.rotulo}
            </Text>
          </PressableEscala>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  barra: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingHorizontal: MARGEM_LATERAL,
  },
  marcador: {
    position: "absolute",
    top: 0,
    left: MARGEM_LATERAL,
    width: LARGURA_MARCADOR,
    height: 3,
    borderRadius: RADIUS.pill,
  },
  aba: {
    flex: 1,
    minWidth: 0,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    paddingBottom: 2,
  },
  rotulo: { fontSize: 12, lineHeight: 14 },
});
