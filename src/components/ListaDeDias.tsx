import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { Acao } from "../domain/acoes";
import { nomeDaCategoria } from "../domain/categorias";
import {
  DIAS_DA_SEMANA,
  chaveDoDia,
  formatarDiaMes,
  formatarHora,
  rotuloDoDia,
} from "../domain/datas";
import type { DiaDoGrafico } from "../domain/estatisticas";
import { plural } from "../domain/texto";
import { RADIUS, SIZES, SPACING } from "../styles/theme";
import { useTheme } from "../theme/ThemeProvider";
import { Card } from "../ui/Card";
import { Icon } from "../ui/Icon";
import { Text } from "../ui/Text";

type ListaDeDiasProps = {
  /** Os sete dias da semana exibida; dias futuros não entram na lista */
  dias: readonly DiaDoGrafico[];
  acoesPorDia: ReadonlyMap<string, readonly Acao[]>;
  hoje: Date;
};

const MAX_ICONES = 4;

function tituloDoDia(data: Date, hoje: Date): string {
  const relativo = rotuloDoDia(data, hoje);
  return relativo === "Hoje" || relativo === "Ontem" ? relativo : DIAS_DA_SEMANA[data.getDay()];
}

/**
 * Uma linha por dia da semana, do mais recente para o mais antigo: o total e os ícones das
 * categorias de relance. Tocar abre as ações daquele dia. Hoje já vem aberto.
 */
export default function ListaDeDias({ dias, acoesPorDia, hoje }: ListaDeDiasProps) {
  const { colors } = useTheme();
  const [abertos, setAbertos] = useState<ReadonlySet<string>>(() => new Set([chaveDoDia(hoje)]));
  const passados = useMemo(() => dias.filter((dia) => !dia.futuro).reverse(), [dias]);

  function alternar(chave: string) {
    setAbertos((atual) => {
      const proximo = new Set(atual);
      if (!proximo.delete(chave)) proximo.add(chave);
      return proximo;
    });
  }

  return (
    <Card radius="category" style={styles.cartao}>
      {passados.map((dia, indice) => {
        const chave = chaveDoDia(dia.data);
        const acoes = acoesPorDia.get(chave) ?? [];
        const titulo = tituloDoDia(dia.data, hoje);
        const data = formatarDiaMes(dia.data);
        const aberto = abertos.has(chave);
        const categorias = [...new Set(acoes.map((acao) => acao.categoria))];
        const separador =
          indice > 0 ? { borderTopWidth: 1, borderTopColor: colors.hair } : undefined;

        if (acoes.length === 0) {
          return (
            <View
              key={chave}
              accessible
              accessibilityLabel={`${titulo}, ${data}, sem registros`}
              style={[styles.linha, separador]}
            >
              <View style={styles.titulos}>
                <Text variant="body" color="mute">
                  {titulo}
                </Text>
                <Text variant="caption" color="mute">
                  {data}
                </Text>
              </View>
              <Text variant="support" color="mute">
                Sem registros
              </Text>
            </View>
          );
        }

        return (
          <View key={chave} style={separador}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${titulo}, ${data}, ${plural(acoes.length, "ação", "ações")}`}
              accessibilityState={{ expanded: aberto }}
              onPress={() => alternar(chave)}
              style={styles.linha}
            >
              <View style={styles.titulos}>
                <Text variant="body">{titulo}</Text>
                <Text variant="caption" color="mute">
                  {data}
                </Text>
              </View>
              <View style={styles.icones}>
                {categorias.slice(0, MAX_ICONES).map((categoria) => (
                  <Icon key={categoria} name={categoria} color={colors.mute} size={18} />
                ))}
              </View>
              <Text variant="support" weight={600} style={styles.total}>
                {plural(acoes.length, "ação", "ações")}
              </Text>
              <View style={aberto ? styles.setaAberta : undefined}>
                <Icon name="proximo" color={colors.mute} size={18} />
              </View>
            </Pressable>

            {aberto ? (
              <View style={styles.detalhe}>
                {acoes.map((acao) => {
                  const nome = acao.rotulo ?? nomeDaCategoria(acao.categoria);
                  const hora = formatarHora(new Date(acao.criadoEm));
                  return (
                    <View
                      key={acao.id}
                      style={styles.item}
                      accessible
                      accessibilityLabel={`${hora}, ${nome}`}
                    >
                      <Text variant="support" color="mute" style={styles.hora}>
                        {hora}
                      </Text>
                      <View style={[styles.circulo, { backgroundColor: colors.sunk }]}>
                        <Icon name={acao.categoria} color={colors.ink} size={16} />
                      </View>
                      <Text variant="body" numberOfLines={1} style={styles.nome}>
                        {nome}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  cartao: { padding: 0, paddingHorizontal: SPACING.lg },
  linha: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    minHeight: 64,
  },
  titulos: { flex: 1, minWidth: 0 },
  icones: { flexDirection: "row", gap: 6 },
  total: { minWidth: 62, textAlign: "right" },
  setaAberta: { transform: [{ rotate: "90deg" }] },
  detalhe: { paddingBottom: SPACING.md, gap: 2 },
  item: { flexDirection: "row", alignItems: "center", gap: SPACING.md, minHeight: SIZES.touchMin },
  hora: { width: 46, fontVariant: ["tabular-nums"] },
  circulo: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  nome: { flex: 1 },
});
