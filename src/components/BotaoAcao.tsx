import { Pressable, StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { RADIUS, SIZES } from "../styles/theme";
import { Icon } from "../ui/Icon";
import { Text } from "../ui/Text";

type BotaoAcaoProps = {
  titulo: string;
  aoPressionar: () => void;
  desabilitado?: boolean;
};

/** Botão principal (docs/03, telas 2 e 3): preto com brilho laranja; desabilitado em tom afundado. */
export default function BotaoAcao({ titulo, aoPressionar, desabilitado = false }: BotaoAcaoProps) {
  const { colors, shadows } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: desabilitado }}
      disabled={desabilitado}
      onPress={aoPressionar}
      style={({ pressed }) => [
        styles.botao,
        desabilitado
          ? { backgroundColor: colors.sunk }
          : { backgroundColor: colors.ink, boxShadow: shadows.glow },
        pressed && !desabilitado && styles.pressionado,
      ]}
    >
      {desabilitado ? (
        <Text variant="support" weight={500} color="mute" style={styles.textoDesabilitado}>
          {titulo}
        </Text>
      ) : (
        <>
          <Icon name="mais" color={colors.onInk} size={20} strokeWidth={2.4} />
          <Text variant="body" weight={600} color="onInk">
            {titulo}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: {
    height: SIZES.button,
    borderRadius: RADIUS.button,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  textoDesabilitado: { fontSize: 15 },
  pressionado: { transform: [{ translateY: 2 }, { scale: 0.99 }] },
});
