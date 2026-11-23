import { useRef, useState } from "react";
import { Pressable, StyleSheet, View, type TextInput } from "react-native";
import {
  EMAIL_MAX,
  SENHA_MAX,
  formularioValido,
  mascararData,
  nascimentoParaIso,
  normalizarEmail,
  validarFormularioDeConta,
  type ErrosDoFormulario,
  type ModoDoFormulario,
} from "../domain/conta";
import { useConta } from "../hooks/useConta";
import { NOME_MAX, normalizarNome } from "../domain/perfil";
import { usePerfil } from "../hooks/usePerfil";
import { VERSAO_DOS_TERMOS } from "../legal/textos";
import { RADIUS, SIZES, SPACING } from "../styles/theme";
import { useTheme } from "../theme/ThemeProvider";
import { Card } from "../ui/Card";
import { Icon } from "../ui/Icon";
import { SegmentedControl } from "../ui/SegmentedControl";
import { Text } from "../ui/Text";
import BotaoTexto from "./BotaoTexto";
import Campo from "./Campo";

export const TEXTO_DO_ACEITE = "Li e aceito os Termos de Uso e a Política de Privacidade";

const TITULO_DO_BOTAO: Record<ModoDoFormulario, { parado: string; enviando: string }> = {
  entrar: { parado: "Entrar", enviando: "Entrando" },
  criar: { parado: "Criar conta", enviando: "Criando conta" },
  recuperar: { parado: "Enviar link", enviando: "Enviando" },
};

type FormularioDeContaProps = {
  /** Chamado quando a pessoa entra (ou cria a conta já entrando) */
  aoEntrar: () => void;
  aoAbrirTermos: () => void;
  aoAbrirPrivacidade: () => void;
};

/**
 * Formulário de conta: entrar, criar conta (com o aceite dos termos) e recuperar a senha.
 * Usado na tela de entrada do app e na tela Conta do Perfil.
 */
export default function FormularioDeConta({
  aoEntrar,
  aoAbrirTermos,
  aoAbrirPrivacidade,
}: FormularioDeContaProps) {
  const { entrar, criarConta, recuperarSenha } = useConta();
  const { colors } = useTheme();
  const { perfil, salvarNome } = usePerfil();
  const [modo, setModo] = useState<ModoDoFormulario>("entrar");
  const [nome, setNome] = useState(perfil.nome);
  const [nascimento, setNascimento] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erros, setErros] = useState<ErrosDoFormulario>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const campoNascimento = useRef<TextInput>(null);
  const campoEmail = useRef<TextInput>(null);
  const campoSenha = useRef<TextInput>(null);

  function trocarModo(novo: ModoDoFormulario) {
    setModo(novo);
    setErros({});
    setErroGeral(null);
    setAviso(null);
  }

  async function enviar() {
    if (enviando) return;
    const encontrados = validarFormularioDeConta(modo, { email, senha, nome, nascimento });
    setErros(encontrados);
    setErroGeral(null);
    setAviso(null);
    if (!formularioValido(encontrados)) return;

    setEnviando(true);
    if (modo === "entrar") {
      const resultado = await entrar(email, senha);
      setEnviando(false);
      if (resultado.ok) {
        aoEntrar();
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
        nome: normalizarNome(nome),
        nascimento: nascimentoParaIso(nascimento),
        termosVersao: VERSAO_DOS_TERMOS,
      });
      setEnviando(false);
      if (!resultado.ok) {
        setErroGeral(resultado.erro);
        return;
      }
      // O nome já aparece no Perfil e na tela Hoje, mesmo antes da primeira sincronização.
      salvarNome(nome);
      if (resultado.valor === "conectado") {
        aoEntrar();
      } else {
        setModo("entrar");
        setSenha("");
        setAviso(
          `Enviamos um link para ${normalizarEmail(email)}. Confirme o e-mail e depois entre.`,
        );
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

  const titulo = TITULO_DO_BOTAO[modo];

  return (
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

      {modo === "criar" ? (
        <>
          <Campo
            rotulo="Nome"
            valor={nome}
            aoMudar={setNome}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            maxLength={NOME_MAX}
            placeholder="Como você quer ser chamado"
            teclaDeAcao="next"
            aoConfirmar={() => campoNascimento.current?.focus()}
            erro={erros.nome}
            testID="campo-nome"
          />
          <Campo
            ref={campoNascimento}
            rotulo="Data de nascimento"
            valor={nascimento}
            aoMudar={(texto) => setNascimento(mascararData(texto))}
            teclado="number-pad"
            autoComplete="birthdate-full"
            maxLength={10}
            placeholder="DD/MM/AAAA"
            teclaDeAcao="next"
            aoConfirmar={() => campoEmail.current?.focus()}
            erro={erros.nascimento}
            testID="campo-nascimento"
          />
        </>
      ) : null}

      <Campo
        ref={campoEmail}
        rotulo="E-mail"
        valor={email}
        aoMudar={setEmail}
        teclado="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        maxLength={EMAIL_MAX}
        placeholder="nome@exemplo.com"
        teclaDeAcao={modo === "recuperar" ? "send" : "next"}
        aoConfirmar={modo === "recuperar" ? () => void enviar() : () => campoSenha.current?.focus()}
        erro={erros.email}
        testID="campo-email"
      />
      {modo !== "recuperar" ? (
        <Campo
          ref={campoSenha}
          rotulo="Senha"
          valor={senha}
          aoMudar={setSenha}
          seguro
          autoCapitalize="none"
          autoComplete={modo === "criar" ? "new-password" : "current-password"}
          textContentType={modo === "criar" ? "newPassword" : "password"}
          maxLength={SENHA_MAX}
          placeholder={modo === "criar" ? "Mínimo 8, letras e números" : undefined}
          teclaDeAcao={modo === "criar" ? "next" : "go"}
          aoConfirmar={modo === "entrar" ? () => void enviar() : undefined}
          erro={erros.senha}
          testID="campo-senha"
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
              onPress={aoAbrirTermos}
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
              onPress={aoAbrirPrivacidade}
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
  );
}

const styles = StyleSheet.create({
  cartao: { gap: SPACING.md },
  links: { alignItems: "center" },
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
