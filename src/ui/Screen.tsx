import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { SPACING } from "../styles/theme";

type ScreenProps = {
  children: ReactNode;
  /** Rola o conteúdo quando ele passa da altura da tela */
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
};

export function Screen({ children, scroll = false, contentStyle }: ScreenProps) {
  const { colors } = useTheme();

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.root, { backgroundColor: colors.bg }]}
    >
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, contentStyle]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  content: {
    paddingHorizontal: SPACING.screen,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.lg,
  },
});
