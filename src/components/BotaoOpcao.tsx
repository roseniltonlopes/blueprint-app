import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { COLORS } from "../styles/theme";

/**
 * Componente Reutilizável: BotaoOpcao
 *
 * Propriedades:
 * - titulo: texto exibido dentro do botão
 * - aoPressionar: função executada no evento onPress
 * - selecionado: booleano que indica se esta categoria é a escolha atual no useState
 * - corSelecionado: (Opcional) permite personalizar a cor de destaque quando selecionado
 */
type BotaoOpcaoProps = {
  titulo: string;
  aoPressionar: () => void;
  selecionado?: boolean;
  corSelecionado?: string;
};

export default function BotaoOpcao({
  titulo,
  aoPressionar,
  selecionado,
  corSelecionado,
}: BotaoOpcaoProps) {
  return (
    <Pressable
      style={[
        styles.botao,
        selecionado && styles.botaoSelecionado,
        selecionado && corSelecionado && { backgroundColor: corSelecionado },
      ]}
      onPress={aoPressionar}
    >
      <Text style={[styles.textoBotao, selecionado && styles.textoBotaoSelecionado]}>{titulo}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: {
    backgroundColor: COLORS.buttonDefault,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: "center",
  },
  botaoSelecionado: {
    backgroundColor: COLORS.blueprintBlue,
  },
  textoBotao: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  textoBotaoSelecionado: {
    color: COLORS.textOnPrimary,
    fontWeight: "700",
  },
});
