import * as Crypto from "expo-crypto";
import type { GeradorDeId } from "./acoes";

/** UUID v4 com gerador criptográfico do sistema (expo-crypto). */
export const gerarUuid: GeradorDeId = () => Crypto.randomUUID();
