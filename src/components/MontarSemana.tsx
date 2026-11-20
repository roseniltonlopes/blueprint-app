import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
  agendaEmCurso,
  compromissosEmConflito,
  dataDaChave,
  type Agenda,
  type Avulso,
  type Compromisso,
  type DiaDaSemana,
} from "../domain/agenda";
import { formatarDataCabecalho } from "../domain/datas";
import { useAgenda } from "../hooks/useAgenda";
import { SIZES, SPACING } from "../styles/theme";
import { useTheme } from "../theme/ThemeProvider";
import { Card } from "../ui/Card";
import { Icon } from "../ui/Icon";
import { Text } from "../ui/Text";
import BotaoAcao from "./BotaoAcao";
import SeletorDeDias from "./SeletorDeDias";

type MontarSemanaProps = {
  agenda: Agenda;
  /** Compromissos "só neste dia" do mês exibido, já em ordem */
  avulsos: readonly Avulso[];
  aoAbrir: (compromisso: Compromisso) => void;
  aoAbrirAvulso: (avulso: Avulso) => void;
  aoNovo: () => void;
};

type ErroDeLinha = { compromissoId: string; texto: string };

function horarioDe(horario: { inicio: string; fim: string | null }): string {
  return horario.fim === null ? horario.inicio : `${horario.inicio} a ${horario.fim}`;
}

/**
 * Semana modelo: uma linha por compromisso, com os sete dias ao lado. Tocar num dia liga ou
 * desliga na hora, sem abrir formulário. Numa agenda já em curso a mudança vale a partir de hoje,
 * para não reescrever os dias que passaram.
 */
export default function MontarSemana({
  agenda,
  avulsos,
  aoAbrir,
  aoAbrirAvulso,
  aoNovo,
}: MontarSemanaProps) {
  const { dados, relogio, salvarCompromisso } = useAgenda();
  const { colors } = useTheme();
  const [erro, setErro] = useState<ErroDeLinha | null>(null);

  const emCurso = agendaEmCurso(agenda, relogio());
  const atividades = useMemo(
    () => new Map(dados.atividades.map((atividade) => [atividade.id, atividade])),
    [dados.atividades],
  );
  const conflitos = useMemo(
    () => compromissosEmConflito(agenda.compromissos),
    [agenda.compromissos],
  );
  const ordenados = useMemo(
    () =>
      [...agenda.compromissos].sort(
        (a, b) =>
          a.inicio.localeCompare(b.inicio) ||
          (atividades.get(a.atividadeId)?.nome ?? "").localeCompare(
            atividades.get(b.atividadeId)?.nome ?? "",
          ),
      ),
    [agenda.compromissos, atividades],
  );

  function mudarDias(compromisso: Compromisso, dias: DiaDaSemana[]) {
    const resultado = salvarCompromisso(
      agenda.id,
      { ...compromisso, dias },
      emCurso ? "a-partir-de-hoje" : "periodo",
    );
    setErro(resultado.ok ? null : { compromissoId: compromisso.id, texto: resultado.erro });
  }

  return (
    <View style={styles.lista}>
      <Text variant="support" color="mute">
        {emCurso
          ? "Esta agenda já começou: as mudanças valem a partir de hoje."
          : "Toque nos dias para marcar ou desmarcar. Vale para todas as semanas desta agenda."}
      </Text>

      {ordenados.length === 0 ? (
        <Card style={styles.vazio}>
          <Text variant="cardTitle">Nenhum compromisso ainda</Text>
          <Text variant="support" color="mute">
            Adicione o primeiro e escolha todos os dias de uma vez.
          </Text>
        </Card>
      ) : (
        ordenados.map((compromisso) => {
          const atividade = atividades.get(compromisso.atividadeId);
          const nome = atividade?.nome ?? "Atividade removida";
          const horario = horarioDe(compromisso);
          const emConflito = conflitos.has(compromisso.id);
          return (
            <Card key={compromisso.id} style={styles.cartao}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Editar ${nome}, ${horario}${emConflito ? ", conflito de horário" : ""}`}
                onPress={() => aoAbrir(compromisso)}
                style={styles.topo}
              >
                <View style={[styles.circulo, { backgroundColor: colors.sunk }]}>
                  <Icon name={atividade?.icone ?? "outro"} color={colors.ink} size={20} />
                </View>
                <View style={styles.texto}>
                  <Text variant="body" numberOfLines={1}>
                    {nome}
                  </Text>
                  <Text variant="support" color="mute">
                    {horario}
                    {compromisso.detalhe ? `  ·  ${compromisso.detalhe}` : ""}
                  </Text>
                  {emConflito ? (
                    <Text variant="caption" color="accentText" weight={600}>
                      Conflito de horário
                    </Text>
                  ) : null}
                </View>
                <Icon name="proximo" color={colors.mute} size={18} />
              </Pressable>
              <SeletorDeDias
                valor={compromisso.dias}
                aoMudar={(dias) => mudarDias(compromisso, dias)}
              />
              {erro?.compromissoId === compromisso.id ? (
                <Text variant="caption" color="accentText" weight={600} accessibilityRole="alert">
                  {erro.texto}
                </Text>
              ) : null}
            </Card>
          );
        })
      )}

      <BotaoAcao titulo="Novo compromisso" aoPressionar={aoNovo} />

      {avulsos.length > 0 ? (
        <View style={styles.avulsos}>
          <Text variant="section" accessibilityRole="header">
            Só em um dia
          </Text>
          {avulsos.map((avulso) => {
            const nome = atividades.get(avulso.atividadeId)?.nome ?? "Atividade removida";
            const data = dataDaChave(avulso.data);
            const dia = data ? formatarDataCabecalho(data) : avulso.data;
            const horario = horarioDe(avulso);
            return (
              <Card key={avulso.id}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${nome}, ${horario}, ${dia}, só neste dia`}
                  onPress={() => aoAbrirAvulso(avulso)}
                  style={styles.topo}
                >
                  <View style={styles.texto}>
                    <Text variant="body" numberOfLines={1}>
                      {nome}
                    </Text>
                    <Text variant="support" color="mute">
                      {`${dia}  ·  ${horario}`}
                    </Text>
                  </View>
                  <Icon name="proximo" color={colors.mute} size={18} />
                </Pressable>
              </Card>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  lista: { gap: SPACING.gap },
  cartao: { gap: SPACING.md },
  vazio: { gap: SPACING.sm },
  avulsos: { gap: SPACING.gap, marginTop: SPACING.sm },
  topo: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    minHeight: SIZES.touchMin,
  },
  circulo: {
    width: SIZES.iconCircle,
    height: SIZES.iconCircle,
    borderRadius: SIZES.iconCircle / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  texto: { flex: 1, minWidth: 0 },
});
