import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { rotuloDoHorario, type Ocorrencia } from "../domain/agenda";
import { chaveDoDia, somarDias } from "../domain/datas";
import {
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
import { SegmentedControl } from "../ui/SegmentedControl";
import { Text } from "../ui/Text";

type HojeNaAgendaProps = {
  /** Chamado depois de cada marcação, para a tela mostrar o toast com Desfazer */
  aoMarcar: (marcacao: Marcacao) => void;
  /** Leva à aba Agenda. Sem ele, o convite não mostra o botão. */
  aoMontarAgenda?: () => void;
};

const ROTULOS: Record<StatusDoRegistro, string> = { feito: "Feito", nao_fui: "Não fui" };

type BotaoDeStatusProps = {
  status: StatusDoRegistro;
  marcado: boolean;
  descricao: string;
  aoPressionar: () => void;
};

/** Feito marcado fica laranja; Não fui marcado fica escuro. Os dois têm 44 de altura. */
function BotaoDeStatus({ status, marcado, descricao, aoPressionar }: BotaoDeStatusProps) {
  const { colors } = useTheme();
  const fundo = !marcado ? colors.sunk : status === "feito" ? colors.accent : colors.ink;
  const corDoTexto = !marcado ? colors.ink : status === "feito" ? BRAND.black : colors.onInk;
  return (
    <PressableEscala
      accessibilityRole="button"
      accessibilityLabel={`${ROTULOS[status]}: ${descricao}`}
      accessibilityHint={marcado ? "Toque de novo para desmarcar" : undefined}
      accessibilityState={{ selected: marcado }}
      onPress={aoPressionar}
      style={[styles.botao, { backgroundColor: fundo }]}
    >
      {marcado && status === "feito" ? <Icon name="check" color={corDoTexto} size={16} /> : null}
      <Text variant="support" weight={600} style={{ color: corDoTexto }}>
        {ROTULOS[status]}
      </Text>
    </PressableEscala>
  );
}

type LinhaProps = {
  ocorrencia: Ocorrencia;
  status: StatusDoRegistro | null;
  aoTocar: (status: StatusDoRegistro) => void;
};

function LinhaDeHoje({ ocorrencia, status, aoTocar }: LinhaProps) {
  const { colors } = useTheme();
  const horario = rotuloDoHorario(ocorrencia);
  const descricao = `${ocorrencia.atividade.nome}, ${horario}`;
  return (
    <Card style={styles.cartao}>
      <View style={styles.topo}>
        <View style={[styles.circulo, { backgroundColor: colors.sunk }]}>
          <Icon name={ocorrencia.atividade.icone} color={colors.ink} size={20} />
        </View>
        <View style={styles.texto}>
          <Text variant="body" numberOfLines={1}>
            {ocorrencia.atividade.nome}
          </Text>
          <Text variant="support" color="mute" numberOfLines={1}>
            {ocorrencia.detalhe ? `${horario}  ·  ${ocorrencia.detalhe}` : horario}
          </Text>
        </View>
      </View>
      <View style={styles.botoes}>
        {(["feito", "nao_fui"] as const).map((opcao) => (
          <BotaoDeStatus
            key={opcao}
            status={opcao}
            marcado={status === opcao}
            descricao={descricao}
            aoPressionar={() => aoTocar(opcao)}
          />
        ))}
      </View>
    </Card>
  );
}

type Dia = "hoje" | "ontem";

const NOMES_DO_DIA: Record<Dia, string> = { hoje: "Hoje", ontem: "Ontem" };

/**
 * Compromissos do dia na Home, com "Feito" e "Não fui" (etapas 2 e 4 da agenda semanal).
 * "Ontem" permite marcar o que ficou esquecido; dias mais antigos aparecem no painel do mês.
 */
export default function HojeNaAgenda({ aoMarcar, aoMontarAgenda }: HojeNaAgendaProps) {
  const { dados, relogio, ocorrenciasDe, agendaDe, marcar } = useAgenda();
  const [erro, setErro] = useState<string | null>(null);
  const [qual, setQual] = useState<Dia>("hoje");

  const hoje = relogio();
  const dia = qual === "hoje" ? hoje : somarDias(hoje, -1);
  const minusculo = NOMES_DO_DIA[qual].toLowerCase();
  const data = chaveDoDia(dia);
  const ocorrencias = ocorrenciasDe(dia);
  const resumo = resumoDoDia(ocorrencias, dados.registros, data);

  function trocarDia(proximo: Dia) {
    setErro(null);
    setQual(proximo);
  }

  function aoTocar(chave: string, status: StatusDoRegistro) {
    const resultado = marcar(chave, status, dia);
    if (resultado.ok) {
      setErro(null);
      aoMarcar(resultado.valor);
    } else {
      setErro(resultado.erro);
    }
  }

  return (
    <View style={styles.secao}>
      <View style={styles.cabecalho}>
        <Text variant="section" accessibilityRole="header">
          {`${NOMES_DO_DIA[qual]} na agenda`}
        </Text>
        {ocorrencias.length > 0 ? (
          <Text variant="support" color="mute" testID="resumo-agenda-hoje">
            {textoDoResumo(resumo)}
          </Text>
        ) : null}
      </View>

      <SegmentedControl<Dia>
        accessibilityLabel="Dia da agenda"
        value={qual}
        onChange={trocarDia}
        options={[
          { value: "hoje", label: "Hoje" },
          { value: "ontem", label: "Ontem" },
        ]}
      />

      {ocorrencias.length === 0 ? (
        <Card style={styles.vazio}>
          {agendaDe(dia) === undefined ? (
            <>
              <Text variant="body">{`Sem agenda para ${minusculo}`}</Text>
              <Text variant="support" color="mute">
                Monte a agenda do mês para ver aqui os compromissos de cada dia.
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
        ocorrencias.map((ocorrencia) => (
          <LinhaDeHoje
            key={ocorrencia.chave}
            ocorrencia={ocorrencia}
            status={registroDaOcorrencia(dados.registros, ocorrencia.chave, data)?.status ?? null}
            aoTocar={(status) => aoTocar(ocorrencia.chave, status)}
          />
        ))
      )}

      {erro ? (
        <Text variant="caption" color="accentText" weight={600} accessibilityRole="alert">
          {erro}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  secao: { gap: SPACING.gap },
  cabecalho: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: SPACING.md,
  },
  cartao: { gap: SPACING.md },
  topo: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  circulo: {
    width: SIZES.iconCircle,
    height: SIZES.iconCircle,
    borderRadius: SIZES.iconCircle / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  texto: { flex: 1, minWidth: 0 },
  botoes: { flexDirection: "row", gap: SPACING.sm },
  botao: {
    flex: 1,
    minHeight: SIZES.touchMin,
    borderRadius: RADIUS.button,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
  },
  vazio: { gap: SPACING.xs },
  alvo: { minHeight: SIZES.touchMin, justifyContent: "center" },
});
