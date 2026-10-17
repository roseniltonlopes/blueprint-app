import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import type { ColorScheme } from "../styles/theme";
import { RADIUS, SIZES } from "../styles/theme";
import { Icon } from "../ui/Icon";

const OPCOES: readonly { scheme: ColorScheme; icone: "sol" | "lua"; rotulo: string }[] = [
  { scheme: "light", icone: "sol", rotulo: "Modo claro" },
  { scheme: "dark", icone: "lua", rotulo: "Modo escuro" },
];

/** Chave sol/lua do cabeçalho da Home. O modo automático fica no Perfil (Etapa 5). */
export default function ChaveDeTema() {
  const { scheme, colors, setMode } = useTheme();

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Tema do aplicativo"
      style={[styles.trilho, { backgroundColor: colors.sunk }]}
    >
      {OPCOES.map((opcao) => {
        const ativo = opcao.scheme === scheme;
        return (
          <Pressable
            key={opcao.scheme}
            accessibilityRole="radio"
            accessibilityLabel={opcao.rotulo}
            accessibilityState={{ selected: ativo }}
            onPress={() => setMode(opcao.scheme)}
            style={[styles.botao, ativo && { backgroundColor: colors.ink }]}
          >
            <Icon name={opcao.icone} size={20} color={ativo ? colors.onInk : colors.mute} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  trilho: { flexDirection: "row", padding: 2, borderRadius: RADIUS.pill },
  botao: {
    width: 48,
    height: SIZES.touchMin,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});
