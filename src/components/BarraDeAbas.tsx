import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { RADIUS, SPACING } from "../styles/theme";
import { Icon, type IconName } from "../ui/Icon";
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

/**
 * Barra inferior de 5 abas. A aba ativa fica em tinta cheia com um marcador laranja
 * no topo; as outras ficam em cinza. Sem pílula, para não competir com o conteúdo.
 */
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
          borderTopColor: colors.hair,
          boxShadow: shadows.tabBar,
          paddingBottom: Math.max(insets.bottom, SPACING.sm) + 6,
        },
      ]}
    >
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
            escala={0.94}
            style={styles.aba}
          >
            <View
              style={[styles.marcador, { backgroundColor: ativa ? colors.accent : "transparent" }]}
            />
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
    paddingHorizontal: SPACING.sm,
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
  marcador: {
    width: 20,
    height: 3,
    borderRadius: RADIUS.pill,
    marginBottom: 4,
  },
  rotulo: { fontSize: 12, lineHeight: 14 },
});
