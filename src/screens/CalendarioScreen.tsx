import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import CalendarioMensal, { LegendaDoCumprimento } from "../components/CalendarioMensal";
import { CompromissosDoDia } from "../components/HojeNaAgenda";
import Resumo from "../components/Resumo";
import Toast from "../components/Toast";
import { acoesDoDia, contarPorCategoria } from "../domain/acoes";
import { planoDoDia, planoDoMes, resumoDoPlano } from "../domain/calendario";
import { CATEGORIAS } from "../domain/categorias";
import {
  MESES,
  chaveDoDia,
  formatarDataCabecalho,
  formatarDiaMes,
  formatarMesAno,
  inicioDoDia,
} from "../domain/datas";
import { mensagemDaMarcacao } from "../domain/registros";
import { plural } from "../domain/texto";
import { useAcoes } from "../hooks/useAcoes";
import { useAgenda, type Marcacao } from "../hooks/useAgenda";
import type { AbasParamList } from "../navigation/Abas";
import type { RaizParamList } from "../navigation/Raiz";
import { tocarHaptica } from "../services/haptica";
import { RADIUS, SIZES, SPACING } from "../styles/theme";
import { useTheme } from "../theme/ThemeProvider";
import { Card } from "../ui/Card";
import { Icon } from "../ui/Icon";
import { entrada } from "../ui/motion";
import { Screen } from "../ui/Screen";
import { Text } from "../ui/Text";

type Props = CompositeScreenProps<
  BottomTabScreenProps<AbasParamList, "Calendario">,
  NativeStackScreenProps<RaizParamList>
>;

type Confirmacao = { chave: number; mensagem: string; desfazer: () => void };

function tituloDoDia(dia: Date, hoje: Date): string {
  return chaveDoDia(dia) === chaveDoDia(hoje)
    ? `Hoje, ${formatarDiaMes(dia)}`
    : formatarDataCabecalho(dia);
}

/**
 * Calendário (docs/03 tela 6; docs/05 F11 e F12) ligado à Agenda: cada dia mostra quanto do
 * plano foi cumprido. Tocar num dia abre os compromissos dele (com Feito e Não fiz), os hábitos
 * registrados e o atalho para adicionar um compromisso só naquele dia.
 */
