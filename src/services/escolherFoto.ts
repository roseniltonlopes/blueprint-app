import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import type { Resultado } from "../domain/agenda";
import { fotoValida } from "../domain/perfil";

/** Lado menor da foto depois de reduzida. Basta para um avatar nítido e mantém o arquivo leve. */
export const LADO_DA_FOTO = 512;
const QUALIDADE = 0.7;

export const ERRO_ABRIR_FOTOS = "Não foi possível abrir as suas fotos.";
export const ERRO_FOTO_PESADA = "Essa foto é pesada demais. Escolha outra.";

/**
 * Abre a galeria, deixa a pessoa recortar em quadrado e devolve a foto reduzida como data URI.
 * `valor` é null quando ela cancela. O texto fica pequeno de propósito: vai para o AsyncStorage.
 */
export async function escolherFoto(): Promise<Resultado<string | null>> {
  try {
    const escolha = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (escolha.canceled) {
      return { ok: true, valor: null };
    }

    const imagem = escolha.assets[0];
    const paisagem = imagem.width > imagem.height;
    const reduzida = await ImageManipulator.manipulate(imagem.uri)
      .resize(paisagem ? { height: LADO_DA_FOTO } : { width: LADO_DA_FOTO })
      .renderAsync();
    const salva = await reduzida.saveAsync({
      format: SaveFormat.JPEG,
      compress: QUALIDADE,
      base64: true,
    });

    const foto = `data:image/jpeg;base64,${salva.base64 ?? ""}`;
    return fotoValida(foto) ? { ok: true, valor: foto } : { ok: false, erro: ERRO_FOTO_PESADA };
  } catch (erro) {
    console.warn("Falha ao escolher a foto de perfil.", erro);
    return { ok: false, erro: ERRO_ABRIR_FOTOS };
  }
}
