import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { nomeDaCategoria } from "../domain/categorias";
import { listarDias, type LinhaDoPainel, type PainelDoMes } from "../domain/painel";
import { comparacaoComMesAnterior, plural } from "../domain/texto";
import { SIZES, SPACING } from "../styles/theme";
import { useTheme } from "../theme/ThemeProvider";
import { Card } from "../ui/Card";
import { Icon } from "../ui/Icon";
import { Text } from "../ui/Text";
import Resumo from "./Resumo";

type PainelDeCompromissosProps = {
  painel: PainelDoMes;
  /** "novembro", para o detalhe dos dias */
  nomeDoMes: string;
};

function LinhaDeAtividade({ linha, nomeDoMes }: { linha: LinhaDoPainel; nomeDoMes: string }) {
  const { colors } = useTheme();
  const [aberta, setAberta] = useState(false);
  const comparacao = comparacaoComMesAnterior(linha.feitos, linha.feitosNoMesAnterior);
  const detalhes = [
    { rotulo: "Feito", dias: linha.diasFeitos },
    { rotulo: "Não fui", dias: linha.diasNaoFui },
    { rotulo: "Sem registro", dias: linha.diasSemRegistro },
  ].filter((d) => d.dias.length > 0);

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: aberta }}
        accessibilityLabel={`${linha.nome}, ${plural(linha.feitos, "vez", "vezes")}, ${comparacao}`}
        onPress={() => setAberta((atual) => !atual)}
        style={styles.linha}
      >
        <View style={styles.texto}>
          <Text variant="body" numberOfLines={1}>
            {linha.nome}
          </Text>
          <Text variant="caption" color="mute">
            {comparacao}
          </Text>
        </View>
        <Text variant="body" weight={600}>
          {plural(linha.feitos, "vez", "vezes")}
        </Text>
        <View style={{ transform: [{ rotate: aberta ? "90deg" : "0deg" }] }}>
          <Icon name="proximo" color={colors.mute} size={16} />
        </View>
      </Pressable>
      {aberta ? (
        <View style={styles.detalhe}>
          {detalhes.map(({ rotulo, dias }) => (
            <Text key={rotulo} variant="caption" color="mute">
              {`${rotulo}: ${listarDias(dias)} de ${nomeDoMes}`}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Compromissos do mês: feitos, não fui e sem registro, por categoria e por atividade (etapa 4). */
export default function PainelDeCompromissos({ painel, nomeDoMes }: PainelDeCompromissosProps) {
  const { colors } = useTheme();
  if (painel.grupos.length === 0) {
    return (
      <Text variant="support" color="mute">
        Nenhum compromisso da agenda neste mês.
      </Text>
    );
  }
  return (
    <View style={styles.painel}>
      <Resumo
        itens={[
          { valor: String(painel.feitos), rotulo: "feitos" },
          { valor: String(painel.naoFui), rotulo: "não fui" },
          { valor: String(painel.semRegistro), rotulo: "sem registro" },
        ]}
      />
      {painel.percentual !== null ? (
        <Text variant="support" color="mute" testID="percentual-do-mes">
          {`Cumpriu ${painel.percentual}% do que estava na agenda.`}
        </Text>
      ) : null}
      {painel.grupos.map((grupo) => {
        const nome = grupo.categoria ? nomeDaCategoria(grupo.categoria) : "Sem categoria";
        return (
          <Card key={grupo.categoria ?? "sem-categoria"} radius="category" style={styles.grupo}>
            <View style={styles.cabecalho}>
              <Text variant="section" accessibilityRole="header">
                {nome}
              </Text>
              <Text variant="support" color="mute">
                {plural(grupo.feitos, "vez", "vezes")}
              </Text>
            </View>
            {grupo.atividades.map((linha, i) => (
              <View
                key={linha.atividadeId}
                style={i > 0 ? { borderTopWidth: 1, borderTopColor: colors.hair } : undefined}
              >
                <LinhaDeAtividade linha={linha} nomeDoMes={nomeDoMes} />
              </View>
            ))}
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  painel: { gap: SPACING.gap },
  grupo: { gap: SPACING.xs },
  cabecalho: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  linha: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    minHeight: SIZES.touchMin,
    paddingVertical: SPACING.xs,
  },
  texto: { flex: 1, minWidth: 0 },
  detalhe: { gap: 2, paddingBottom: SPACING.sm },
});