export default function CalendarioScreen({ navigation }: Partial<Props>) {
  const { acoes, relogio } = useAcoes();
  const { dados, desfazerMarcacao } = useAgenda();
  const { colors } = useTheme();
  const hoje = relogio();
  const [mesVisivel, setMesVisivel] = useState({ ano: hoje.getFullYear(), mes: hoje.getMonth() });
  const [selecionado, setSelecionado] = useState(() => inicioDoDia(hoje));
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);
  const contador = useRef(0);

  const planoPorDia = useMemo(
    () => planoDoMes(dados, mesVisivel.ano, mesVisivel.mes),
    [dados, mesVisivel.ano, mesVisivel.mes],
  );
  const resumo = resumoDoPlano(planoPorDia, hoje);
  const chaveSelecionado = chaveDoDia(selecionado);
  const planoSelecionado = planoDoDia(dados, selecionado);
  const habitos = useMemo(
    () => contarPorCategoria(acoesDoDia(acoes, chaveSelecionado)),
    [acoes, chaveSelecionado],
  );
  const totalDeHabitos = CATEGORIAS.reduce((soma, c) => soma + habitos[c.id], 0);
  const futuro = chaveSelecionado > chaveDoDia(hoje);
  const acoesDoMes = useMemo(() => {
    const prefixo = `${mesVisivel.ano}-${String(mesVisivel.mes + 1).padStart(2, "0")}`;
    return acoes.filter((acao) => chaveDoDia(new Date(acao.criadoEm)).startsWith(prefixo)).length;
  }, [acoes, mesVisivel.ano, mesVisivel.mes]);

  function mudarMes(delta: number) {
    setMesVisivel(({ ano, mes }) => {
      const alvo = new Date(ano, mes + delta, 1);
      return { ano: alvo.getFullYear(), mes: alvo.getMonth() };
    });
  }

  function aoMarcar(marcacao: Marcacao) {
    const status = marcacao.atual?.status ?? null;
    tocarHaptica(status === "feito" ? "confirmar" : status === "nao_fui" ? "rejeitar" : "selecao");
    const nome = marcacao.atual?.nomeAtividade ?? marcacao.anterior?.nomeAtividade ?? "";
    contador.current += 1;
    setConfirmacao({
      chave: contador.current,
      mensagem: mensagemDaMarcacao(nome, status),
      desfazer: () => desfazerMarcacao(marcacao),
    });
  }

  const fecharToast = useCallback(() => setConfirmacao(null), []);

  function desfazer() {
    tocarHaptica("selecao");
    confirmacao?.desfazer();
    setConfirmacao(null);
  }

  const situacaoDoDia =
    planoSelecionado.planejados === 0
      ? "Sem compromissos"
      : futuro
        ? plural(planoSelecionado.planejados, "planejado", "planejados")
        : `${planoSelecionado.feitos} de ${planoSelecionado.planejados} feitos`;

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
      <Animated.View entering={entrada(0)}>
        <Text variant="h1" accessibilityRole="header">
          Calendário
        </Text>
        <Text variant="support" color="mute">
          O plano da Agenda, dia a dia: a cor mostra quanto foi cumprido.
        </Text>
      </Animated.View>

      <Animated.View entering={entrada(50)} style={styles.navegacao}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mês anterior"
          onPress={() => mudarMes(-1)}
          style={styles.seta}
        >
          <Icon name="anterior" color={colors.ink} />
        </Pressable>
        <Text variant="cardTitle" accessibilityRole="header">
          {formatarMesAno(mesVisivel.ano, mesVisivel.mes)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Próximo mês"
          onPress={() => mudarMes(1)}
          style={styles.seta}
        >
          <Icon name="proximo" color={colors.ink} />
        </Pressable>
      </Animated.View>

      <CalendarioMensal
        key={`${mesVisivel.ano}-${mesVisivel.mes}`}
        ano={mesVisivel.ano}
        mes={mesVisivel.mes}
        planoPorDia={planoPorDia}
        hoje={hoje}
        selecionado={selecionado}
        aoSelecionar={setSelecionado}
      />
      <LegendaDoCumprimento />

      <Animated.View entering={entrada(450)} style={styles.detalhe}>
        <View style={styles.tituloDia}>
          <Text variant="cardTitle" accessibilityRole="header" style={styles.flex}>
            {tituloDoDia(selecionado, hoje)}
          </Text>
          <Text variant="support" color="mute" testID="situacao-do-dia">
            {situacaoDoDia}
          </Text>
        </View>

        <CompromissosDoDia key={chaveSelecionado} dia={selecionado} aoMarcar={aoMarcar} />

        {totalDeHabitos > 0 ? (
          <Card style={styles.cartaoHabitos}>
            <Text variant="support" weight={600}>
              {`Hábitos: ${plural(totalDeHabitos, "ação", "ações")}`}
            </Text>
            <View style={styles.chips}>
              {CATEGORIAS.filter((c) => habitos[c.id] > 0).map((categoria) => (
                <View key={categoria.id} style={[styles.chip, { backgroundColor: colors.sunk }]}>
                  <Icon name={categoria.id} color={colors.ink} size={16} />
                  <Text variant="support" weight={500}>
                    {`${categoria.nome} ${habitos[categoria.id]}`}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        ) : planoSelecionado.planejados === 0 ? (
          <Text variant="support" color="mute">
            {futuro ? "Nada planejado para este dia." : "Nenhum compromisso nem hábito neste dia."}
          </Text>
        ) : null}

        {navigation ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Adicionar compromisso em ${formatarDiaMes(selecionado)}`}
            onPress={() =>
              navigation.navigate("Compromisso", { data: chaveSelecionado, avulso: true })
            }
            style={[styles.adicionar, { borderColor: colors.hair }]}
          >
            <Icon name="mais" color={colors.ink} size={18} />
            <Text variant="support" weight={600}>
              Adicionar neste dia
            </Text>
          </Pressable>
        ) : null}
      </Animated.View>

      <Animated.View entering={entrada(520)}>
        <Resumo
          itens={[
            {
              valor: resumo.percentual === null ? "–" : `${resumo.percentual}%`,
              rotulo: `do plano cumprido em ${MESES[mesVisivel.mes]}`,
            },
            { valor: String(acoesDoMes), rotulo: "ações de hábito" },
          ]}
        />
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  conteudo: { gap: SPACING.md },
  navegacao: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  seta: {
    width: SIZES.touchMin,
    height: SIZES.touchMin,
    alignItems: "center",
    justifyContent: "center",
  },
  detalhe: { gap: SPACING.md, marginTop: SPACING.xs },
  tituloDia: { flexDirection: "row", alignItems: "baseline", gap: SPACING.sm },
  flex: { flex: 1 },
  cartaoHabitos: { gap: SPACING.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  chip: {
    minHeight: 34,
    paddingLeft: 10,
    paddingRight: 12,
    borderRadius: RADIUS.pill,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  adicionar: {
    minHeight: SIZES.touchMin,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: RADIUS.button,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
  },
});
