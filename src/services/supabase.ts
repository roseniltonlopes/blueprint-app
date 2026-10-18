import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppState } from "react-native";

/**
 * Cliente Supabase do app. Lê a URL e a chave PUBLICÁVEL do .env (EXPO_PUBLIC_*,
 * embutidas no build). A chave publicável é pública por desenho: quem protege os
 * dados é o RLS (src/services/migrations/002_auth_e_rls.sql). Nunca use aqui a
 * chave secret/service_role.
 *
 * EXPO_PUBLIC_SUPABASE_ANON_KEY (chave legada) ainda é aceita como alternativa,
 * mas o Supabase vai desativar as chaves anon até o fim de 2026.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const chave =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

function criarCliente(): SupabaseClient | null {
  if (!url || !chave) {
    console.warn(
      "Supabase não configurado (EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY). " +
        "O app funciona só com dados locais.",
    );
    return null;
  }
  const cliente = createClient(url, chave, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  // No React Native a renovação do token só roda com o app em primeiro plano.
  AppState.addEventListener("change", (estado) => {
    if (estado === "active") {
      cliente.auth.startAutoRefresh();
    } else {
      cliente.auth.stopAutoRefresh();
    }
  });

  return cliente;
}

export const supabase = criarCliente();
