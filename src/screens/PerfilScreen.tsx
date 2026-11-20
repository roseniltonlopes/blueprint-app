import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import AvatarDoPerfil from "../components/AvatarDoPerfil";
import BotaoTexto from "../components/BotaoTexto";
import Campo from "../components/Campo";
import MapaDeCalor from "../components/MapaDeCalor";
import { NOME_MAX } from "../domain/perfil";
import { contarPorDia, mapaDeCalor, sequenciaAtual, totalGeral } from "../domain/estatisticas";
import { fusoDoAparelho, nomeDoFuso } from "../domain/fuso";
import { plural } from "../domain/texto";
import { useAcoes } from "../hooks/useAcoes";
import { usePerfil } from "../hooks/usePerfil";
import { escolherFoto } from "../services/escolherFoto";
import { aplicarDestaque, useTheme, type Destaque, type ThemeMode } from "../theme/ThemeProvider";
import { BRAND, RADIUS, SIZES, SPACING, THEMES } from "../styles/theme";
import { Card } from "../ui/Card";
import { Gradiente } from "../ui/Gradiente";
import { Icon } from "../ui/Icon";
import { entrada } from "../ui/motion";
import { PressableEscala } from "../ui/PressableEscala";
import { Screen } from "../ui/Screen";
import { SegmentedControl } from "../ui/SegmentedControl";
import { Text } from "../ui/Text";

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
              ativo && {
                boxShadow: `0px 0px 0px 3px ${colors.card}, 0px 0px 0px 5px ${colors.ink}`,
              },
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

