import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useConta } from "../hooks/useConta";
import { useSincronizacao } from "../hooks/useSincronizacao";
import { SPACING } from "../styles/theme";
import { Card } from "../ui/Card";
import { Text } from "../ui/Text";
import BotaoTexto from "./BotaoTexto";

type CartaoDePrivacidadeProps = {
  aoAbrirTermos: () => void;
  aoAbrirPrivacidade: () => void;
};

export const MENSAGEM_CONTA_EXCLUIDA = "Conta e dados excluídos. O app voltou ao começo.";
export const MENSAGEM_APARELHO_LIMPO = "Os dados deste aparelho foram apagados.";

/**
 * Privacidade no Perfil: os textos legais e o direito de exclusão (LGPD, art. 18). Com conta,
 * exclui a conta e os dados na nuvem e no aparelho; sem conta, apaga os dados deste aparelho.
 * As duas ações pedem confirmação; a exclusão da conta pede duas.
 */
export default function CartaoDePrivacidade({
  aoAbrirTermos,
  aoAbrirPrivacidade,
}: CartaoDePrivacidadeProps) {
  const { estado: conta } = useConta();
  const { excluirConta, apagarDadosDoAparelho } = useSincronizacao();
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const conectado = conta.situacao === "conectado";

  async function executar(tarefa: () => Promise<{ ok: boolean; erro?: string }>, sucesso: string) {
    setOcupado(true);
    setErro(null);
    setAviso(null);
    const resultado = await tarefa();
    setOcupado(false);
    if (resultado.ok) {
      setAviso(sucesso);
    } else {
      setErro(resultado.erro ?? "Não foi possível concluir. Tente de novo.");
    }
  }

  function pedirExclusaoDaConta() {
    Alert.alert(
      "Excluir a conta e os dados?",
      "Isso apaga a sua conta, a agenda, os registros e as ações na nuvem e neste aparelho. Não dá para desfazer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Continuar",
          style: "destructive",
          onPress: () =>
            Alert.alert(
              "Tem certeza?",
              `Última confirmação: a conta ${conectado ? conta.sessao.email : ""} será excluída agora.`,
              [
                { text: "Cancelar", style: "cancel" },
                {
                  text: "Excluir definitivamente",
                  style: "destructive",
                  onPress: () => void executar(excluirConta, MENSAGEM_CONTA_EXCLUIDA),
                },
              ],
            ),
        },
      ],
    );
  }

  function pedirLimpezaDoAparelho() {
    Alert.alert(
      "Apagar os dados deste aparelho?",
      "Isso apaga a agenda, os registros, as ações e o perfil guardados neste aparelho. Não dá para desfazer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Apagar",
          style: "destructive",
          onPress: () => void executar(apagarDadosDoAparelho, MENSAGEM_APARELHO_LIMPO),
        },
      ],
    );
  }

  return (
    <Card radius="category" style={styles.cartao} testID="cartao-de-privacidade">
      <View style={styles.links}>
        <BotaoTexto rotulo="Termos de Uso" aoPressionar={aoAbrirTermos} variante="link" />
        <BotaoTexto
          rotulo="Política de Privacidade"
          aoPressionar={aoAbrirPrivacidade}
          variante="link"
        />
      </View>

      {aviso ? (
        <Text variant="support" accessibilityLiveRegion="polite" testID="aviso-de-privacidade">
          {aviso}
        </Text>
      ) : null}
      {erro ? (
        <Text variant="support" color="accentText" weight={600} accessibilityRole="alert">
          {erro}
        </Text>
      ) : null}

      {conectado ? (
        <BotaoTexto
          rotulo={ocupado ? "Excluindo" : "Excluir minha conta e dados"}
          aoPressionar={pedirExclusaoDaConta}
          variante="perigo"
          desabilitado={ocupado}
        />
      ) : (
        <BotaoTexto
          rotulo={ocupado ? "Apagando" : "Apagar dados deste aparelho"}
          aoPressionar={pedirLimpezaDoAparelho}
          variante="perigo"
          desabilitado={ocupado}
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  cartao: { gap: SPACING.sm },
  links: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
});
