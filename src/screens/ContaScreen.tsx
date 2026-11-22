import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import BotaoTexto from "../components/BotaoTexto";
import CabecalhoDeTela from "../components/CabecalhoDeTela";
import Campo from "../components/Campo";
import {
  EMAIL_MAX,
  SENHA_MAX,
  formularioValido,
  validarFormularioDeConta,
  type ErrosDoFormulario,
  type ModoDoFormulario,
} from "../domain/conta";
import { useConta } from "../hooks/useConta";
import { usePerfil } from "../hooks/usePerfil";
import type { RaizParamList } from "../navigation/Raiz";
import { VERSAO_DOS_TERMOS } from "../legal/textos";
import { RADIUS, SIZES, SPACING } from "../styles/theme";
import { useTheme } from "../theme/ThemeProvider";
import { Icon } from "../ui/Icon";
import { Card, Screen, SegmentedControl, Text } from "../ui";

type Props = NativeStackScreenProps<RaizParamList, "Conta">;

const TEXTO_DO_ACEITE = "Li e aceito os Termos de Uso e a Política de Privacidade";

const TITULO_DO_BOTAO: Record<ModoDoFormulario, { parado: string; enviando: string }> = {
  entrar: { parado: "Entrar", enviando: "Entrando" },
  criar: { parado: "Criar conta", enviando: "Criando conta" },
  recuperar: { parado: "Enviar link", enviando: "Enviando" },
};

