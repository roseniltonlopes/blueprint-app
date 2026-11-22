import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet } from "react-native";
import CabecalhoDeTela from "../components/CabecalhoDeTela";
import DocumentoLegalView from "../components/DocumentoLegalView";
import { POLITICA_DE_PRIVACIDADE } from "../legal/textos";
import type { RaizParamList } from "../navigation/Raiz";
import { SPACING } from "../styles/theme";
import { Screen } from "../ui";

type Props = NativeStackScreenProps<RaizParamList, "Privacidade">;

export default function PrivacidadeScreen({ navigation }: Props) {
  return (
    <Screen scroll contentStyle={styles.conteudo}>
      <CabecalhoDeTela
        titulo={POLITICA_DE_PRIVACIDADE.titulo}
        aoVoltar={() => navigation.goBack()}
      />
      <DocumentoLegalView documento={POLITICA_DE_PRIVACIDADE} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  conteudo: { gap: SPACING.gap, paddingBottom: SPACING.xxl },
});
