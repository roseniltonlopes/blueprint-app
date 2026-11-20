import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import BotaoTexto from "../components/BotaoTexto";
import CabecalhoDeTela from "../components/CabecalhoDeTela";
import Campo from "../components/Campo";
import SeletorDeAtividade from "../components/SeletorDeAtividade";
import SeletorDeDias from "../components/SeletorDeDias";
import SeletorDeHorario from "../components/SeletorDeHorario";
import {
  agendaEmCurso,
  dataDaChave,
  validarCompromisso,
  type Agenda,
  type Avulso,
  type Compromisso,
  type DiaDaSemana,
  type Resultado,
} from "../domain/agenda";
import { chaveDoDia } from "../domain/datas";
import { useAgenda, type CompromissoRascunho, type EscopoDaEdicao } from "../hooks/useAgenda";
import type { RaizParamList } from "../navigation/Raiz";
import { RADIUS, SIZES, SPACING } from "../styles/theme";
import { useTheme } from "../theme/ThemeProvider";
import { Card, Screen, SegmentedControl, Text } from "../ui";

type Props = NativeStackScreenProps<RaizParamList, "Compromisso">;

type Alvo =
  | { tipo: "novo" }
  | { tipo: "compromisso"; agendaId: string; compromisso: Compromisso }
  | { tipo: "avulso"; avulso: Avulso }
  | { tipo: "nao-encontrado" };

type Painel =
  { tipo: "escopo"; agendaId: string; rascunho: CompromissoRascunho } | { tipo: "remover" };

type Repeticao = "semana" | "avulso";

const AVISO_PERIODO_TODO = "O período todo muda também os dias já passados deste período.";

export default function CompromissoScreen({ route, navigation }: Props) {
  const { dados } = useAgenda();
  const params = route.params;
  // O alvo é fixado na abertura: salvar pode trocar ids (agenda dividida) e a tela não deve piscar "não encontrado".
  const [alvo] = useState<Alvo>(() => {
    if (params?.avulsoId !== undefined) {
      const avulso = dados.avulsos.find((v) => v.id === params.avulsoId);
      return avulso ? { tipo: "avulso", avulso } : { tipo: "nao-encontrado" };
    }
    if (params?.compromissoId !== undefined) {
      const agenda = dados.agendas.find((a) => a.id === params.agendaId);
      const compromisso = agenda?.compromissos.find((c) => c.id === params.compromissoId);
      return agenda && compromisso
        ? { tipo: "compromisso", agendaId: agenda.id, compromisso }
        : { tipo: "nao-encontrado" };
    }
    return { tipo: "novo" };
  });

  if (alvo.tipo === "nao-encontrado") {
    return (
      <Screen contentStyle={styles.conteudo}>
        <CabecalhoDeTela titulo="Compromisso" aoVoltar={() => navigation.goBack()} />
        <Text variant="body">Compromisso não encontrado</Text>
      </Screen>
    );
  }
  return (
    <Formulario
      alvo={alvo}
      data={params?.data}
      semDiaInicial={params?.modelo === true}
      navigation={navigation}
    />
  );
}

type FormularioProps = {
  alvo: Exclude<Alvo, { tipo: "nao-encontrado" }>;
  data: string | undefined;
  /** Novo compromisso sem dia pré-marcado (vem da semana modelo) */
  semDiaInicial: boolean;
  navigation: Props["navigation"];
};

