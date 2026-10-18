import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import BotaoAcao from "../components/BotaoAcao";
import BotaoOpcao from "../components/BotaoOpcao";
import CartaoProgresso from "../components/CartaoProgresso";
import ChaveDeTema from "../components/ChaveDeTema";
import OutraAcaoSheet from "../components/OutraAcaoSheet";
import Toast from "../components/Toast";
import { META_DIARIA_PADRAO, type Acao } from "../domain/acoes";
import {
  CATEGORIAS_FIXAS,
  CATEGORIA_OUTRO,
  nomeDaCategoria,
  type CategoriaId,
} from "../domain/categorias";
import { formatarDataCabecalho, formatarHora } from "../domain/datas";
import { useAcoes } from "../hooks/useAcoes";
import { SPACING } from "../styles/theme";
import { cascata, entrada } from "../ui/motion";
import { Screen } from "../ui/Screen";
import { Text } from "../ui/Text";

type Confirmacao = {
  acaoId: string;
  mensagem: string;
};

function mensagemDeConfirmacao(acao: Acao): string {
  const nome = acao.rotulo ?? nomeDaCategoria(acao.categoria);
  return `${nome} registrado às ${formatarHora(new Date(acao.criadoEm))}`;
}

/** Home (docs/03, telas 2 a 5; docs/05, F01 a F07 e F09). */
export default function HomeScreen() {
  const { totalHoje, porCategoriaHoje, registrar, remover, relogio } = useAcoes();
  const [selecionada, setSelecionada] = useState<CategoriaId | null>(null);
  const [sheetAberto, setSheetAberto] = useState(false);
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);
  // Bloqueia toques repetidos antes do React aplicar a limpeza da seleção.
  const registrando = useRef(false);

  useEffect(() => {
    registrando.current = false;
  }, [selecionada]);

  function confirmarRegistro(acao: Acao) {
    setConfirmacao({ acaoId: acao.id, mensagem: mensagemDeConfirmacao(acao) });
  }

  function aoRegistrar() {
    if (selecionada === null || registrando.current) {
      return;
    }
    registrando.current = true;
    confirmarRegistro(registrar(selecionada));
    setSelecionada(null);
  }

  function aoRegistrarOutro(rotulo: string) {
    setSheetAberto(false);
    confirmarRegistro(registrar("outro", rotulo));
  }

  function abrirOutro() {
    setSelecionada(null);
    setSheetAberto(true);
  }

  function desfazer() {
    if (confirmacao) {
      remover(confirmacao.acaoId);
    }
    setConfirmacao(null);
  }

  const fecharToast = useCallback(() => setConfirmacao(null), []);

  const hoje = relogio();
  const tituloBotao = selecionada
    ? `Registrar ${nomeDaCategoria(selecionada)}`
    : "Escolha uma categoria para registrar";

  return (
    <Screen
      scroll
      footer={
        <Animated.View entering={entrada(500)}>
          {confirmacao ? (
            <View style={styles.areaToast} pointerEvents="box-none">
              <Toast
                key={confirmacao.acaoId}
                mensagem={confirmacao.mensagem}
                aoDesfazer={desfazer}
                aoSumir={fecharToast}
              />
            </View>
          ) : null}
          <BotaoAcao
            titulo={tituloBotao}
            desabilitado={selecionada === null}
            aoPressionar={aoRegistrar}
          />
        </Animated.View>
      }
    >
      <Animated.View entering={entrada(0)} style={styles.cabecalho}>
        <View style={styles.saudacao}>
          <Text variant="support" color="mute">
            {formatarDataCabecalho(hoje)}
          </Text>
          <Text variant="h1" accessibilityRole="header">
            Olá!
          </Text>
        </View>
        <ChaveDeTema />
      </Animated.View>

      <Animated.View entering={entrada(80)} style={styles.progresso}>
        <CartaoProgresso total={totalHoje} meta={META_DIARIA_PADRAO} />
      </Animated.View>

      <Animated.View entering={entrada(160)}>
        <Text variant="section" accessibilityRole="header" style={styles.tituloSecao}>
          O que você fez agora?
        </Text>
      </Animated.View>

      <View style={styles.grade}>
        {[CATEGORIAS_FIXAS.slice(0, 2), CATEGORIAS_FIXAS.slice(2, 4)].map((linha, l) => (
          <View key={linha[0].id} style={styles.linhaGrade}>
            {linha.map((categoria, c) => (
              <Animated.View
                key={categoria.id}
                entering={entrada(cascata(l * 2 + c, 200))}
                style={styles.celula}
              >
                <BotaoOpcao
                  titulo={categoria.nome}
                  subtitulo={`${porCategoriaHoje[categoria.id]} hoje`}
                  icone={categoria.id}
                  selecionado={selecionada === categoria.id}
                  aoPressionar={() => setSelecionada(categoria.id)}
                />
              </Animated.View>
            ))}
          </View>
        ))}
        <Animated.View entering={entrada(cascata(4, 200))}>
          <BotaoOpcao
            formato="linha"
            titulo={CATEGORIA_OUTRO.nome}
            subtitulo={
              porCategoriaHoje.outro > 0 ? `${porCategoriaHoje.outro} hoje` : "Algo fora da lista"
            }
            icone="outro"
            selecionado={false}
            aoPressionar={abrirOutro}
          />
        </Animated.View>
      </View>

      {sheetAberto ? (
        <OutraAcaoSheet aoFechar={() => setSheetAberto(false)} aoRegistrar={aoRegistrarOutro} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.md,
  },
  saudacao: { flex: 1, minWidth: 0 },
  progresso: { marginTop: 18 },
  tituloSecao: { marginTop: 22, marginBottom: 10 },
  grade: { gap: SPACING.gap },
  linhaGrade: { flexDirection: "row", gap: SPACING.gap },
  celula: { flex: 1 },
  areaToast: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: "100%",
    marginBottom: SPACING.md,
  },
});
