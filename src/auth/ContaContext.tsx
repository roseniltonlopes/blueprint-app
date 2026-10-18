import { createContext, useContext, type ReactNode } from "react";
import type { Usuario } from "./tipos";

export type Conta = {
  usuario: Usuario;
  /** Encerra a sessão e apaga os dados desta conta no aparelho (continuam no servidor) */
  sair: () => Promise<void>;
};

const ContaContext = createContext<Conta | null>(null);

export function ContaProvider({ conta, children }: { conta: Conta; children: ReactNode }) {
  return <ContaContext.Provider value={conta}>{children}</ContaContext.Provider>;
}

/** Conta logada, ou null no modo sem Supabase configurado. */
export function useConta(): Conta | null {
  return useContext(ContaContext);
}
