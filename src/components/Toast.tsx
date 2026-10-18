import { useEffect } from "react";
import { AccessibilityInfo, Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useTheme } from "../theme/ThemeProvider";
import { BRAND, SIZES, SPACING } from "../styles/theme";
import { Icon } from "../ui/Icon";
import { toastEntrada, toastSaida } from "../ui/motion";
import { Text } from "../ui/Text";

export const DURACAO_TOAST_MS = 5000;

type ToastProps = {
  mensagem: string;
  aoDesfazer: () => void;
  aoSumir: () => void;
  duracaoMs?: number;
};

/** Toast de confirmação com Desfazer (docs/03 tela 5; docs/05 F07). */
export default function Toast({
  mensagem,
  aoDesfazer,
  aoSumir,
  duracaoMs = DURACAO_TOAST_MS,
}: ToastProps) {
  const { colors, shadows } = useTheme();

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(mensagem);
    const timer = setTimeout(aoSumir, duracaoMs);
    return () => clearTimeout(timer);
  }, [mensagem, aoSumir, duracaoMs]);

  return (
    <Animated.View
      entering={toastEntrada}
      exiting={toastSaida}
      accessibilityLiveRegion="polite"
      style={[styles.toast, { backgroundColor: colors.ink, boxShadow: shadows.glow }]}
    >
      <View style={[styles.selo, { backgroundColor: colors.accent }]}>
        <Icon name="check" color={BRAND.black} size={16} strokeWidth={2.8} />
      </View>
      <Text variant="support" weight={500} color="onInk" style={styles.mensagem} numberOfLines={2}>
        {mensagem}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Remove a ação que acabou de ser registrada"
        onPress={aoDesfazer}
        style={styles.desfazer}
      >
        <Text variant="support" weight={600} color="onInk" style={styles.sublinhado}>
          Desfazer
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    minHeight: 60,
    paddingLeft: 14,
    paddingRight: SPACING.sm,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  selo: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  mensagem: { flex: 1, fontSize: 15 },
  desfazer: {
    height: SIZES.touchMin,
    paddingHorizontal: 14,
    borderRadius: 14,
    justifyContent: "center",
  },
  sublinhado: { textDecorationLine: "underline" },
});