function Formulario({ alvo, data, semDiaInicial, navigation }: FormularioProps) {
  const {
    dados,
    relogio,
    agendaDe,
    criarAtividade,
    salvarCompromisso,
    removerCompromisso,
    salvarAvulso,
    removerAvulso,
  } = useAgenda();
  const { colors } = useTheme();

  const hoje = relogio();
  const existente = alvo.tipo === "compromisso" ? alvo.compromisso : undefined;
  const avulsoExistente = alvo.tipo === "avulso" ? alvo.avulso : undefined;
  const editando = alvo.tipo !== "novo";
  const dataDaRota = data !== undefined ? dataDaChave(data) : null;

  const [repeticao, setRepeticao] = useState<Repeticao>(
    alvo.tipo === "avulso" ? "avulso" : "semana",
  );
  const [atividadeId, setAtividadeId] = useState<string | null>(
    existente?.atividadeId ?? avulsoExistente?.atividadeId ?? null,
  );
  const [dias, setDias] = useState<DiaDaSemana[]>(
    existente
      ? [...existente.dias]
      : dataDaRota && !semDiaInicial
        ? [dataDaRota.getDay() as DiaDaSemana]
        : [],
  );
  const [inicio, setInicio] = useState<string | null>(
    existente?.inicio ?? avulsoExistente?.inicio ?? null,
  );
  const [fim, setFim] = useState<string | null>(existente?.fim ?? avulsoExistente?.fim ?? null);
  const [semTermino, setSemTermino] = useState(
    editando && (existente?.fim ?? avulsoExistente?.fim) === null,
  );
  const [detalhe, setDetalhe] = useState(existente?.detalhe ?? avulsoExistente?.detalhe ?? "");
  const [antecedencia, setAntecedencia] = useState(
    existente?.antecedenciaMin !== undefined ? String(existente.antecedenciaMin) : "",
  );
  const [dataTexto, setDataTexto] = useState(avulsoExistente?.data ?? data ?? chaveDoDia(hoje));
  const [erro, setErro] = useState<string | null>(null);
  const [semAgenda, setSemAgenda] = useState(false);
  const [painel, setPainel] = useState<Painel | null>(null);

  const agendaDoAlvo: Agenda | undefined =
    alvo.tipo === "compromisso" ? dados.agendas.find((a) => a.id === alvo.agendaId) : undefined;
  const emCursoRecorrente = agendaDoAlvo !== undefined && agendaEmCurso(agendaDoAlvo, hoje);

  function concluir(resultado: Resultado<unknown>) {
    if (resultado.ok) {
      navigation.goBack();
      return;
    }
    setPainel(null);
    setErro(resultado.erro);
  }

  function aoSalvar() {
    setErro(null);
    setSemAgenda(false);
    if (atividadeId === null) {
      setErro("Escolha uma atividade");
      return;
    }
    const comum = {
      atividadeId,
      inicio: inicio ?? "",
      fim: semTermino || fim === null || fim === "" ? null : fim,
      ...(detalhe.trim().length > 0 ? { detalhe: detalhe.trim() } : {}),
    };

    if (repeticao === "avulso") {
      concluir(salvarAvulso({ id: avulsoExistente?.id, ...comum, data: dataTexto }));
      return;
    }

    const agenda = agendaDoAlvo ?? agendaDe(dataDaRota ?? hoje);
    if (!agenda) {
      setSemAgenda(true);
      setErro("Crie uma agenda para este período antes");
      return;
    }
    const rascunho: CompromissoRascunho = {
      id: existente?.id,
      ...comum,
      dias,
      ...(antecedencia.trim().length > 0 ? { antecedenciaMin: Number(antecedencia) } : {}),
    };
    const { id: _id, ...conteudo } = rascunho;
    const invalido = validarCompromisso(conteudo);
    if (invalido !== null) {
      setErro(invalido);
      return;
    }
    if (agendaEmCurso(agenda, hoje)) {
      setPainel({ tipo: "escopo", agendaId: agenda.id, rascunho });
      return;
    }
    concluir(salvarCompromisso(agenda.id, rascunho, "periodo"));
  }

  function aplicarEscopo(escopo: EscopoDaEdicao) {
    if (painel?.tipo === "escopo") {
      concluir(salvarCompromisso(painel.agendaId, painel.rascunho, escopo));
    }
  }

  function remover(escopo: EscopoDaEdicao) {
    if (alvo.tipo === "compromisso") {
      concluir(removerCompromisso(alvo.agendaId, alvo.compromisso.id, escopo));
    } else if (alvo.tipo === "avulso") {
      concluir(removerAvulso(alvo.avulso.id));
    }
  }

  let rodape: ReactNode;
  if (painel?.tipo === "escopo") {
    rodape = (
      <Card style={styles.painel}>
        <Text variant="section">Aplicar a partir de quando?</Text>
        <Text variant="caption" color="mute">
          {AVISO_PERIODO_TODO}
        </Text>
        <BotaoTexto
          rotulo="A partir de hoje"
          aoPressionar={() => aplicarEscopo("a-partir-de-hoje")}
          variante="primario"
        />
        <BotaoTexto rotulo="O período todo" aoPressionar={() => aplicarEscopo("periodo")} />
        <BotaoTexto rotulo="Cancelar" aoPressionar={() => setPainel(null)} variante="link" />
      </Card>
    );
  } else if (painel?.tipo === "remover") {
    rodape = (
      <Card style={styles.painel}>
        <Text variant="section">Remover este compromisso?</Text>
        {emCursoRecorrente ? (
          <>
            <Text variant="caption" color="mute">
              {AVISO_PERIODO_TODO}
            </Text>
            <BotaoTexto
              rotulo="A partir de hoje"
              aoPressionar={() => remover("a-partir-de-hoje")}
              variante="primario"
            />
            <BotaoTexto rotulo="O período todo" aoPressionar={() => remover("periodo")} />
          </>
        ) : (
          <BotaoTexto
            rotulo="Confirmar remoção"
            aoPressionar={() => remover("periodo")}
            variante="primario"
          />
        )}
        <BotaoTexto rotulo="Cancelar" aoPressionar={() => setPainel(null)} variante="link" />
      </Card>
    );
  } else {
    rodape = (
      <View style={styles.rodape}>
        {erro ? (
          <Text variant="support" color="accentText" weight={600} accessibilityRole="alert">
            {erro}
          </Text>
        ) : null}
        {semAgenda ? (
          <BotaoTexto
            rotulo="Criar agenda"
            aoPressionar={() =>
              navigation.navigate("Agendas", { nova: true, data: chaveDoDia(dataDaRota ?? hoje) })
            }
            variante="link"
          />
        ) : null}
        <BotaoTexto rotulo="Salvar" aoPressionar={aoSalvar} variante="primario" />
        {editando ? (
          <BotaoTexto rotulo="Remover" aoPressionar={() => setPainel({ tipo: "remover" })} />
        ) : null}
      </View>
    );
  }

  return (
    <Screen scroll footer={rodape} contentStyle={styles.conteudo}>
      <CabecalhoDeTela
        titulo={editando ? "Editar compromisso" : "Novo compromisso"}
        aoVoltar={() => navigation.goBack()}
      />

      {!editando ? (
        <SegmentedControl<Repeticao>
          accessibilityLabel="Repetição"
          value={repeticao}
          onChange={setRepeticao}
          options={[
            { value: "semana", label: "Toda semana" },
            { value: "avulso", label: "Só neste dia" },
          ]}
        />
      ) : null}

      <SeletorDeAtividade
        atividades={dados.atividades}
        valor={atividadeId}
        aoEscolher={setAtividadeId}
        criarAtividade={criarAtividade}
      />

      {repeticao === "semana" ? (
        <View style={styles.bloco}>
          <Text variant="section">Dias da semana</Text>
          <SeletorDeDias valor={dias} aoMudar={setDias} atalhos />
        </View>
      ) : (
        <Campo
          rotulo="Data"
          valor={dataTexto}
          aoMudar={setDataTexto}
          placeholder="AAAA-MM-DD"
          maxLength={10}
        />
      )}

      <View style={styles.bloco}>
        <Text variant="section">Horário</Text>
        <Text variant="caption" color="mute">
          Início
        </Text>
        <SeletorDeHorario valor={inicio} aoMudar={setInicio} rotulo="Início" />
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel="Sem horário de término"
          accessibilityState={{ checked: semTermino }}
          onPress={() => setSemTermino((atual) => !atual)}
          style={[styles.opcao, { backgroundColor: semTermino ? colors.ink : colors.sunk }]}
        >
          <Text variant="body" color={semTermino ? "onInk" : "ink"}>
            Sem horário de término
          </Text>
        </Pressable>
        {semTermino ? null : (
          <>
            <Text variant="caption" color="mute">
              Término
            </Text>
            <SeletorDeHorario valor={fim} aoMudar={setFim} rotulo="Término" />
          </>
        )}
      </View>

      <Campo
        rotulo="Detalhe (opcional)"
        valor={detalhe}
        aoMudar={setDetalhe}
        maxLength={60}
        placeholder="Ex.: Montese, Uber"
      />
      {repeticao === "semana" ? (
        <Campo
          rotulo="Avisar antes (minutos)"
          valor={antecedencia}
          aoMudar={setAntecedencia}
          teclado="numeric"
          maxLength={3}
          placeholder="Sem aviso"
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  conteudo: { gap: SPACING.xl, paddingBottom: SPACING.xxl },
  bloco: { gap: SPACING.sm },
  opcao: {
    minHeight: SIZES.touchMin,
    borderRadius: RADIUS.button,
    paddingHorizontal: SPACING.lg,
    justifyContent: "center",
  },
  painel: { gap: SPACING.sm },
  rodape: { gap: SPACING.sm },
});
