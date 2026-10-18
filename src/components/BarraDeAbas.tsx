import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { RADIUS, SIZES, SPACING } from "../styles/theme";
import { Icon, type IconName } from "../ui/Icon";
import { Text } from "../ui/Text";

export type RotaDaAba = "Hoje" | "Calendario" | "Historico" | "Perfil";

const ABAS: Record<RotaDaAba, { rotulo: string; icone: IconName }> = {
  Hoje: { rotulo: "Hoje", icone: "hoje" },
  Calendario: { rotulo: "Calendário", icone: "calendario" },
  Historico: { rotulo: "Histórico", icone: "historico" },
  Perfil: { rotulo: "Perfil", icone: "perfil" },
};

/** Barra inferior de 4 abas (docs/03; aba ativa invertida, 56 de altura). */
export default function BarraDeAbas({ state, navigation }: BottomTabBarProps) {
  const { colors, shadows } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.barra,
        {
          backgroundColor: colors.card,
          boxShadow: shadows.tabBar,
          paddingBottom: Math.max(insets.bottom, SPACING.md) + 10,
        },
      ]}
    >
      {state.routes.map((rota, indice) => {
        const aba = ABAS[rota.name as RotaDaAba];
        const ativa = state.index === indice;
        const cor = ativa ? colors.onInk : colors.mute;

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
          <Pressable
            key={rota.key}
            accessibilityRole="tab"
            accessibilityLabel={aba.rotulo}
            accessibilityState={{ selected: ativa }}
            onPress={aoPressionar}
            style={[styles.aba, ativa && { backgroundColor: colors.ink }]}
          >
            <Icon name={aba.icone} color={cor} />
            <Text variant="caption" weight={500} style={[styles.rotulo, { color: cor }]}>
              {aba.rotulo}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  barra: {
    flexDirection: "row",
    gap: 6,
    paddingTop: 10,
    paddingHorizontal: SPACING.md,
  },
  aba: {
    flex: 1,
    minWidth: 0,
    height: SIZES.button,
    borderRadius: RADIUS.button,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  rotulo: { fontSize: 12, lineHeight: 14 },
});