/** Entrar, criar conta (e-mail e senha) e recuperar a senha. Aberta pelo cartão da conta no Perfil. */
export default function ContaScreen({ navigation }: Props) {
  const { estado, entrar, criarConta, recuperarSenha } = useConta();
  const { colors } = useTheme();
  const { perfil } = usePerfil();
  const [modo, setModo] = useState<ModoDoFormulario>("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erros, setErros] = useState<ErrosDoFormulario>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [aceitouTermos, setAceitouTermos] = useState(false);

  function trocarModo(novo: ModoDoFormulario) {
    setModo(novo);
    setErros({});
    setErroGeral(null);
    setAviso(null);
  }

  async function enviar() {
    if (enviando) return;
    const encontrados = validarFormularioDeConta(modo, { email, senha });
    setErros(encontrados);
    setErroGeral(null);
    setAviso(null);
    if (!formularioValido(encontrados)) return;

    setEnviando(true);
    if (modo === "entrar") {
      const resultado = await entrar(email, senha);
      setEnviando(false);
      if (resultado.ok) {
        navigation.goBack();
      } else {
        setErroGeral(resultado.erro);
      }
      return;
    }
    if (modo === "criar") {
      if (!aceitouTermos) {
        setEnviando(false);
        return;
      }
      const resultado = await criarConta({
        email,
        senha,
        nome: perfil.nome.length > 0 ? perfil.nome : null,
        termosVersao: VERSAO_DOS_TERMOS,
      });
      setEnviando(false);
      if (!resultado.ok) {
        setErroGeral(resultado.erro);
      } else if (resultado.valor === "conectado") {
        navigation.goBack();
      } else {
        setModo("entrar");
        setSenha("");
        setAviso(`Enviamos um link para ${email.trim()}. Confirme o e-mail e depois entre.`);
      }
      return;
    }
    const resultado = await recuperarSenha(email);
    setEnviando(false);
    if (resultado.ok) {
      setAviso(
        "Se houver conta com este e-mail, o link para criar uma nova senha chega em alguns minutos.",
      );
    } else {
      setErroGeral(resultado.erro);
    }
  }

  const cabecalho = <CabecalhoDeTela titulo="Conta" aoVoltar={() => navigation.goBack()} />;

  if (estado.situacao === "indisponivel") {
    return (
      <Screen scroll contentStyle={styles.conteudo}>
        {cabecalho}
        <Card style={styles.cartao}>
          <Text variant="body">A conta na nuvem não está disponível nesta versão do app.</Text>
          <Text variant="support" color="mute">
            Os seus dados continuam salvos neste aparelho.
          </Text>
        </Card>
      </Screen>
    );
  }

  if (estado.situacao === "conectado") {
    return (
      <Screen scroll contentStyle={styles.conteudo}>
        {cabecalho}
        <Card style={styles.cartao}>
          <Text variant="body">{`Você entrou como ${estado.sessao.email}.`}</Text>
          <BotaoTexto rotulo="Voltar ao perfil" aoPressionar={() => navigation.goBack()} />
        </Card>
      </Screen>
    );
  }

  const titulo = TITULO_DO_BOTAO[modo];

  return (
    <Screen scroll contentStyle={styles.conteudo}>
      {cabecalho}
      <Text variant="support" color="mute">
        Entre para guardar a agenda, os registros e as ações na nuvem e ver tudo em outro aparelho.
        Sem conta, tudo continua salvo só neste aparelho.
      </Text>

      <Card style={styles.cartao}>
        {modo === "recuperar" ? (
          <>
            <Text variant="section" accessibilityRole="header">
              Esqueci a senha
            </Text>
            <Text variant="support" color="mute">
              Enviaremos um link para o seu e-mail para criar uma nova senha.
            </Text>
          </>
        ) : (
          <SegmentedControl<ModoDoFormulario>
            accessibilityLabel="Entrar ou criar conta"
            value={modo}
            onChange={trocarModo}
            options={[
              { value: "entrar", label: "Entrar" },
              { value: "criar", label: "Criar conta" },
            ]}
          />
        )}

        <Campo
          rotulo="E-mail"
          valor={email}
          aoMudar={setEmail}
          teclado="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          maxLength={EMAIL_MAX}
          placeholder="nome@exemplo.com"
          erro={erros.email}
        />
        {modo !== "recuperar" ? (
          <Campo
            rotulo="Senha"
            valor={senha}
            aoMudar={setSenha}
            seguro
            autoCapitalize="none"
            autoComplete={modo === "criar" ? "new-password" : "current-password"}
            textContentType={modo === "criar" ? "newPassword" : "password"}
            maxLength={SENHA_MAX}
            placeholder={modo === "criar" ? "Pelo menos 8 caracteres" : undefined}
            erro={erros.senha}
          />
        ) : null}

        {erroGeral ? (
          <Text variant="support" color="accentText" weight={600} accessibilityRole="alert">
            {erroGeral}
          </Text>
        ) : null}
        {aviso ? (
          <Text variant="support" testID="aviso-da-conta">
            {aviso}
          </Text>
        ) : null}

        {modo === "criar" ? (
          <View style={styles.aceite}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel={TEXTO_DO_ACEITE}
              accessibilityState={{ checked: aceitouTermos }}
              onPress={() => setAceitouTermos((atual) => !atual)}
              style={styles.caixaAlvo}
              testID="aceite-dos-termos"
            >
              <View
                style={[
                  styles.caixa,
                  {
                    borderColor: colors.ink,
                    backgroundColor: aceitouTermos ? colors.ink : "transparent",
                  },
                ]}
              >
                {aceitouTermos ? <Icon name="check" color={colors.onInk} size={16} /> : null}
              </View>
            </Pressable>
            <Text variant="support" style={styles.textoDoAceite}>
              {"Li e aceito os "}
              <Text
                variant="support"
                color="accentText"
                weight={600}
                accessibilityRole="link"
                onPress={() => navigation.navigate("Termos")}
                style={styles.link}
              >
                Termos de Uso
              </Text>
              {" e a "}
              <Text
                variant="support"
                color="accentText"
                weight={600}
                accessibilityRole="link"
                onPress={() => navigation.navigate("Privacidade")}
                style={styles.link}
              >
                Política de Privacidade
              </Text>
            </Text>
          </View>
        ) : null}

        <BotaoTexto
          rotulo={enviando ? titulo.enviando : titulo.parado}
          aoPressionar={() => void enviar()}
          variante="primario"
          desabilitado={enviando || (modo === "criar" && !aceitouTermos)}
        />

        <View style={styles.links}>
          {modo === "entrar" ? (
            <BotaoTexto
              rotulo="Esqueci a senha"
              aoPressionar={() => trocarModo("recuperar")}
              variante="link"
            />
          ) : null}
          {modo === "recuperar" ? (
            <BotaoTexto
              rotulo="Voltar para entrar"
              aoPressionar={() => trocarModo("entrar")}
              variante="link"
            />
          ) : null}
        </View>
      </Card>

      <View style={styles.legais}>
        <BotaoTexto
          rotulo="Termos de Uso"
          aoPressionar={() => navigation.navigate("Termos")}
          variante="link"
        />
        <BotaoTexto
          rotulo="Política de Privacidade"
          aoPressionar={() => navigation.navigate("Privacidade")}
          variante="link"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  conteudo: { gap: SPACING.gap, paddingBottom: SPACING.xxl },
  cartao: { gap: SPACING.md },
  links: { alignItems: "center" },
  legais: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center" },
  aceite: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  caixaAlvo: {
    width: SIZES.touchMin,
    height: SIZES.touchMin,
    alignItems: "center",
    justifyContent: "center",
  },
  caixa: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderRadius: RADIUS.field / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  textoDoAceite: { flex: 1 },
  link: { textDecorationLine: "underline" },
});
