/*
 * Gera landing/config.js na publicação da Vercel, a partir das variáveis de ambiente do projeto:
 *   EXPO_PUBLIC_SUPABASE_URL              (https://<projeto>.supabase.co)
 *   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY  (sb_publishable_...)
 * O config.js fica fora do Git; este script o recria a cada deploy.
 * Recusa chaves secretas: a página roda no navegador de qualquer pessoa.
 *
 * Uso local: node gerar-config.js (lê as mesmas variáveis do ambiente ou do .env do app).
 */
/* global Buffer, __dirname */
"use strict";

const fs = require("fs");
const path = require("path");

const NOME_URL = "EXPO_PUBLIC_SUPABASE_URL";
const NOME_CHAVE = "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY";

/** Lê um .env simples (CHAVE=valor por linha) sem sobrescrever o que já está no ambiente. */
function lerEnvLocal(caminho) {
  if (!fs.existsSync(caminho)) return {};
  const valores = {};
  for (const linha of fs.readFileSync(caminho, "utf-8").split(/\r?\n/)) {
    const texto = linha.trim();
    if (!texto || texto.startsWith("#") || !texto.includes("=")) continue;
    const posicao = texto.indexOf("=");
    const nome = texto.slice(0, posicao).trim();
    const valor = texto
      .slice(posicao + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    valores[nome] = valor;
  }
  return valores;
}

/** Papel gravado numa chave JWT antiga do Supabase ("anon" ou "service_role"). */
function papelDoJwt(chave) {
  const partes = chave.split(".");
  if (partes.length !== 3) return null;
  try {
    const conteudo = JSON.parse(Buffer.from(partes[1], "base64url").toString("utf-8"));
    return typeof conteudo.role === "string" ? conteudo.role : null;
  } catch {
    return null;
  }
}

/** Valida as variáveis e devolve o conteúdo do config.js, ou lança um erro claro. */
function montarConfig(ambiente) {
  const url = (ambiente[NOME_URL] || "").trim();
  const chave = (ambiente[NOME_CHAVE] || "").trim();

  if (!url || !chave) {
    throw new Error(
      `Faltam variáveis de ambiente: ${[!url && NOME_URL, !chave && NOME_CHAVE]
        .filter(Boolean)
        .join(" e ")}. Cadastre em Vercel > Project > Settings > Environment Variables.`,
    );
  }
  let endereco;
  try {
    endereco = new URL(url);
  } catch {
    throw new Error(`${NOME_URL} não é uma URL válida.`);
  }
  if (endereco.protocol !== "https:") {
    throw new Error(`${NOME_URL} precisa começar com https://.`);
  }
  if (chave.startsWith("sb_secret_") || papelDoJwt(chave) === "service_role") {
    throw new Error(
      `${NOME_CHAVE} é uma chave secreta. Use a chave publicável (sb_publishable_...): esta página é pública.`,
    );
  }

  return `/* Gerado por gerar-config.js na publicação. Não edite: mude as variáveis na Vercel. */
window.BLUEPRINT_CONFIG = {
  supabaseUrl: ${JSON.stringify(endereco.origin)},
  supabaseChavePublicavel: ${JSON.stringify(chave)},
};
`;
}

function principal() {
  const ambiente = {
    ...lerEnvLocal(path.join(__dirname, "..", ".env")),
    ...process.env,
  };
  try {
    fs.writeFileSync(path.join(__dirname, "config.js"), montarConfig(ambiente), "utf-8");
    console.log("config.js gerado.");
  } catch (erro) {
    console.error(`Erro ao gerar config.js: ${erro.message}`);
    process.exit(1);
  }
}

module.exports = { montarConfig };

if (require.main === module) {
  principal();
}
