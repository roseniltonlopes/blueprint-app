import { useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import ReanimatedSwipeable, {
  SwipeDirection,
  type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { AGENDA_COMECA_VAZIA, rotuloDoHorario, type Ocorrencia } from "../domain/agenda";
import { chaveDoDia, somarDias } from "../domain/datas";
import {
  podeRegistrarNaData,
  registroDaOcorrencia,
  resumoDoDia,
  textoDoResumo,
  type StatusDoRegistro,
} from "../domain/registros";
import { useAgenda, type Marcacao } from "../hooks/useAgenda";
import { BRAND, RADIUS, SIZES, SPACING } from "../styles/theme";
import { useTheme } from "../theme/ThemeProvider";
import { Card } from "../ui/Card";
import { Icon } from "../ui/Icon";
import { PressableEscala } from "../ui/PressableEscala";
import { Text } from "../ui/Text";

type HojeNaAgendaProps = {
  /** Chamado depois de cada marcação, para a tela mostrar o toast com Desfazer */
  aoMarcar: (marcacao: Marcacao) => void;
  /** Leva à aba Agenda. Sem ele, o convite não mostra o botão. */
  aoMontarAgenda?: () => void;
  /** Chave da ocorrência em curso agora, destacada na linha do dia */
  chaveAgora?: string | null;
};

/** Quanto arrastar para a linha abrir a ação; abaixo disso ela volta sem marcar nada. */
const LIMIAR_DO_GESTO = 80;
const LARGURA_DA_HORA = 44;
const TAMANHO_DO_NO = 24;

type NoProps = { status: StatusDoRegistro | null; emCurso: boolean };

/** Bolinha da linha do tempo: laranja com check (Feito), cinza com x (Não fiz) ou vazia. */
function NoDaLinha({ status, emCurso }: NoProps) {
  const { colors } = useTheme();
  if (status === "feito") {
    return (
      <View style={[styles.no, { backgroundColor: colors.accent }]}>
        <Icon name="check" color={BRAND.black} size={14} strokeWidth={3} />
      </View>
    );
  }
  if (status === "nao_fui") {
    return (
      <View style={[styles.no, { backgroundColor: colors.sunk }]}>
        <Icon name="fechar" color={colors.mute} size={12} strokeWidth={3} />
      </View>
    );
  }
  return (
    <View
      style={[
        styles.no,
        styles.noVazio,
        { backgroundColor: colors.card, borderColor: emCurso ? colors.accent : colors.hair },
      ]}
    >
      {emCurso ? <View style={[styles.miolo, { backgroundColor: colors.accent }]} /> : null}
    </View>
  );
}

type LinhaProps = {
  ocorrencia: Ocorrencia;
  status: StatusDoRegistro | null;
  emCurso: boolean;
  primeira: boolean;
  ultima: boolean;
  aoTocar: (status: StatusDoRegistro) => void;
  /** Dia futuro: mostra o plano, sem Feito e Não fiz */
  somenteLeitura?: boolean;
};

function LinhaDoDia({
  ocorrencia,
  status,
  emCurso,
  primeira,
  ultima,
  aoTocar,
  somenteLeitura = false,
}: LinhaProps) {
  const { colors } = useTheme();
  const gesto = useRef<SwipeableMethods>(null);
  const nome = ocorrencia.atividade.nome;
  const horario = rotuloDoHorario(ocorrencia);
  const descricao = `${nome}, ${horario}`;
  const apoio = [ocorrencia.fim ? `até ${ocorrencia.fim}` : null, ocorrencia.detalhe ?? null]
    .filter((parte): parte is string => parte !== null)
    .join("  ·  ");
  const marcado = status !== null;

  function aoAbrir(direcao: SwipeDirection) {
    aoTocar(direcao === SwipeDirection.RIGHT ? "feito" : "nao_fui");
    gesto.current?.close();
  }

  const fio = (
    <View
      style={[
        styles.fio,
        {
          backgroundColor: colors.sunk,
          top: primeira ? "50%" : 0,
          bottom: ultima ? "50%" : 0,
        },
      ]}
    />
  );

  if (somenteLeitura) {
    return (
      <View
        style={[styles.linha, { backgroundColor: colors.card }]}
        accessible
        accessibilityLabel={`Planejado: ${descricao}`}
      >
        <Text variant="caption" color="mute" style={styles.hora}>
          {ocorrencia.inicio}
        </Text>
        <View style={styles.colunaDoNo}>
          {fio}
          <NoDaLinha status={null} emCurso={false} />
        </View>
        <View style={styles.textos}>
          <Text variant="body" numberOfLines={1}>
            {nome}
          </Text>
          {apoio ? (
            <Text variant="caption" color="mute" numberOfLines={1}>
              {apoio}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <ReanimatedSwipeable
      ref={gesto}
      friction={1.4}
      leftThreshold={LIMIAR_DO_GESTO}
      rightThreshold={LIMIAR_DO_GESTO}
      overshootLeft={false}
      overshootRight={false}
      onSwipeableOpen={aoAbrir}
      renderLeftActions={() => (
        <View style={[styles.acao, styles.acaoEsquerda, { backgroundColor: colors.accent }]}>
          <Icon name="check" color={BRAND.black} size={20} strokeWidth={2.6} />
          <Text variant="support" weight={700} style={{ color: BRAND.black }}>
            Feito
          </Text>
        </View>
      )}
      renderRightActions={() => (
        <View style={[styles.acao, styles.acaoDireita, { backgroundColor: colors.ink }]}>
          <Text variant="support" weight={700} color="onInk">
            Não fiz
          </Text>
        </View>
      )}
    >
      <View style={[styles.linha, { backgroundColor: colors.card }]}>
        <Text
          variant="caption"
          weight={emCurso ? 600 : 400}
          color={emCurso ? "ink" : "mute"}
          style={styles.hora}
        >
          {ocorrencia.inicio}
        </Text>
        <View style={styles.colunaDoNo}>
          {fio}
          <PressableEscala
            accessibilityRole="button"
            accessibilityLabel={`Feito: ${descricao}`}
            accessibilityHint={status === "feito" ? "Toque de novo para desmarcar" : undefined}
            accessibilityState={{ selected: status === "feito" }}
            onPress={() => aoTocar("feito")}
            escala={0.88}
            style={styles.alvoDoNo}
          >
            <NoDaLinha status={status} emCurso={emCurso} />
          </PressableEscala>
        </View>
        <View style={styles.textos}>
          <Text
            variant="body"
            weight={emCurso ? 600 : 500}
            color={marcado ? "mute" : "ink"}
            numberOfLines={1}
          >
            {nome}
          </Text>
          {apoio ? (
            <Text variant="caption" color="mute" numberOfLines={1}>
              {apoio}
            </Text>
          ) : null}
        </View>
        <PressableEscala
          accessibilityRole="button"
          accessibilityLabel={`Não fiz: ${descricao}`}
          accessibilityHint={status === "nao_fui" ? "Toque de novo para desmarcar" : undefined}
          accessibilityState={{ selected: status === "nao_fui" }}
          onPress={() => aoTocar("nao_fui")}
          style={[styles.naoFui, status === "nao_fui" && { backgroundColor: colors.sunk }]}
        >
          <Text variant="caption" weight={600} color={status === "nao_fui" ? "ink" : "mute"}>
            Não fiz
          </Text>
        </PressableEscala>
      </View>
    </ReanimatedSwipeable>
  );
}

type Dia = "hoje" | "ontem";

const NOMES_DO_DIA: Record<Dia, string> = { hoje: "Hoje", ontem: "Ontem" };

/** Alternância compacta entre hoje e ontem, no canto do título. */
function AlternarDia({ valor, aoMudar }: { valor: Dia; aoMudar: (dia: Dia) => void }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Dia da agenda"
      style={[styles.alternar, { backgroundColor: colors.sunk }]}
    >
      {(["hoje", "ontem"] as const).map((dia) => {
        const ativo = dia === valor;
        return (
          <PressableEscala
            key={dia}
            accessibilityRole="radio"
            accessibilityLabel={NOMES_DO_DIA[dia]}
            accessibilityState={{ selected: ativo }}
            onPress={() => aoMudar(dia)}
            haptica={ativo ? undefined : "selecao"}
            style={[styles.opcaoDia, ativo && { backgroundColor: colors.ink }]}
          >
            <Text variant="caption" weight={600} color={ativo ? "onInk" : "mute"}>
              {NOMES_DO_DIA[dia]}
            </Text>
          </PressableEscala>
        );
      })}
    </View>
  );
}

type CompromissosDoDiaProps = {
  /** Dia mostrado. Dia futuro aparece só como plano, sem marcar. */
  dia: Date;
  aoMarcar: (marcacao: Marcacao) => void;
  /** Chave da ocorrência em curso agora, destacada na linha */
  chaveAgora?: string | null;
};

/**
 * Linha do tempo dos compromissos de um dia, com Feito e Não fiz (toque ou gesto). Usada na Home
 * (hoje e ontem) e no detalhe do dia do Calendário. Não mostra nada quando o dia não tem plano.
 */
export function CompromissosDoDia({ dia, aoMarcar, chaveAgora = null }: CompromissosDoDiaProps) {
  const { dados, relogio, ocorrenciasDe, marcar } = useAgenda();
  const [erro, setErro] = useState<string | null>(null);
  const data = chaveDoDia(dia);
  const ocorrencias = ocorrenciasDe(dia);
  const somenteLeitura = !podeRegistrarNaData(data, relogio());

  function aoTocar(chave: string, status: StatusDoRegistro) {
    const resultado = marcar(chave, status, dia);
    if (resultado.ok) {
      setErro(null);
      aoMarcar(resultado.valor);
    } else {
      setErro(resultado.erro);
    }
  }

  if (ocorrencias.length === 0) return null;

  return (
    <View style={styles.secao}>
      <Card style={styles.lista}>
        {ocorrencias.map((ocorrencia, indice) => (
          <LinhaDoDia
            key={ocorrencia.chave}
            ocorrencia={ocorrencia}
            status={registroDaOcorrencia(dados.registros, ocorrencia.chave, data)?.status ?? null}
            emCurso={ocorrencia.chave === chaveAgora}
            primeira={indice === 0}
            ultima={indice === ocorrencias.length - 1}
            aoTocar={(status) => aoTocar(ocorrencia.chave, status)}
            somenteLeitura={somenteLeitura}
          />
        ))}
      </Card>
      {somenteLeitura ? null : (
        <Text variant="caption" color="mute">
          Deslize um compromisso: para a direita marca Feito, para a esquerda Não fiz.
        </Text>
      )}
      {erro ? (
        <Text variant="caption" color="accentText" weight={600} accessibilityRole="alert">
          {erro}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Compromissos do dia na Home como uma linha do tempo (etapas 2 e 4 da agenda semanal).
 * Tocar na bolinha marca Feito; "Não fiz" fica à direita. Deslizar faz o mesmo: para a direita
 * é Feito, para a esquerda é Não fiz. "Ontem" permite marcar o que ficou esquecido.
 */
export default function HojeNaAgenda({ aoMarcar, aoMontarAgenda, chaveAgora }: HojeNaAgendaProps) {
  const { dados, relogio, ocorrenciasDe, agendaDe } = useAgenda();
  const [qual, setQual] = useState<Dia>("hoje");

  const hoje = relogio();
  const dia = qual === "hoje" ? hoje : somarDias(hoje, -1);
  const minusculo = NOMES_DO_DIA[qual].toLowerCase();
  const data = chaveDoDia(dia);
  const ocorrencias = ocorrenciasDe(dia);
  const resumo = resumoDoDia(ocorrencias, dados.registros, data);

  return (
    <View style={styles.secao}>
      <View style={styles.cabecalho}>
        <View style={styles.titulo}>
          <Text variant="section" accessibilityRole="header">
            {`${NOMES_DO_DIA[qual]} na agenda`}
          </Text>
          {ocorrencias.length > 0 ? (
            <Text variant="caption" color="mute" testID="resumo-agenda-hoje">
              {textoDoResumo(resumo)}
            </Text>
          ) : null}
        </View>
        <AlternarDia valor={qual} aoMudar={setQual} />
      </View>

      {ocorrencias.length === 0 ? (
        <Card style={styles.vazio}>
          {agendaDe(dia) === undefined ? (
            <>
              <Text variant="body">{`Sem agenda para ${minusculo}`}</Text>
              <Text variant="support" color="mute">
                {dados.agendas.length === 0
                  ? AGENDA_COMECA_VAZIA
                  : "Monte a agenda do mês para ver aqui os compromissos de cada dia."}
              </Text>
              {aoMontarAgenda ? (
                <Pressable accessibilityRole="button" onPress={aoMontarAgenda} style={styles.alvo}>
                  <Text variant="support" color="accentText" weight={600}>
                    Montar agenda
                  </Text>
                </Pressable>
              ) : null}
            </>
          ) : (
            <Text variant="support" color="mute">
              {`Nada marcado para ${minusculo}.`}
            </Text>
          )}
        </Card>
      ) : (
        <CompromissosDoDia
          key={data}
          dia={dia}
          aoMarcar={aoMarcar}
          chaveAgora={qual === "hoje" ? (chaveAgora ?? null) : null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  secao: { gap: SPACING.md },
  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.md,
  },
  titulo: { flex: 1, minWidth: 0 },
  alternar: { flexDirection: "row", padding: 3, borderRadius: RADIUS.pill },
  opcaoDia: {
    minHeight: 38,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  lista: { paddingVertical: SPACING.xs, paddingHorizontal: 0, overflow: "hidden" },
  linha: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 60,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.xs,
  },
  hora: { width: LARGURA_DA_HORA, fontVariant: ["tabular-nums"] },
  colunaDoNo: {
    width: SIZES.touchMin,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
  },
  fio: { position: "absolute", width: 2 },
  alvoDoNo: {
    width: SIZES.touchMin,
    height: SIZES.touchMin,
    alignItems: "center",
    justifyContent: "center",
  },
  no: {
    width: TAMANHO_DO_NO,
    height: TAMANHO_DO_NO,
    borderRadius: TAMANHO_DO_NO / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  noVazio: { borderWidth: 2 },
  miolo: { width: 10, height: 10, borderRadius: 5 },
  textos: { flex: 1, minWidth: 0, paddingLeft: SPACING.xs },
  naoFui: {
    minHeight: SIZES.touchMin,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  acao: { flex: 1, flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  acaoEsquerda: { justifyContent: "flex-start", paddingLeft: SPACING.xl },
  acaoDireita: { justifyContent: "flex-end", paddingRight: SPACING.xl },
  vazio: { gap: SPACING.xs },
  alvo: { minHeight: SIZES.touchMin, justifyContent: "center" },
});
