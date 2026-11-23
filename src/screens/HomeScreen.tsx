import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import AvatarDoPerfil from "../components/AvatarDoPerfil";
import CartaoAgora from "../components/CartaoAgora";
import CartaoDoNome from "../components/CartaoDoNome";
import CartaoProgresso from "../components/CartaoProgresso";
import HojeNaAgenda from "../components/HojeNaAgenda";
import OutraAcaoSheet from "../components/OutraAcaoSheet";
import RegistroRapido from "../components/RegistroRapido";
import Toast from "../components/Toast";
import type { Acao } from "../domain/acoes";
import { nomeDaCategoria, type CategoriaId } from "../domain/categorias";
import { chaveDoDia, formatarDataCabecalho, formatarHora } from "../domain/datas";
import { contarPorDia, sequenciaAtual } from "../domain/estatisticas";
import { destaqueDoDia, saudacao } from "../domain/hoje";
import { primeiroNome } from "../domain/perfil";
import { mensagemDaMarcacao, type StatusDoRegistro } from "../domain/registros";
import { useAcoes } from "../hooks/useAcoes";
import { useAgenda, type Marcacao } from "../hooks/useAgenda";
import { useConta } from "../hooks/useConta";
import { usePerfil } from "../hooks/usePerfil";
import { useSincronizacao } from "../hooks/useSincronizacao";
import type { AbasParamList } from "../navigation/Abas";
import { tocarHaptica } from "../services/haptica";
import { SIZES, SPACING } from "../styles/theme";
import { entrada } from "../ui/motion";
import { Screen } from "../ui/Screen";
import { Text } from "../ui/Text";

type Confirmacao = {
  /** Muda a cada confirmação, para o toast reiniciar a contagem */
  chave: number;
  mensagem: string;
  desfazer: () => void;
};

function mensagemDeConfirmacao(acao: Acao): string {
  const nome = acao.rotulo ?? nomeDaCategoria(acao.categoria);
  return `${nome} registrado às ${formatarHora(new Date(acao.criadoEm))}`;
}

/** Fora do navegador (testes da tela isolada) não há `navigation`; os atalhos ficam sem destino. */
type HomeScreenProps = Partial<BottomTabScreenProps<AbasParamList, "Hoje">>;

/**
 * Home: o compromisso de agora em destaque, o progresso do dia, a linha do dia com Feito e
 * Não fiz (toque ou gesto) e o registro rápido de hábitos com 1 toque (docs/05, F01 a F07).
 */
