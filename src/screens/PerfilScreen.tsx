import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import MapaDeCalor from "../components/MapaDeCalor";
import { contarPorDia, mapaDeCalor, sequenciaAtual, totalGeral } from "../domain/estatisticas";
import { fusoDoAparelho, nomeDoFuso } from "../domain/fuso";
import { iniciais, plural } from "../domain/texto";
import { useAcoes } from "../hooks/useAcoes";
import { aplicarDestaque, useTheme, type Destaque, type ThemeMode } from "../theme/ThemeProvider";
import { BRAND, RADIUS, SIZES, SPACING, THEMES } from "../styles/theme";
import { Card } from "../ui/Card";
import { Gradiente } from "../ui/Gradiente";
import { Icon } from "../ui/Icon";
import { entrada } from "../ui/motion";
import { Screen } from "../ui/Screen";
import { SegmentedControl } from "../ui/SegmentedControl";
import { Text } from "../ui/Text";

/** Sem conta, o perfil é local. Nome, e-mail e "Editar" chegam com o login (F18). */
const NOME_LOCAL = "Convidado";

const DESTAQUES: readonly { valor: Destaque; rotulo: string }[] = [
  { valor: "gradiente", rotulo: "Gradiente" },
  { valor: "laranja", rotulo: "Laranja" },
  { valor: "indigo", rotulo: "Índigo" },
];

function Estatistica({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <Card radius="category" style={styles.estatistica}>
      <View accessible accessibilityLabel={`${valor} ${rotulo}`}>
        <Text variant="ring" style={styles.estatisticaValor} numberOfLines={1}>
          {valor}
        </Text>
        <Text variant="support" color="mute">
          {rotulo}
        </Text>
      </View>
    </Card>
  );
}

function SeletorDeDestaque() {
  const { colors, destaque, setDestaque, scheme } = useTheme();
  // Cada amostra mostra o gradiente que a opção aplica no tema atual.
  const amostra = (valor: Destaque) => aplicarDestaque(THEMES[scheme], valor).gradient;

  return (
    <View
      style={styles.destaques}
      accessibilityRole="radiogroup"
      accessibilityLabel="Cor de destaque"
    >
      {DESTAQUES.map(({ valor, rotulo }) => {
        const ativo = destaque === valor;
        return (
          <Pressable
            key={valor}
            accessibilityRole="radio"
            accessibilityLabel={`Cor de destaque ${rotulo}`}
            accessibilityState={{ selected: ativo }}
            onPress={() => setDestaque(valor)}
            style={[
              styles.amostra,
              ativo && { boxShadow: `0px 0px 0px 3px ${colors.bg}, 0px 0px 0px 5px ${colors.ink}` },
            ]}
          >
            <View style={styles.amostraInterna}>
              <Gradiente cores={amostra(valor)} />
              {ativo ? <Icon name="check" color={BRAND.white} size={20} strokeWidth={2.6} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Perfil (docs/03 tela 8; docs/05 F14, F17 e F21). */
export default function PerfilScreen() {
  const { acoes, relogio } = useAcoes();
  const { colors, mode, setMode } = useTheme();
  const hoje = relogio();
  const porDia = useMemo(() => contarPorDia(acoes), [acoes]);
  const sequencia = sequenciaAtual(porDia, hoje);
  const colunas = useMemo(() => mapaDeCalor(porDia, relogio()), [porDia, relogio]);
  const fuso = useMemo(() => nomeDoFuso(fusoDoAparelho()), []);

  return (
    <Screen scroll contentStyle={styles.conteudo}>
      <Animated.View entering={entrada(0)}>
        <Text variant="h1" accessibilityRole="header">
          Perfil
        </Text>
      </Animated.View>

      <Animated.View entering={entrada(50)} style={styles.identidade}>
        <View style={styles.avatar} accessible accessibilityLabel={`Avatar de ${NOME_LOCAL}`}>
          <Gradiente cores={colors.gradient} />
          <Text variant="cardTitle" weight={600} style={styles.iniciais}>
            {iniciais(NOME_LOCAL)}
          </Text>
        </View>
        <View style={styles.flex}>
          <Text variant="cardTitle" weight={600}>
            {NOME_LOCAL}
          </Text>
          <Text variant="support" color="mute">
            Dados salvos neste aparelho
          </Text>
        </View>
      </Animated.View>

      <Animated.View entering={entrada(100)} style={styles.estatisticas}>
        <Estatistica valor={String(totalGeral(porDia))} rotulo="ações registradas" />
        <Estatistica valor={plural(sequencia, "dia", "dias")} rotulo="sequência atual" />
      </Animated.View>

      <Animated.View entering={entrada(150)}>
        <Card style={styles.mapa}>
          <View style={styles.tituloMapa}>
            <Text variant="section" accessibilityRole="header">
              Mapa de calor
            </Text>
            <Text variant="caption" color="mute">
              últimas 12 semanas
            </Text>
          </View>
          <MapaDeCalor colunas={colunas} />
        </Card>
      </Animated.View>

      <Animated.View entering={entrada(200)} style={styles.secao}>
        <Text variant="section" accessibilityRole="header">
          Aparência
        </Text>
        <SegmentedControl<ThemeMode>
          accessibilityLabel="Aparência"
          value={mode}
          onChange={setMode}
          options={[
            { value: "light", label: "Claro" },
            { value: "dark", label: "Escuro" },
            { value: "system", label: "Automático" },
          ]}
        />
      </Animated.View>

      <Animated.View entering={entrada(260)} style={styles.linhaDestaque}>
        <Text variant="body">Cor de destaque</Text>
        <SeletorDeDestaque />
      </Animated.View>

      <View>
        <View style={styles.linhaInfo}>
          <Text variant="body">Fuso horário</Text>
          <Text variant="support" color="mute" style={styles.valorInfo}>
            {fuso}
          </Text>
        </View>
        <View style={styles.linhaInfo}>
          <Text variant="body">Conta</Text>
          <Text variant="support" color="mute" style={styles.valorInfo}>
            Sem conta
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  conteudo: { gap: SPACING.lg },
  flex: { flex: 1, minWidth: 0 },
  identidade: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.pill,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  iniciais: { color: BRAND.white, fontSize: 22, lineHeight: 28 },
  estatisticas: { flexDirection: "row", gap: SPACING.gap },
  estatistica: { flex: 1, paddingVertical: 14 },
  estatisticaValor: { fontSize: 36, lineHeight: 40, letterSpacing: -1.08 },
  mapa: { paddingHorizontal: SPACING.xl, paddingBottom: 14 },
  tituloMapa: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  secao: { gap: SPACING.md },
  linhaDestaque: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  destaques: { flexDirection: "row", gap: SPACING.md, paddingRight: 5 },
  amostra: { width: SIZES.touchMin, height: SIZES.touchMin, borderRadius: RADIUS.pill },
  amostraInterna: {
    flex: 1,
    borderRadius: RADIUS.pill,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  linhaInfo: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.md,
  },
  valorInfo: { fontSize: 15, flexShrink: 1, textAlign: "right" },
});
