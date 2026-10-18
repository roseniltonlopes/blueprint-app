import { setUpTests } from "react-native-reanimated";

// O módulo nativo do Worklets não existe no Jest; o pacote traz um mock oficial.
jest.mock("react-native-worklets", () =>
  jest.requireActual("react-native-worklets/lib/module/mock"),
);

setUpTests();
