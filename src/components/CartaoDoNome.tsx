import { useState } from "react";
import { StyleSheet } from "react-native";
import { NOME_MAX } from "../domain/perfil";
import { usePerfil } from "../hooks/usePerfil";
import { SPACING } from "../styles/theme";
import { Card } from "../ui/Card";
import { Text } from "../ui/Text";
import BotaoTexto from "./BotaoTexto";
import Campo from "./Campo";

/**
 * Pede o nome a quem entrou com uma conta criada antes do cadastro pedir o nome. Some assim que
 * o nome é salvo; ele vai para o Perfil, para a saudação e para a nuvem na próxima sincronização.
 */
export default function CartaoDoNome() {
  const { salvarNome } = usePerfil();
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  function salvar() {
    const resultado = salvarNome(nome);
    setErro(resultado.ok ? null : resultado.erro);
  }

  return (
    <Card style={styles.cartao} testID="cartao-do-nome">
      <Text variant="section" accessibilityRole="header">
        Como você quer ser chamado?
      </Text>
      <Campo
        rotulo="Seu nome"
        valor={nome}
        aoMudar={setNome}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        maxLength={NOME_MAX}
        placeholder="Ex.: Ana"
        teclaDeAcao="done"
        aoConfirmar={salvar}
        erro={erro}
      />
      <BotaoTexto rotulo="Salvar nome" aoPressionar={salvar} variante="primario" />
    </Card>
  );
}

const styles = StyleSheet.create({
  cartao: { gap: SPACING.md },
});
