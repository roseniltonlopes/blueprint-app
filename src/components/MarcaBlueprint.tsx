import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { coresDosSegmentos } from "../styles/cores";
import { useTheme } from "../theme/ThemeProvider";
import { Text } from "../ui/Text";

const SEGMENTOS = 5;

type MarcaBlueprintProps = {
  /** Lado do anel em pontos */
  tamanho?: number;
  /** Mostra o nome "Blueprint" ao lado do anel */
  comNome?: boolean;
};

/**
 * Marca do app: o anel segmentado do ícone (quatro partes cheias e a última apagada, "quase lá")
 * com o gradiente da marca, e o nome "Blue" leve + "print" forte, como no site.
 */
export default function MarcaBlueprint({ tamanho = 64, comNome = true }: MarcaBlueprintProps) {
  const { colors } = useTheme();
  const cores = coresDosSegmentos(colors.gradient, SEGMENTOS);
  const centro = tamanho / 2;
  const traco = tamanho * 0.16;
  const raio = centro - traco / 2;
  const circunferencia = 2 * Math.PI * raio;
  const vao = traco * 1.4;
  const comprimento = circunferencia / SEGMENTOS - vao;
  const passo = 360 / SEGMENTOS;
  const inicio = -90 + (vao / 2 / circunferencia) * 360;

  return (
    <View style={styles.linha} accessible accessibilityRole="image" accessibilityLabel="Blueprint">
      <Svg width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`}>
        {cores.map((cor, i) => (
          <Circle
            key={cor + i}
            cx={centro}
            cy={centro}
            r={raio}
            fill="none"
            stroke={cor}
            strokeOpacity={i === SEGMENTOS - 1 ? 0.35 : 1}
            strokeWidth={traco}
            strokeLinecap="round"
            strokeDasharray={[comprimento, circunferencia]}
            transform={`rotate(${inicio + i * passo} ${centro} ${centro})`}
          />
        ))}
      </Svg>
      {comNome ? (
        <Text variant="wordmark" importantForAccessibility="no">
          Blue
          <Text variant="wordmark" weight={700}>
            print
          </Text>
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: "row", alignItems: "center", gap: 14 },
});
