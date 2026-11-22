import "react-native-gesture-handler/jestSetup";
import { setUpTests } from "react-native-reanimated";

// O módulo nativo do Worklets não existe no Jest; o pacote traz um mock oficial.
jest.mock("react-native-worklets", () =>
  jest.requireActual("react-native-worklets/lib/module/mock"),
);

// O seletor de horário nativo não renderiza no Jest: o mock expõe o componente e o diálogo do Android.
jest.mock("@react-native-community/datetimepicker", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    __esModule: true,
    default: (props: object) => React.createElement(View, { testID: "datetimepicker", ...props }),
    DateTimePickerAndroid: { open: jest.fn(), dismiss: jest.fn() },
  };
});

setUpTests();