export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { acoes, porCategoriaHoje, totalHoje, meta, registrar, remover, relogio } = useAcoes();
  const { dados, ocorrenciasDe, marcar, desfazerMarcacao } = useAgenda();
  const { perfil, nomeExibido } = usePerfil();
  const { estado: conta } = useConta();
  const { estado: sincronizacao } = useSincronizacao();
  const [sheetAberto, setSheetAberto] = useState(false);
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);
  const [erroDoDestaque, setErroDoDestaque] = useState<string | null>(null);
  const contadorDeConfirmacoes = useRef(0);

  const hoje = relogio();
  const chaveHoje = chaveDoDia(hoje);
  const porDia = useMemo(() => contarPorDia(acoes), [acoes]);
  const sequencia = sequenciaAtual(porDia, hoje);
  const destaque = destaqueDoDia(ocorrenciasDe(hoje), dados.registros, chaveHoje, hoje);
  const nome = primeiroNome(perfil);
  // Conta criada antes do cadastro pedir o nome: depois de conferir a nuvem, ainda sem nome.
  const pedirNome =
    conta.situacao === "conectado" &&
    nome.length === 0 &&
    (sincronizacao.tipo === "sincronizada" || sincronizacao.tipo === "falhou");

  function confirmar(mensagem: string, desfazer: () => void) {
    contadorDeConfirmacoes.current += 1;
    setConfirmacao({ chave: contadorDeConfirmacoes.current, mensagem, desfazer });
  }

  function confirmarRegistro(acao: Acao) {
    tocarHaptica("confirmar");
    confirmar(mensagemDeConfirmacao(acao), () => remover(acao.id));
  }

  function confirmarMarcacao(marcacao: Marcacao) {
    const status = marcacao.atual?.status ?? null;
    tocarHaptica(status === "feito" ? "confirmar" : status === "nao_fui" ? "rejeitar" : "selecao");
    const nome = marcacao.atual?.nomeAtividade ?? marcacao.anterior?.nomeAtividade ?? "";
    confirmar(mensagemDaMarcacao(nome, status), () => desfazerMarcacao(marcacao));
  }

  function marcarDestaque(status: StatusDoRegistro) {
    if (!destaque) {
      return;
    }
    const resultado = marcar(destaque.ocorrencia.chave, status, hoje);
    if (resultado.ok) {
      setErroDoDestaque(null);
      confirmarMarcacao(resultado.valor);
    } else {
      setErroDoDestaque(resultado.erro);
    }
  }

  function registrarCategoria(categoria: CategoriaId) {
    confirmarRegistro(registrar(categoria));
  }

  function aoRegistrarOutro(rotulo: string) {
    setSheetAberto(false);
    confirmarRegistro(registrar("outro", rotulo));
  }

  function desfazer() {
    tocarHaptica("selecao");
    confirmacao?.desfazer();
    setConfirmacao(null);
  }

  const fecharToast = useCallback(() => setConfirmacao(null), []);

  return (
    <Screen
      scroll
      contentStyle={styles.conteudo}
      footer={
        confirmacao ? (
          <Toast
            key={confirmacao.chave}
            mensagem={confirmacao.mensagem}
            aoDesfazer={desfazer}
            aoSumir={fecharToast}
          />
        ) : undefined
      }
    >
      <Animated.View entering={entrada(0)} style={styles.cabecalho}>
        <View style={styles.saudacao}>
          <Text variant="support" color="mute">
            {formatarDataCabecalho(hoje)}
          </Text>
          <Text variant="h1" accessibilityRole="header" numberOfLines={1}>
            {nome.length > 0 ? `${saudacao(hoje)}, ${nome}` : saudacao(hoje)}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir perfil"
          onPress={navigation ? () => navigation.navigate("Perfil") : undefined}
          style={styles.avatar}
        >
          <AvatarDoPerfil nome={nomeExibido} foto={perfil.foto} tamanho={SIZES.touchMin} />
        </Pressable>
      </Animated.View>

      {pedirNome ? (
        <Animated.View entering={entrada(40)}>
          <CartaoDoNome />
        </Animated.View>
      ) : null}

      {destaque ? (
        <Animated.View entering={entrada(60)}>
          <CartaoAgora
            destaque={destaque}
            aoMarcarFeito={() => marcarDestaque("feito")}
            aoMarcarNaoFui={() => marcarDestaque("nao_fui")}
          />
          {erroDoDestaque ? (
            <Text
              variant="caption"
              color="accentText"
              weight={600}
              accessibilityRole="alert"
              style={styles.erro}
            >
              {erroDoDestaque}
            </Text>
          ) : null}
        </Animated.View>
      ) : null}

      <Animated.View entering={entrada(100)}>
        <CartaoProgresso total={totalHoje} meta={meta} sequencia={sequencia} />
      </Animated.View>

      <Animated.View entering={entrada(140)}>
        <HojeNaAgenda
          aoMarcar={confirmarMarcacao}
          aoMontarAgenda={navigation ? () => navigation.navigate("Agenda") : undefined}
          chaveAgora={destaque?.tipo === "agora" ? destaque.ocorrencia.chave : null}
        />
      </Animated.View>

      <Animated.View entering={entrada(180)} style={styles.rapido}>
        <View style={styles.tituloRapido}>
          <Text variant="section" accessibilityRole="header">
            Registro rápido
          </Text>
          <Text variant="caption" color="mute">
            1 toque registra
          </Text>
        </View>
        <RegistroRapido
          contagem={porCategoriaHoje}
          aoRegistrar={registrarCategoria}
          aoAbrirOutro={() => setSheetAberto(true)}
        />
      </Animated.View>

      {sheetAberto ? (
        <OutraAcaoSheet aoFechar={() => setSheetAberto(false)} aoRegistrar={aoRegistrarOutro} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  conteudo: { gap: SPACING.lg, paddingBottom: SPACING.xl },
  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.md,
  },
  saudacao: { flex: 1, minWidth: 0 },
  avatar: { borderRadius: SIZES.touchMin / 2 },
  erro: { marginTop: SPACING.sm },
  rapido: { gap: SPACING.md },
  tituloRapido: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
});
