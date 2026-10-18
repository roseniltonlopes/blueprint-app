import { useMemo, useState } from "react";
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { useAuth } from "../auth/AuthProvider";
import { ErroDeAutenticacao } from "../auth/tipos";
import { MENSAGENS_DE_ERRO, validarFormulario, type ErrosDoFormulario } from "../auth/validacao";
import BotaoAcao from "../components/BotaoAcao";
import { descreverFuso, fusoDoAparelho } from "../domain/fuso";
import { coresDosSegmentos } from "../styles/cores";
import { useTheme } from "../theme/ThemeProvider";
import { RADIUS, SPACING } from "../styles/theme";
import { Campo } from "../ui/Campo";
import { Icon } from "../ui/Icon";
import { entrada } from "../ui/motion";
import { SegmentedControl } from "../ui/SegmentedControl";
import { Text } from "../ui/Text";

type Modo = "cadastro" | "entrar";

/** Anel mini 3 de 5 ao lado do wordmark (docs/03 tela 1). */
function AnelMarca() {
  const { colors } = useTheme();
  const r = 15;
  const circunferencia = 2 * Math.PI * r;
  const segmento = circunferencia / 5 - 3;
  const cores = coresDosSegmentos(colors.gradient, 5);
  return (
    <Svg width={40} height={40} viewBox="0 0 40 40">
      {cores.map((cor, i) => (
        <Circle
          key={cor + i}
          cx={20}
          cy={20}
          r={r}
          fill="none"
          stroke={i < 3 ? cor : colors.hair}
          strokeWidth={5}
          strokeDasharray={[segmento, circunferencia]}
          transform={`rotate(${-90 + 3 + i * 72} 20 20)`}
        />
      ))}
    </Svg>
  );
}

/** Cadastro e login por e-mail (docs/03 tela 1; docs/05 F18 e F20). */
export default function AuthScreen() {
  const { colors } = useTheme();
  const { entrar, cadastrar } = useAuth();
  const insets = useSafeAreaInsets();
  const [modo, setModo] = useState<Modo>("cadastro");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erros, setErros] = useState<ErrosDoFormulario>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const fuso = useMemo(() => fusoDoAparelho(), []);

  function trocarModo(novo: Modo) {
    setModo(novo);
    setErros({});
    setErroGeral(null);
  }

  async function enviar() {
    const encontrados = validarFormulario(modo, { nome, email, senha });
    setErros(encontrados);
    setErroGeral(null);
    if (Object.keys(encontrados).length > 0) {
      return;
    }
    setEnviando(true);
    try {
      if (modo === "entrar") {
        await entrar(email, senha);
        return;
      }
      const resultado = await cadastrar({ nome, email, senha, fuso });
      if (resultado.tipo === "confirmarEmail") {
        setAviso(
          `Enviamos um link de confirmação para ${resultado.email}. Confirme e depois entre com sua senha.`,
        );
        setModo("entrar");
        setSenha("");
      }
    } catch (erro) {
      // Mantém tudo o que a pessoa digitou (docs/05 F18 a F20).
      setErroGeral(
        erro instanceof ErroDeAutenticacao ? erro.message : MENSAGENS_DE_ERRO.desconhecido,
      );
    } finally {
      setEnviando(false);
    }
  }

  const cadastro = modo === "cadastro";

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.raiz, { backgroundColor: colors.bg }]}
    >
      <KeyboardAvoidingView behavior="padding" style={styles.raiz}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.conteudo, { paddingBottom: SPACING.xxl + insets.bottom }]}
        >
          <Animated.View entering={entrada(0)} style={styles.marca}>
            <AnelMarca />
            <Text variant="wordmark" accessibilityRole="header" accessibilityLabel="Blueprint">
              Blue
              <Text variant="wordmark" weight={700}>
                print
              </Text>
            </Text>
          </Animated.View>
          <Animated.View entering={entrada(60)}>
            <Text variant="body" color="mute" style={styles.frase}>
              Seu dia, um toque por vez.
            </Text>
          </Animated.View>

          <Animated.View entering={entrada(100)}>
            <SegmentedControl<Modo>
              accessibilityLabel="Tipo de acesso"
              value={modo}
              onChange={trocarModo}
              options={[
                { value: "cadastro", label: "Criar conta" },
                { value: "entrar", label: "Entrar" },
              ]}
            />
          </Animated.View>

          {aviso ? (
            <View
              style={[styles.mensagem, { backgroundColor: colors.card }]}
              accessibilityLiveRegion="polite"
            >
              <Icon name="nuvem" color={colors.accentText} size={20} />
              <Text variant="support" style={styles.flex}>
                {aviso}
              </Text>
            </View>
          ) : null}

          <Animated.View entering={entrada(150)} style={styles.campos}>
            {cadastro ? (
              <Campo
                rotulo="Nome completo"
                placeholder="Como devemos te chamar"
                value={nome}
                onChangeText={setNome}
                erro={erros.nome}
                autoComplete="name"
                textContentType="name"
                autoCapitalize="words"
                returnKeyType="next"
                maxLength={80}
              />
            ) : null}
            <Campo
              rotulo="E-mail"
              placeholder="voce@exemplo.com"
              value={email}
              onChangeText={setEmail}
              erro={erros.email}
              autoComplete="email"
              textContentType="emailAddress"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
            <Campo
              rotulo="Senha"
              senha
              placeholder="Mínimo de 8 caracteres"
              value={senha}
              onChangeText={setSenha}
              erro={erros.senha}
              autoComplete={cadastro ? "new-password" : "current-password"}
              textContentType={cadastro ? "newPassword" : "password"}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={() => void enviar()}
            />
          </Animated.View>

          {cadastro ? (
            <Text variant="caption" color="mute">
              Fuso horário detectado: {descreverFuso(fuso, new Date())}.
            </Text>
          ) : null}

          {erroGeral ? (
            <View
              style={[styles.mensagem, { backgroundColor: colors.card }]}
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
            >
              <Icon name="alerta" color={colors.ink} size={20} />
              <Text variant="support" style={styles.flex}>
                {erroGeral}
              </Text>
            </View>
          ) : null}

          <View style={styles.acao}>
            <BotaoAcao
              titulo={cadastro ? "Criar conta" : "Entrar"}
              comIcone={false}
              carregando={enviando}
              aoPressionar={() => void enviar()}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1 },
  flex: { flex: 1 },
  conteudo: {
    flexGrow: 1,
    paddingTop: 28,
    paddingHorizontal: SPACING.screenAuth,
    gap: SPACING.lg,
  },
  marca: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  frase: { fontSize: 17, lineHeight: 26, marginTop: -6 },
  campos: { gap: 14 },
  mensagem: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.field,
  },
  acao: { marginTop: "auto", paddingTop: SPACING.sm },
});
