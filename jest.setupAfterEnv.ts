import { configure } from "@testing-library/react-native";

// Com todas as suítes em paralelo a máquina fica lenta; o 1 s padrão do waitFor não basta.
configure({ asyncUtilTimeout: 5000 });
