import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AgendasScreen from "../screens/AgendasScreen";
import CompromissoScreen from "../screens/CompromissoScreen";
import Abas from "./Abas";

export type RaizParamList = {
  Abas: undefined;
  Compromisso: {
    compromissoId?: string;
    agendaId?: string;
    avulsoId?: string;
    /** AAAA-MM-DD */
    data?: string;
    /** Novo compromisso vindo da semana modelo: abre sem nenhum dia marcado */
    modelo?: boolean;
  };
  /** `nova` abre a tela já com o formulário de nova agenda; `data` (AAAA-MM-DD) escolhe o mês e o trecho livre */
  Agendas: { nova?: boolean; data?: string } | undefined;
};

const Stack = createNativeStackNavigator<RaizParamList>();

/** Pilha raiz: as abas e, por cima delas, as telas de edição da agenda. */
export default function Raiz() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Abas" component={Abas} />
      <Stack.Screen name="Compromisso" component={CompromissoScreen} />
      <Stack.Screen name="Agendas" component={AgendasScreen} />
    </Stack.Navigator>
  );
}
