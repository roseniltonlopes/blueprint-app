import { StyleSheet, View } from "react-native";
import type { ContagemPorCategoria } from "../domain/acoes";
import { CATEGORIAS_FIXAS, CATEGORIA_OUTRO, type CategoriaId } from "../domain/categorias";
import { RADIUS, SIZES, SPACING } from "../styles/theme";
import { useTheme } from "../theme/ThemeProvider";
import { Icon } from "../ui/Icon";
import { PressableEscala } from "../ui/PressableEscala";
import { Text } from "../ui/Text";

type RegistroRapidoProps = {
  contagem: ContagemPorCategoria;
  /** Registra na hora; a tela mostra o aviso com Desfazer */
  aoRegistrar: (categoria: Exclude<CategoriaId, "outro">) => void;
  aoAbrirOutro: () => void;
};

type ChipProps = {
  nome: string;
  icone: CategoriaId;
  total: number;
  pontilhado?: boolean;
  dica: string;
  aoPressionar: () => void;
};

function Chip({ nome, icone, total, pontilhado = false, dica, aoPressionar }: ChipProps) {
  const { colors } = useTheme();
  return (
    <PressableEscala
      accessibilityRole="button"
      accessibilityLabel={`${nome}, ${total} hoje`}
      accessibilityHint={dica}
      onPress={aoPressionar}
      style={[
        styles.chip,
        pontilhado
          ? { borderColor: colors.hair, borderStyle: "dashed" }
          : { backgroundColor: colors.card, borderColor: colors.hair },
      ]}
    >
      <Icon name={pontilhado ? "mais" : icone} color={colors.ink} size={18} />
      <Text variant="support" weight={500}>
        {nome}
      </Text>
      {total > 0 ? (
        <View style={[styles.contador, { backgroundColor: colors.sunk }]}>
          <Text variant="caption" weight={600}>
            {total}
          </Text>
        </View>
      ) : null}
    </PressableEscala>
  );
}

/**
 * Registro rápido de hábitos: 1 toque no chip registra e o aviso traz Desfazer.
 * "Outro" abre o campo de nome livre.
 */
export default function RegistroRapido({
  contagem,
  aoRegistrar,
  aoAbrirOutro,
}: RegistroRapidoProps) {
  return (
    <View style={styles.chips}>
      {CATEGORIAS_FIXAS.map((categoria) => (
        <Chip
          key={categoria.id}
          nome={categoria.nome}
          icone={categoria.id}
          total={contagem[categoria.id]}
          dica="Toque para registrar agora"
          aoPressionar={() => aoRegistrar(categoria.id as Exclude<CategoriaId, "outro">)}
        />
      ))}
      <Chip
        nome={CATEGORIA_OUTRO.nome}
        icone="outro"
        total={contagem.outro}
        pontilhado
        dica="Abre o campo para dar nome à ação"
        aoPressionar={aoAbrirOutro}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  chip: {
    minHeight: SIZES.touchMin,
    paddingLeft: SPACING.md,
    paddingRight: SPACING.md,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  contador: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});
