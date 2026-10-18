import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import BarraDeAbas from "../components/BarraDeAbas";
import CalendarioScreen from "../screens/CalendarioScreen";
import HistoricoScreen from "../screens/HistoricoScreen";
import HomeScreen from "../screens/HomeScreen";
import PerfilScreen from "../screens/PerfilScreen";

export type AbasParamList = {
  Hoje: undefined;
  Calendario: undefined;
  Historico: undefined;
  Perfil: undefined;
};

const Tab = createBottomTabNavigator<AbasParamList>();

/** Navegação principal por 4 abas (docs/05 F10). */
export default function Abas() {
  return (
    <Tab.Navigator
      tabBar={(props) => <BarraDeAbas {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Hoje" component={HomeScreen} />
      <Tab.Screen name="Calendario" component={CalendarioScreen} />
      <Tab.Screen name="Historico" component={HistoricoScreen} />
      <Tab.Screen name="Perfil" component={PerfilScreen} />
    </Tab.Navigator>
  );
}
