import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import BarraDeAbas from "../components/BarraDeAbas";
import EmBreveScreen from "../screens/EmBreveScreen";
import HistoricoScreen from "../screens/HistoricoScreen";
import HomeScreen from "../screens/HomeScreen";

export type AbasParamList = {
  Hoje: undefined;
  Calendario: undefined;
  Historico: undefined;
  Perfil: undefined;
};

const Tab = createBottomTabNavigator<AbasParamList>();

function CalendarioProvisorio() {
  return <EmBreveScreen titulo="Calendário" descricao="O calendário mensal chega na Etapa 5." />;
}

function PerfilProvisorio() {
  return <EmBreveScreen titulo="Perfil" descricao="O perfil e a aparência chegam na Etapa 5." />;
}

/** Navegação principal por 4 abas (docs/05 F10). */
export default function Abas() {
  return (
    <Tab.Navigator
      tabBar={(props) => <BarraDeAbas {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Hoje" component={HomeScreen} />
      <Tab.Screen name="Calendario" component={CalendarioProvisorio} />
      <Tab.Screen name="Historico" component={HistoricoScreen} />
      <Tab.Screen name="Perfil" component={PerfilProvisorio} />
    </Tab.Navigator>
  );
}
