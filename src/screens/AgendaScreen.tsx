import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import MontarSemana from "../components/MontarSemana";
import { gerarAgendaDeExemplo } from "../dev/agendaDeExemplo";
import { gerarIdLocal } from "../domain/acoes";
import {
  DADOS_AGENDA_VAZIOS,
  nomeDeAgendaDoMes,
  periodoLivreDoMes,
  type Agenda,
  type Avulso,
  type Compromisso,
} from "../domain/agenda";
import { MESES, chaveDoDia, formatarMesAno } from "../domain/datas";
import { useAgenda } from "../hooks/useAgenda";
import type { RaizParamList } from "../navigation/Raiz";
import { RADIUS, SIZES, SPACING } from "../styles/theme";
import { useTheme } from "../theme/ThemeProvider";
import { Card, Screen, Text } from "../ui";
import { Icon } from "../ui/Icon";

function FerramentasDeDesenvolvimento() {
  const { substituir, relogio } = useAgenda();
  if (!__DEV__) {
    return null;
  }
  return (
    <View style={styles.dev}>
      <Text variant="caption" color="mute">
        DEV
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Carregar agenda de exemplo"
        onPress={() => substituir(gerarAgendaDeExemplo(() => gerarIdLocal(relogio()), relogio()))}
        style={styles.devBotao}
      >
        <Text variant="caption" color="accentText" weight={600}>
          Carregar agenda de exemplo
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Limpar agenda"
        onPress={() => substituir({ ...DADOS_AGENDA_VAZIOS })}
        style={styles.devBotao}
      >
        <Text variant="caption" color="accentText" weight={600}>
          Limpar agenda
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * Aba Agenda: o cronograma do mês como uma semana modelo. Cada compromisso é uma linha com os
 * sete dias ao lado, então montar a semana é tocar nos dias, não abrir um formulário por dia.
 */
export default function AgendaScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RaizParamList>>();
  const { dados, relogio, criarAgenda } = useAgenda();
  const { colors } = useTheme();
  const [deslocamento, setDeslocamento] = useState(0);
  const [erro, setErro] = useState<string | null>(null);

  const hoje = relogio();
  const chaveHoje = chaveDoDia(hoje);
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth() + deslocamento, 1);
  const inicioDoMes = chaveDoDia(primeiroDia);
  const fimDoMes = chaveDoDia(new Date(primeiroDia.getFullYear(), primeiroDia.getMonth() + 1, 0));

  // Agenda do mês exibido: a que contém hoje; senão a mais recente que toca o mês.
  const agendasDoMes = dados.agendas
    .filter((agenda) => agenda.inicio <= fimDoMes && agenda.fim >= inicioDoMes)
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
  const agendaAlvo: Agenda | undefined =
    agendasDoMes.find((agenda) => agenda.inicio <= chaveHoje && chaveHoje <= agenda.fim) ??
    agendasDoMes[agendasDoMes.length - 1];

  const avulsosDoMes = dados.avulsos
    .filter((avulso) => avulso.data >= inicioDoMes && avulso.data <= fimDoMes)
    .sort((a, b) => a.data.localeCompare(b.data) || a.inicio.localeCompare(b.inicio));

  // Para o convite: hoje, se o mês é o atual; senão o dia 1 do mês exibido.
  const diaDeReferencia = deslocamento === 0 ? hoje : primeiroDia;

  function comecarEmBranco() {
    const periodo = periodoLivreDoMes(dados.agendas, diaDeReferencia);
    const resultado = criarAgenda({
      nome: nomeDeAgendaDoMes(diaDeReferencia.getFullYear(), diaDeReferencia.getMonth()),
      ...periodo,
    });
    setErro(resultado.ok ? null : resultado.erro);
  }

  function abrirCompromisso(agenda: Agenda, compromisso: Compromisso) {
    navigation.navigate("Compromisso", { compromissoId: compromisso.id, agendaId: agenda.id });
  }

  function abrirAvulso(avulso: Avulso) {
    navigation.navigate("Compromisso", { avulsoId: avulso.id });
  }

  return (
    <Screen scroll contentStyle={styles.conteudo}>
      <View style={styles.cabecalho}>
        <Text variant="h1" accessibilityRole="header" style={styles.titulo}>
          Agenda
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Editar agendas"
          onPress={() => navigation.navigate("Agendas")}
          style={[styles.editar, { backgroundColor: colors.sunk }]}
        >
          <Text variant="support" weight={600}>
            Editar
          </Text>
        </Pressable>
      </View>

      <View style={styles.mes}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mês anterior"
          onPress={() => setDeslocamento((atual) => atual - 1)}
          style={styles.seta}
        >
          <Icon name="anterior" color={colors.ink} />
        </Pressable>
        <Text variant="section">
          {formatarMesAno(primeiroDia.getFullYear(), primeiroDia.getMonth())}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Próximo mês"
          onPress={() => setDeslocamento((atual) => atual + 1)}
          style={styles.seta}
        >
          <Icon name="proximo" color={colors.ink} />
        </Pressable>
      </View>

      {agendaAlvo ? (
        <MontarSemana
          key={agendaAlvo.id}
          agenda={agendaAlvo}
          avulsos={avulsosDoMes}
          aoAbrir={(compromisso) => abrirCompromisso(agendaAlvo, compromisso)}
          aoAbrirAvulso={abrirAvulso}
          aoNovo={() =>
            navigation.navigate("Compromisso", { data: agendaAlvo.inicio, modelo: true })
          }
        />
      ) : (
        <Card style={styles.convite}>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              navigation.navigate("Agendas", { nova: true, data: chaveDoDia(diaDeReferencia) })
            }
            style={styles.alvo}
          >
            <Text variant="cardTitle">{`Montar a agenda de ${MESES[primeiroDia.getMonth()]}`}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={comecarEmBranco} style={styles.alvo}>
            <Text variant="support" color="accentText" weight={600}>
              Começar em branco
            </Text>
          </Pressable>
          {erro ? (
            <Text variant="caption" accessibilityRole="alert">
              {erro}
            </Text>
          ) : null}
        </Card>
      )}
      <FerramentasDeDesenvolvimento />
    </Screen>
  );
}

const styles = StyleSheet.create({
  conteudo: { gap: SPACING.gap, paddingBottom: SPACING.xxl },
  cabecalho: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  titulo: { flex: 1 },
  editar: {
    minHeight: SIZES.touchMin,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.button,
    justifyContent: "center",
  },
  mes: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  seta: {
    width: SIZES.touchMin,
    height: SIZES.touchMin,
    alignItems: "center",
    justifyContent: "center",
  },
  convite: { gap: SPACING.sm },
  alvo: { minHeight: SIZES.touchMin, justifyContent: "center" },
  dev: { flexDirection: "row", alignItems: "center", gap: SPACING.lg, flexWrap: "wrap" },
  devBotao: { minHeight: SIZES.touchMin, justifyContent: "center" },
});
