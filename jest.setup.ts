import { setUpTests } from "react-native-reanimated";

// O módulo nativo do Worklets não existe no Jest; o pacote traz um mock oficial.
jest.mock("react-native-worklets", () =>
  jest.requireActual("react-native-worklets/lib/module/mock"),
);

// expo-crypto depende de módulo nativo; no Jest o Node gera o UUID.
jest.mock("expo-crypto", () => ({
  randomUUID: () => jest.requireActual<{ randomUUID: () => string }>("crypto").randomUUID(),
}));

setUpTests();
