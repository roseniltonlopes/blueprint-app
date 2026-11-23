import { StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { BRAND, RADIUS, SIZES } from "../styles/theme";
import { Icon } from "../ui/Icon";
import { PressableEscala } from "../ui/PressableEscala";
import { Text } from "../ui/Text";

type BotaoAcaoProps = {
  titulo: string;
  aoPressionar: () => void;
  desabilitado?: boolean;
  /** Mostra o "+" antes do título (ações de adicionar). Padrão: sim. */
  comMais?: boolean;
};

/**
 * Botão principal: laranja da marca com texto preto (contraste 6,3:1 nos dois temas).
 * Desabilitado em tom afundado, com o texto ainda legível.
 */
export default function BotaoAcao({
  titulo,
  aoPressionar,
  desabilitado = false,
  comMais = true,
}: BotaoAcaoProps) {
  const { colors } = useTheme();

  return (
    <PressableEscala
      accessibilityRole="button"
      accessibilityState={{ disabled: desabilitado }}
      disabled={desabilitado}
      onPress={aoPressionar}
      style={[styles.botao, { backgroundColor: desabilitado ? colors.sunk : colors.accent }]}
    >
      {desabilitado ? (
        <Text variant="support" weight={500} color="mute" style={styles.textoDesabilitado}>
          {titulo}
        </Text>
      ) : (
        <>
          {comMais ? <Icon name="mais" color={BRAND.black} size={20} strokeWidth={2.4} /> : null}
          <Text variant="body" weight={600} style={{ color: BRAND.black }}>
            {titulo}
          </Text>
        </>
      )}
    </PressableEscala>
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
});
