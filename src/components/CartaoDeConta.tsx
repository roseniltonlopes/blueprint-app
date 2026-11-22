import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useAcoes } from "../hooks/useAcoes";
import { useConta } from "../hooks/useConta";
import { useSincronizacao } from "../hooks/useSincronizacao";
import { textoDoEstado } from "../sincronizacao/estado";
import { SPACING } from "../styles/theme";
import { Card } from "../ui/Card";
import { Text } from "../ui/Text";
import BotaoTexto from "./BotaoTexto";

type CartaoDeContaProps = {
  /** Abre a tela de entrar ou criar conta */
  aoAbrirConta: () => void;
};

/** Conta na nuvem no Perfil: entrar, estado da sincronização, sincronizar agora e sair. */
export default function CartaoDeConta({ aoAbrirConta }: CartaoDeContaProps) {
  const { estado: conta } = useConta();
  const { estado, ultimaSincronizacao, sincronizarAgora, confirmarTroca, cancelarTroca, sair } =
    useSincronizacao();
  const { relogio } = useAcoes();
  const [perguntandoSaida, setPerguntandoSaida] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function executar(tarefa: () => Promise<void>) {
    if (ocupado) return;
    setOcupado(true);
    setErro(null);
    try {
      await tarefa();
    } finally {
      setOcupado(false);
    }
  }

  async function sairDaConta(manterDados: boolean) {
    await executar(async () => {
      const resultado = await sair({ manterDados });
      if (resultado.ok) {
        setPerguntandoSaida(false);
      } else {
        setErro(resultado.erro);
      }
    });
  }

  if (conta.situacao === "indisponivel") {
    return (
      <Card radius="category" style={styles.cartao} testID="cartao-da-conta">
        <Text variant="body">Conta na nuvem</Text>
        <Text variant="support" color="mute">
          A conta na nuvem não está disponível nesta versão. Os dados ficam salvos neste aparelho.
        </Text>
      </Card>
    );
  }

  if (conta.situacao === "carregando") {
    return (
      <Card radius="category" style={styles.cartao} testID="cartao-da-conta">
        <Text variant="body">Conta na nuvem</Text>
        <Text variant="support" color="mute">
          Verificando a conta.
        </Text>
      </Card>
    );
  }

  if (conta.situacao === "desconectado") {
    return (
      <Card radius="category" style={styles.cartao} testID="cartao-da-conta">
        <Text variant="body">Sem conta</Text>
        <Text variant="support" color="mute">
          Os dados ficam só neste aparelho. Entre para guardar na nuvem e usar em outro aparelho.
        </Text>
        <BotaoTexto
          rotulo="Entrar ou criar conta"
          aoPressionar={aoAbrirConta}
          variante="primario"
        />
      </Card>
    );
  }

  const textoDeEstado = textoDoEstado(estado, ultimaSincronizacao, relogio());
  const sincronizando = estado.tipo === "sincronizando";

  return (
    <Card radius="category" style={styles.cartao} testID="cartao-da-conta">
      <Text variant="body" numberOfLines={1}>
        {conta.sessao.email}
      </Text>
      {textoDeEstado ? (
        <Text
          variant="support"
          color={estado.tipo === "falhou" || estado.tipo === "pausada" ? "accentText" : "mute"}
          weight={estado.tipo === "falhou" ? 600 : undefined}
          testID="estado-da-sincronizacao"
          accessibilityLiveRegion="polite"
        >
          {textoDeEstado}
        </Text>
      ) : null}

      {erro ? (
        <Text variant="support" color="accentText" weight={600} accessibilityRole="alert">
          {erro}
        </Text>
      ) : null}

      {estado.tipo === "confirmarTroca" ? (
        <View style={styles.botoes}>
          <Text variant="caption" color="mute">
            Os dados que estão neste aparelho são de outra conta e não serão misturados.
          </Text>
          <BotaoTexto
            rotulo="Trocar os dados"
            aoPressionar={() => void executar(confirmarTroca)}
            variante="primario"
            desabilitado={ocupado}
          />
          <BotaoTexto
            rotulo="Cancelar e sair"
            aoPressionar={() => void executar(cancelarTroca)}
            desabilitado={ocupado}
          />
        </View>
      ) : perguntandoSaida ? (
        <View style={styles.botoes}>
          <Text variant="support">Manter os dados neste aparelho?</Text>
          <Text variant="caption" color="mute">
            Se manter, eles continuam aqui e voltam a sincronizar quando você entrar nesta conta. Se
            apagar, saem deste aparelho (continuam na nuvem).
          </Text>
          <BotaoTexto
            rotulo="Manter e sair"
            aoPressionar={() => void sairDaConta(true)}
            variante="primario"
            desabilitado={ocupado}
          />
          <BotaoTexto
            rotulo="Apagar e sair"
            aoPressionar={() => void sairDaConta(false)}
            desabilitado={ocupado}
          />
          <BotaoTexto
            rotulo="Cancelar"
            aoPressionar={() => setPerguntandoSaida(false)}
            variante="link"
          />
        </View>
      ) : (
        <View style={styles.botoes}>
          <BotaoTexto
            rotulo={sincronizando ? "Sincronizando" : "Sincronizar agora"}
            aoPressionar={() => void executar(sincronizarAgora)}
            desabilitado={sincronizando || ocupado || estado.tipo === "pausada"}
          />
          <BotaoTexto
            rotulo="Sair"
            aoPressionar={() => setPerguntandoSaida(true)}
            variante="link"
            desabilitado={sincronizando}
          />
          <Text variant="caption" color="mute">
            A foto do perfil ainda fica só neste aparelho.
          </Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  cartao: { gap: SPACING.sm },
  botoes: { gap: SPACING.sm },
});
