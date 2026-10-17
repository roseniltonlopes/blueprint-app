import { StyleSheet, View } from "react-native";
import { useTheme, type ThemeMode } from "../theme/ThemeProvider";
import {
  BRAND,
  RADIUS,
  SPACING,
  TYPOGRAPHY,
  type TextVariant,
  type ThemeColors,
} from "../styles/theme";
import { Card, Screen, SegmentedControl, Text, type SegmentOption } from "../ui";

/**
 * Tela temporária da Etapa 1 para validar tokens e componentes base no aparelho.
 * Sai do App.tsx quando a Home v2 entrar (Etapa 2).
 */

const MODOS: readonly SegmentOption<ThemeMode>[] = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
  { value: "system", label: "Automático" },
];

const PAPEIS: readonly (keyof Omit<ThemeColors, "gradient" | "ramp">)[] = [
  "bg",
  "card",
  "sunk",
  "ink",
  "onInk",
  "mute",
  "hair",
  "accent",
  "accentText",
  "placeholder",
];

const VARIANTES = Object.keys(TYPOGRAPHY) as TextVariant[];

export default function GaleriaScreen() {
  const { mode, scheme, colors, setMode } = useTheme();

  return (
    <Screen scroll contentStyle={styles.gap}>
      <View>
        <Text variant="support" color="mute">
          Etapa 1 · tema {scheme === "dark" ? "escuro" : "claro"}
        </Text>
        <Text variant="h1">Galeria de componentes</Text>
      </View>

      <View style={styles.section}>
        <Text variant="section">Aparência</Text>
        <SegmentedControl
          options={MODOS}
          value={mode}
          onChange={setMode}
          accessibilityLabel="Aparência"
        />
      </View>

      <View style={styles.section}>
        <Text variant="section">Cores do tema</Text>
        <Card>
          {PAPEIS.map((papel) => (
            <View key={papel} style={styles.swatchRow}>
              <View
                style={[
                  styles.swatch,
                  { backgroundColor: colors[papel], borderColor: colors.hair },
                ]}
              />
              <Text variant="support">{papel}</Text>
              <Text variant="caption" color="mute" style={styles.swatchValue}>
                {colors[papel]}
              </Text>
            </View>
          ))}
        </Card>
      </View>

      <View style={styles.section}>
        <Text variant="section">Rampa de intensidade</Text>
        <View style={styles.ramp}>
          <View style={[styles.rampCell, { backgroundColor: colors.sunk }]} />
          {colors.ramp.map((cor, nivel) => (
            <View key={cor} style={[styles.rampCell, { backgroundColor: cor }]}>
              <Text variant="caption" style={styles.rampLabel}>
                {nivel + 1}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text variant="section">Tipografia</Text>
        <Card>
          {VARIANTES.map((variante) => (
            <View key={variante} style={styles.typeRow}>
              <Text variant="caption" color="mute">
                {variante} · {TYPOGRAPHY[variante].fontSize}/{TYPOGRAPHY[variante].weight}
              </Text>
              <Text variant={variante} numberOfLines={1}>
                {variante === "ring" ? "3" : "Olá, Ana"}
              </Text>
            </View>
          ))}
          <View style={styles.typeRow}>
            <Text variant="caption" color="mute">
              wordmark
            </Text>
            <Text variant="wordmark">
              Blue
              <Text variant="wordmark" weight={700}>
                print
              </Text>
            </Text>
          </View>
          <Text variant="body" color="accentText">
            Texto de destaque (accentText)
          </Text>
        </Card>
      </View>

      <View style={styles.section}>
        <Text variant="section">Cartões</Text>
        <View style={styles.cardRow}>
          <Card radius="category" style={styles.cardDemo}>
            <View style={[styles.iconCircle, { backgroundColor: colors.sunk }]} />
            <View>
              <Text variant="body">Hidratação</Text>
              <Text variant="caption" color="mute">
                2 hoje
              </Text>
            </View>
          </Card>
          <Card radius="category" inverted elevation="glow" style={styles.cardDemo}>
            <View style={[styles.iconCircle, { backgroundColor: colors.onInk }]} />
            <View>
              <Text variant="body" color="onInk">
                Estudo
              </Text>
              <Text variant="caption" color="onInk" style={styles.dim}>
                selecionado
              </Text>
            </View>
          </Card>
        </View>
        <Card radius="progress">
          <Text variant="cardTitle">Cartão de progresso</Text>
          <Text variant="support" color="mute">
            Raio 28, sombra difusa no claro e separação por tom no escuro.
          </Text>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: SPACING.xxl },
  section: { gap: SPACING.gap },
  swatchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  swatchValue: { marginLeft: "auto" },
  ramp: { flexDirection: "row", gap: SPACING.sm },
  rampCell: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rampLabel: { color: BRAND.offWhite },
  typeRow: { gap: 2, marginBottom: SPACING.md },
  cardRow: { flexDirection: "row", gap: SPACING.gap },
  cardDemo: { flex: 1, height: 108, padding: 14, justifyContent: "space-between" },
  iconCircle: { width: 42, height: 42, borderRadius: RADIUS.pill },
  dim: { opacity: 0.76 },
});
