import React, { useState } from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";
import BotaoAcao from "../components/BotaoAcao";
import BotaoOpcao from "../components/BotaoOpcao";
import { COLORS } from "../styles/theme";

/**
 * Tela Inicial do MVP — Blueprint (Plano de Ação Claro e Estruturado)
 * - Estado de categoria selecionada (useState)
 * - Contador de ações registradas no dia (useState)
 * - Seletor de categorias reutilizável com suporte a destaque customizado
 */
export default function BlueprintHomeScreen() {
  const [categoria, setCategoria] = useState("Nenhuma categoria selecionada");
  const [quantidade, setQuantidade] = useState(0);

  function registrarAcaoNoPlano() {
    setQuantidade(quantidade + 1);
  }

  return (
    <SafeAreaView style={styles.tela}>
      <View style={styles.cartao}>
        <Text style={styles.titulo}>Blueprint</Text>
        <Text style={styles.subtitulo}>
          Plano de Ação Diário — Selecione seu foco agora:
        </Text>

        <View style={styles.placarContainer}>
          <Text style={styles.numero}>{quantidade}</Text>
          <Text style={styles.placarRotulo}>ações registradas hoje</Text>
        </View>

        <BotaoOpcao
          titulo="Hidratação"
          selecionado={categoria === "Hidratação"}
          aoPressionar={() => setCategoria("Hidratação")}
        />

        <BotaoOpcao
          titulo="Exercício"
          selecionado={categoria === "Exercício"}
          aoPressionar={() => setCategoria("Exercício")}
        />

        <BotaoOpcao
          titulo="Descanso"
          selecionado={categoria === "Descanso"}
          aoPressionar={() => setCategoria("Descanso")}
        />

        <BotaoOpcao
          titulo="Estudo"
          selecionado={categoria === "Estudo"}
          aoPressionar={() => setCategoria("Estudo")}
        />

        <BotaoOpcao
          titulo="Outro"
          selecionado={categoria === "Outro"}
          corSelecionado={COLORS.specialPurple}
          aoPressionar={() => setCategoria("Outro")}
        />

        <Text style={styles.resultado}>Foco atual: {categoria}</Text>

        <BotaoAcao
          titulo="Registrar ação no Blueprint"
          aoPressionar={registrarAcaoNoPlano}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: COLORS.backgroundSlate,
    padding: 20,
    justifyContent: "center",
  },
  cartao: {
    backgroundColor: COLORS.surfaceWhite,
    borderRadius: 16,
    padding: 20,
  },
  titulo: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.primaryNavy,
    marginBottom: 4,
  },
  subtitulo: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  placarContainer: {
    backgroundColor: COLORS.backgroundSlate,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  numero: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.blueprintBlue,
  },
  placarRotulo: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  resultado: {
    marginTop: 8,
    marginBottom: 8,
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
    textAlign: "center",
  },
});
