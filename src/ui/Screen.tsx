import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";
import { useContext, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { SPACING } from "../styles/theme";

type ScreenProps = {
  children: ReactNode;
  /** Rola o conteúdo quando ele passa da altura da tela */
  scroll?: boolean;
  /** Conteúdo fixo abaixo da área rolável, como o botão principal */
  footer?: ReactNode;
  /** Botão flutuante no canto inferior direito, por cima do conteúdo (ex.: Novo compromisso) */
  flutuante?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
};

const BORDAS_COM_ABAS: Edge[] = ["top", "left", "right"];
const BORDAS_SEM_ABAS: Edge[] = ["top", "left", "right", "bottom"];

/**
 * Base de toda tela. Dentro das abas, a borda de baixo fica com a barra de abas, que já aplica a
 * área segura. Fora delas (cadastro, compromisso, conta), a tela reserva a área dos botões do
 * Android para que o rodapé não fique por baixo deles. O conteúdo sobe junto com o teclado.
 */
export function Screen({ children, scroll = false, footer, flutuante, contentStyle }: ScreenProps) {
  const { colors } = useTheme();
  const alturaDasAbas = useContext(BottomTabBarHeightContext);
  const dentroDasAbas = alturaDasAbas !== undefined;

  return (
    <SafeAreaView
      edges={dentroDasAbas ? BORDAS_COM_ABAS : BORDAS_SEM_ABAS}
      style={[styles.root, { backgroundColor: colors.bg }]}
    >
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "web" ? undefined : "padding"}
      >
        {scroll ? (
          <ScrollView
            style={styles.fill}
            contentContainerStyle={[styles.content, contentStyle]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.content, styles.fill, contentStyle]}>{children}</View>
        )}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
      {flutuante ? (
        <View style={styles.flutuante} pointerEvents="box-none">
          {flutuante}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  content: {
    paddingHorizontal: SPACING.screen,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  flutuante: { position: "absolute", right: SPACING.screen, bottom: SPACING.lg },
  footer: {
    paddingHorizontal: SPACING.screen,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },
});
