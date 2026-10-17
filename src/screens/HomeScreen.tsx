import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import BotaoAcao from "../components/BotaoAcao";
import BotaoOpcao from "../components/BotaoOpcao";
import CartaoProgresso from "../components/CartaoProgresso";
import ChaveDeTema from "../components/ChaveDeTema";
import { META_DIARIA_PADRAO } from "../domain/acoes";
import {
  CATEGORIAS_FIXAS,
  CATEGORIA_OUTRO,
  nomeDaCategoria,
  type CategoriaId,
} from "../domain/categorias";
import { formatarDataCabecalho } from "../domain/datas";
import { useAcoes, type Relogio } from "../hooks/useAcoes";
import { SPACING } from "../styles/theme";
import { Screen } from "../ui/Screen";
import { Text } from "../ui/Text";

type HomeScreenProps = {
  /** Fixa o "agora" em testes */
  relogio?: Relogio;
};

/** Home (docs/03, telas 2 e 3; docs/05, F01, F02, F03 e F05). */
export default function HomeScreen({ relogio }: HomeScreenProps) {
  const { totalHoje, porCategoriaHoje, registrar } = useAcoes(relogio);
  const [selecionada, setSelecionada] = useState<CategoriaId | null>(null);
  // Bloqueia toques repetidos antes do React aplicar a limpeza da seleção.
  const registrando = useRef(false);

  useEffect(() => {
    registrando.current = false;
  }, [selecionada]);

  function aoRegistrar() {
    if (selecionada === null || registrando.current) {
      return;
    }
    registrando.current = true;
    registrar(selecionada);
    setSelecionada(null);
  }

  const hoje = relogio ? relogio() : new Date();
  const tituloBotao = selecionada
    ? `Registrar ${nomeDaCategoria(selecionada)}`
    : "Escolha uma categoria para registrar";

  return (
    <Screen
      scroll
      footer={
        <BotaoAcao
          titulo={tituloBotao}
          desabilitado={selecionada === null}
          aoPressionar={aoRegistrar}
        />
      }
    >
      <View style={styles.cabecalho}>
        <View style={styles.saudacao}>
          <Text variant="support" color="mute">
            {formatarDataCabecalho(hoje)}
          </Text>
          <Text variant="h1" accessibilityRole="header">
            Olá!
          </Text>
        </View>
        <ChaveDeTema />
      </View>

      <View style={styles.progresso}>
        <CartaoProgresso total={totalHoje} meta={META_DIARIA_PADRAO} />
      </View>

      <Text variant="section" accessibilityRole="header" style={styles.tituloSecao}>
        O que você fez agora?
      </Text>

      <View style={styles.grade}>
        {[CATEGORIAS_FIXAS.slice(0, 2), CATEGORIAS_FIXAS.slice(2, 4)].map((linha) => (
          <View key={linha[0].id} style={styles.linhaGrade}>
            {linha.map((categoria) => (
              <BotaoOpcao
                key={categoria.id}
                titulo={categoria.nome}
                subtitulo={`${porCategoriaHoje[categoria.id]} hoje`}
                icone={categoria.id}
                selecionado={selecionada === categoria.id}
                aoPressionar={() => setSelecionada(categoria.id)}
              />
            ))}
          </View>
        ))}
        <BotaoOpcao
          formato="linha"
          titulo={CATEGORIA_OUTRO.nome}
          subtitulo={
            porCategoriaHoje.outro > 0 ? `${porCategoriaHoje.outro} hoje` : "Algo fora da lista"
          }
          icone="outro"
          selecionado={selecionada === "outro"}
          aoPressionar={() => setSelecionada("outro")}
        />
      </View>
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
});
