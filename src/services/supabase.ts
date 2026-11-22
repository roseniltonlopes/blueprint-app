import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, processLock, type SupabaseClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

/**
 * Cliente Supabase do app. A URL e a chave PUBLICÁVEL vêm do .env (EXPO_PUBLIC_*, embutidas no
 * build). A chave publicável é pública por desenho: quem protege os dados é o RLS das migrações
 * em supabase/migrations/. Nunca use aqui a chave secret nem a service_role.
 *
 * Sem as variáveis, exporta null e o app funciona só com os dados do aparelho.
 * Só App.tsx importa este arquivo; o resto do app conhece as portas de src/sincronizacao/porta.ts.
 */
function criarCliente(): SupabaseClient | null {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const chave = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !chave) {
    console.warn(
      "Supabase não configurado (EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY). " +
        "O app funciona só com os dados do aparelho.",
    );
    return null;
  }

  const cliente = createClient(url, chave, {
    auth: {
      // Na web o supabase-js usa o localStorage do navegador; no celular, o AsyncStorage.
      ...(Platform.OS !== "web" ? { storage: AsyncStorage } : {}),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
    },
  });

  // No React Native o supabase-js não sabe se o app está em primeiro plano: a renovação do token
  // liga e desliga com o AppState (doc do GoTrueClient.startAutoRefresh, versão instalada).
  // Registrado uma vez só, junto com o cliente.
  if (Platform.OS !== "web") {
    AppState.addEventListener("change", (estado) => {
      if (estado === "active") {
        void cliente.auth.startAutoRefresh();
      } else {
        void cliente.auth.stopAutoRefresh();
      }
    });
  }

  return cliente;
}

export const supabase = criarCliente();
