import { Component, type ErrorInfo, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RADIUS, SIZES, SPACING } from "../styles/theme";
import { useTheme } from "../theme/ThemeProvider";
import { Icon } from "../ui/Icon";
import { PressableEscala } from "../ui/PressableEscala";
import { Text } from "../ui/Text";

type TelaDeErroProps = { aoTentarDeNovo: () => void };

/**
 * Tela mostrada quando uma parte do app quebra. Não exibe a mensagem técnica nem a pilha do
 * erro: elas podem conter dados da pessoa. Os dados salvos no aparelho não são apagados.
 */
export function TelaDeErro({ aoTentarDeNovo }: TelaDeErroProps) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.tela, { backgroundColor: colors.bg }]}>
      <View style={[styles.icone, { backgroundColor: colors.sunk }]}>
        <Icon name="alerta" color={colors.ink} size={28} />
      </View>
      <Text variant="sheetTitle" accessibilityRole="header" style={styles.centro}>
        Algo deu errado
      </Text>
      <Text variant="support" color="mute" style={styles.centro}>
        O Blueprint encontrou um problema nesta tela. Seus dados continuam salvos no aparelho.
      </Text>
      <PressableEscala
        accessibilityRole="button"
        onPress={aoTentarDeNovo}
        style={[styles.botao, { backgroundColor: colors.ink }]}
      >
        <Text variant="body" weight={600} color="onInk">
          Tentar de novo
        </Text>
      </PressableEscala>
      <Text variant="caption" color="mute" style={styles.centro}>
        Se continuar, feche o app e abra de novo.
      </Text>
    </SafeAreaView>
  );
}

type LimiteDeErroProps = { children: ReactNode };
type Estado = { comErro: boolean };

/** Captura erros de renderização das telas e mostra a TelaDeErro no lugar do app quebrado. */
export class LimiteDeErro extends Component<LimiteDeErroProps, Estado> {
  state: Estado = { comErro: false };

  static getDerivedStateFromError(): Estado {
    return { comErro: true };
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    // Só no desenvolvimento: no APK nada vai para o console nem sai do aparelho.
    if (__DEV__) {
      console.warn("Erro capturado pela tela de erro.", erro, info.componentStack);
    }
  }

  private tentarDeNovo = () => {
    this.setState({ comErro: false });
  };

  render() {
    if (this.state.comErro) {
      return <TelaDeErro aoTentarDeNovo={this.tentarDeNovo} />;
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.screenAuth,
    gap: SPACING.lg,
  },
  icone: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  centro: { textAlign: "center" },
  botao: {
    alignSelf: "stretch",
    minHeight: SIZES.button,
    borderRadius: RADIUS.button,
    alignItems: "center",
    justifyContent: "center",
    marginTop: SPACING.sm,
  },
});
