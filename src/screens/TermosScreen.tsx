import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet } from "react-native";
import CabecalhoDeTela from "../components/CabecalhoDeTela";
import DocumentoLegalView from "../components/DocumentoLegalView";
import { TERMOS_DE_USO } from "../legal/textos";
import type { RaizParamList } from "../navigation/Raiz";
import { SPACING } from "../styles/theme";
import { Screen } from "../ui";

type Props = NativeStackScreenProps<RaizParamList, "Termos">;

export default function TermosScreen({ navigation }: Props) {
  return (
    <Screen scroll contentStyle={styles.conteudo}>
      <CabecalhoDeTela titulo={TERMOS_DE_USO.titulo} aoVoltar={() => navigation.goBack()} />
      <DocumentoLegalView documento={TERMOS_DE_USO} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  conteudo: { gap: SPACING.gap, paddingBottom: SPACING.xxl },
});
