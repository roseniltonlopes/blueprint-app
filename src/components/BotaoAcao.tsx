import { ActivityIndicator, Pressable, StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { RADIUS, SIZES } from "../styles/theme";
import { Icon } from "../ui/Icon";
import { Text } from "../ui/Text";

type BotaoAcaoProps = {
  titulo: string;
  aoPressionar: () => void;
  desabilitado?: boolean;
  /** Mostra o "+" antes do título (registros); falso em ações como "Criar conta" */
  comIcone?: boolean;
  /** Mostra indicador de progresso e bloqueia novos toques */
  carregando?: boolean;
};

/** Botão principal (docs/03, telas 1 a 3): preto com brilho laranja; desabilitado em tom afundado. */
export default function BotaoAcao({
  titulo,
  aoPressionar,
  desabilitado = false,
  comIcone = true,
  carregando = false,
}: BotaoAcaoProps) {
  const { colors, shadows } = useTheme();
  const bloqueado = desabilitado || carregando;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityState={{ disabled: bloqueado, busy: carregando }}
      disabled={bloqueado}
      onPress={aoPressionar}
      style={({ pressed }) => [
        styles.botao,
        desabilitado
          ? { backgroundColor: colors.sunk }
          : { backgroundColor: colors.ink, boxShadow: shadows.glow },
        pressed && !bloqueado && styles.pressionado,
      ]}
    >
      {desabilitado ? (
        <Text variant="support" weight={500} color="mute" style={styles.textoDesabilitado}>
          {titulo}
        </Text>
      ) : (
        <>
          {carregando ? (
            <ActivityIndicator color={colors.onInk} />
          ) : comIcone ? (
            <Icon name="mais" color={colors.onInk} size={20} strokeWidth={2.4} />
          ) : null}
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
