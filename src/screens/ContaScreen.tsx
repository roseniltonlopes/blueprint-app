import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, View } from "react-native";
import BotaoTexto from "../components/BotaoTexto";
import CabecalhoDeTela from "../components/CabecalhoDeTela";
import FormularioDeConta from "../components/FormularioDeConta";
import { useConta } from "../hooks/useConta";
import type { RaizParamList } from "../navigation/Raiz";
import { SPACING } from "../styles/theme";
import { Card, Screen, Text } from "../ui";

type Props = NativeStackScreenProps<RaizParamList, "Conta">;

/** Entrar, criar conta (e-mail e senha) e recuperar a senha. Aberta pelo cartão da conta no Perfil. */
export default function ContaScreen({ navigation }: Props) {
  const { estado } = useConta();
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

  return (
    <Screen scroll contentStyle={styles.conteudo}>
      {cabecalho}
      <Text variant="support" color="mute">
        Entre para guardar a agenda, os registros e as ações na nuvem e ver tudo em outro aparelho.
      </Text>

      <FormularioDeConta
        aoEntrar={() => navigation.goBack()}
        aoAbrirTermos={() => navigation.navigate("Termos")}
        aoAbrirPrivacidade={() => navigation.navigate("Privacidade")}
      />

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
  legais: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center" },
});
