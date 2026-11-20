import { Image, StyleSheet, View } from "react-native";
import { iniciais } from "../domain/texto";
import { BRAND } from "../styles/theme";
import { useTheme } from "../theme/ThemeProvider";
import { Gradiente } from "../ui/Gradiente";
import { Text } from "../ui/Text";

type AvatarDoPerfilProps = {
  nome: string;
  /** Data URI da foto; sem ela aparecem as iniciais sobre o gradiente */
  foto: string | null;
  tamanho?: number;
};

/** Foto de perfil redonda, ou as iniciais da pessoa sobre o gradiente da marca. */
export default function AvatarDoPerfil({ nome, foto, tamanho = 64 }: AvatarDoPerfilProps) {
  const { colors } = useTheme();

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={foto ? `Foto de ${nome}` : `Avatar de ${nome}`}
      style={[styles.avatar, { width: tamanho, height: tamanho, borderRadius: tamanho / 2 }]}
    >
      {foto ? (
        <Image
          source={{ uri: foto }}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <>
          <Gradiente cores={colors.gradient} />
          <Text
            variant="cardTitle"
            weight={600}
            style={{
              color: BRAND.white,
              fontSize: tamanho * 0.34,
              lineHeight: tamanho * 0.42,
            }}
          >
            {iniciais(nome)}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { overflow: "hidden", alignItems: "center", justifyContent: "center" },
});