/** Perfil (docs/03 tela 8; docs/05 F14, F17 e F21): identidade, números e aparência. */
export default function PerfilScreen() {
  const { acoes, relogio } = useAcoes();
  const { colors, mode, setMode } = useTheme();
  const { perfil, nomeExibido, salvarNome, definirFoto } = usePerfil();
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const hoje = relogio();
  const porDia = useMemo(() => contarPorDia(acoes), [acoes]);
  const sequencia = sequenciaAtual(porDia, hoje);
  const colunas = useMemo(() => mapaDeCalor(porDia, relogio()), [porDia, relogio]);
  const fuso = useMemo(() => nomeDoFuso(fusoDoAparelho()), []);

  function comecarEdicao() {
    setRascunho(perfil.nome);
    setErro(null);
    setEditando(true);
  }

  function confirmarNome() {
    const resultado = salvarNome(rascunho);
    if (resultado.ok) {
      setErro(null);
      setEditando(false);
    } else {
      setErro(resultado.erro);
    }
  }

  async function trocarFoto() {
    if (ocupado) return;
    setOcupado(true);
    setErro(null);
    const escolha = await escolherFoto();
    if (!escolha.ok) {
      setErro(escolha.erro);
    } else if (escolha.valor !== null) {
      const salva = definirFoto(escolha.valor);
      if (!salva.ok) setErro(salva.erro);
    }
    setOcupado(false);
  }

  return (
    <Screen scroll contentStyle={styles.conteudo}>
      <Animated.View entering={entrada(0)}>
        <Text variant="h1" accessibilityRole="header">
          Perfil
        </Text>
      </Animated.View>

      <Animated.View entering={entrada(50)}>
        <Card radius="progress" style={styles.identidade}>
          <View style={styles.avatarArea}>
            <AvatarDoPerfil nome={nomeExibido} foto={perfil.foto} tamanho={104} />
            <PressableEscala
              accessibilityRole="button"
              accessibilityLabel={perfil.foto ? "Trocar foto" : "Adicionar foto"}
              accessibilityState={{ busy: ocupado }}
              onPress={trocarFoto}
              style={[
                styles.camera,
                {
                  backgroundColor: colors.accent,
                  borderColor: colors.card,
                  opacity: ocupado ? 0.6 : 1,
                },
              ]}
            >
              <Icon name="camera" color={BRAND.black} size={18} strokeWidth={2.2} />
            </PressableEscala>
          </View>

          {editando ? (
            <View style={styles.edicao}>
              <Campo
                rotulo="Seu nome"
                valor={rascunho}
                aoMudar={setRascunho}
                maxLength={NOME_MAX}
                placeholder="Como você quer ser chamado"
              />
              <View style={styles.acoesEdicao}>
                <View style={styles.flex}>
                  <BotaoTexto rotulo="Cancelar" aoPressionar={() => setEditando(false)} />
                </View>
                <View style={styles.flex}>
                  <BotaoTexto rotulo="Salvar" aoPressionar={confirmarNome} variante="primario" />
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.nomeArea}>
              <Text variant="sheetTitle" weight={600} numberOfLines={1} style={styles.nome}>
                {nomeExibido}
              </Text>
              <PressableEscala
                accessibilityRole="button"
                accessibilityLabel={perfil.nome ? "Editar nome" : "Adicionar seu nome"}
                onPress={comecarEdicao}
                style={[styles.editarNome, { backgroundColor: colors.sunk }]}
              >
                <Icon name="lapis" color={colors.ink} size={16} />
                <Text variant="support" weight={600}>
                  {perfil.nome ? "Editar nome" : "Adicionar seu nome"}
                </Text>
              </PressableEscala>
              <Text variant="caption" color="mute">
                Dados salvos neste aparelho
              </Text>
            </View>
          )}

          {perfil.foto && !editando ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remover foto"
              onPress={() => definirFoto(null)}
              style={styles.removerFoto}
            >
              <Text variant="support" color="mute" weight={500}>
                Remover foto
              </Text>
            </Pressable>
          ) : null}

          {erro ? (
            <Text variant="support" color="accentText" weight={600} accessibilityRole="alert">
              {erro}
            </Text>
          ) : null}
        </Card>
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
        <Card radius="category" style={styles.grupo}>
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
          <View style={styles.linhaDestaque}>
            <Text variant="body">Cor de destaque</Text>
            <SeletorDeDestaque />
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={entrada(260)} style={styles.secao}>
        <Text variant="section" accessibilityRole="header">
          Sobre
        </Text>
        <Card radius="category" style={styles.informacoes}>
          <View style={styles.linhaInfo}>
            <Text variant="body">Fuso horário</Text>
            <Text variant="support" color="mute" style={styles.valorInfo}>
              {fuso}
            </Text>
          </View>
          <View style={[styles.linhaInfo, { borderTopWidth: 1, borderTopColor: colors.hair }]}>
            <Text variant="body">Conta</Text>
            <Text variant="support" color="mute" style={styles.valorInfo}>
              Sem conta
            </Text>
          </View>
        </Card>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  conteudo: { gap: SPACING.lg, paddingBottom: SPACING.xxl },
  flex: { flex: 1, minWidth: 0 },
  identidade: { alignItems: "center", gap: SPACING.lg, paddingVertical: SPACING.xxl },
  avatarArea: { width: 104, height: 104 },
  camera: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: SIZES.touchMin - 4,
    height: SIZES.touchMin - 4,
    borderRadius: RADIUS.pill,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  nomeArea: { alignItems: "center", gap: SPACING.sm, alignSelf: "stretch" },
  nome: { textAlign: "center", maxWidth: "100%" },
  editarNome: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    minHeight: SIZES.touchMin,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.pill,
  },
  edicao: { alignSelf: "stretch", gap: SPACING.md },
  acoesEdicao: { flexDirection: "row", gap: SPACING.md },
  removerFoto: { minHeight: SIZES.touchMin, justifyContent: "center", marginTop: -SPACING.sm },
  estatisticas: { flexDirection: "row", gap: SPACING.gap },
  estatistica: { flex: 1, paddingVertical: 14 },
  estatisticaValor: { fontSize: 36, lineHeight: 40, letterSpacing: -1.08 },
  mapa: { paddingHorizontal: SPACING.xl, paddingBottom: 14 },
  tituloMapa: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  secao: { gap: SPACING.md },
  grupo: { gap: SPACING.lg },
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
  informacoes: { paddingVertical: 0 },
  linhaInfo: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.md,
  },
  valorInfo: { fontSize: 15, flexShrink: 1, textAlign: "right" },
});
