import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { COLORS } from "../styles/theme";

/**
 * Componente Reutilizável: BotaoAcao
 *
 * Usado para confirmar o registro da ação selecionada no plano diário (Blueprint).
 */
type BotaoAcaoProps = {
  titulo: string;
  aoPressionar: () => void;
};

export default function BotaoAcao({ titulo, aoPressionar }: BotaoAcaoProps) {
  return (
    <Pressable style={styles.botao} onPress={aoPressionar}>
      <Text style={styles.textoBotao}>{titulo}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: {
    backgroundColor: COLORS.primaryNavy,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 8,
    alignItems: "center",
  },
  textoBotao: {
    color: COLORS.textOnPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
});
