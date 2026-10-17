import {
  Easing,
  FadeIn,
  FadeInUp,
  FadeOut,
  FadeOutDown,
  ReduceMotion,
} from "react-native-reanimated";
import { MOTION } from "../styles/theme";

/**
 * Animações padrão (docs/04 seção 6). Todas usam ReduceMotion.System: com
 * "remover animações" ativo no aparelho, o Reanimated aplica o estado final na hora.
 */

export const CURVA = Easing.bezier(...MOTION.easing);

/** Entrada em cascata: sobe 10px e aparece. */
export function entrada(atrasoMs = 0) {
  return FadeInUp.duration(MOTION.enter.duration)
    .delay(atrasoMs)
    .easing(CURVA)
    .withInitialValues({ opacity: 0, transform: [{ translateY: MOTION.enter.offsetY }] })
    .reduceMotion(ReduceMotion.System);
}

/** Atraso do item `indice` numa cascata que começa em `inicioMs`. */
export function cascata(indice: number, inicioMs = 0) {
  return inicioMs + indice * MOTION.enter.stagger;
}

export function surgir(atrasoMs = 0, duracaoMs = 600) {
  return FadeIn.duration(duracaoMs).delay(atrasoMs).reduceMotion(ReduceMotion.System);
}

export function sumir(duracaoMs = 250) {
  return FadeOut.duration(duracaoMs).reduceMotion(ReduceMotion.System);
}

export const toastEntrada = FadeInUp.duration(MOTION.toast.duration)
  .delay(MOTION.toast.delay)
  .easing(CURVA)
  .withInitialValues({ opacity: 0, transform: [{ translateY: 24 }] })
  .reduceMotion(ReduceMotion.System);

export const toastSaida = FadeOutDown.duration(250).reduceMotion(ReduceMotion.System);
