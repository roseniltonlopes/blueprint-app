import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import BlueprintHomeScreen from "./src/screens/BlueprintHomeScreen";

export default function App() {
  return (
    <SafeAreaProvider>
      <BlueprintHomeScreen />
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
