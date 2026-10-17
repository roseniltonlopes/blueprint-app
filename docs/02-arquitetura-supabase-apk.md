# 🏗️ 02. Arquitetura Técnica, Supabase Cloud e Geração de APK

Este documento detalha a arquitetura do aplicativo **Blueprint**, explicando como a estrutura em **React Native + Expo** se conecta ao banco de dados **Supabase** (provisionado na região `sa-east-1` - São Paulo) e como gerar o instalador **`.apk`** gratuito para celulares Android.

---

## 1. Visão Geral da Arquitetura em Camadas

O projeto foi desenhado em camadas desacopladas para garantir código limpo, fácil manutenção e sincronização eficiente via dados móveis (4G/5G) ou Wi-Fi:

```mermaid
flowchart TD
    subgraph ViewLayer["1. Camada de Interface (src/screens & src/components)"]
        Home["BlueprintHomeScreen.js\n(SafeAreaView, View, Text, useState)"]
        BotaoOpcao["BotaoOpcao.js\n(Pressable reutilizável + prop corSelecionado)"]
        BotaoAcao["BotaoAcao.js\n(Pressable para confirmar ação no plano)"]
    end

    subgraph StateLayer["2. Camada de Estado e Eventos"]
        EstadoCat["const [categoria, setCategoria] = useState(...)"]
        EstadoQtd["const [quantidade, setQuantidade] = useState(0)"]
        Handlers["Funções: selecionarCategoria() e registrarAcaoNoPlano()"]
    end

    subgraph DataLayer["3. Camada de Persistência Cloud & Offline"]
        LocalCache["AsyncStorage\n(Cache local no aparelho)"]
        SupaClient["Cliente Supabase\n(HTTPS REST via 4G/5G ou Wi-Fi)"]
        SupaCloud[("Supabase PostgreSQL\nProjeto: blueprint-app (sa-east-1)")]
    end

    Home --> BotaoOpcao
    Home --> BotaoAcao
    BotaoOpcao -->|onPress| Handlers
    BotaoAcao -->|onPress| Handlers
    Handlers --> EstadoCat
    Handlers --> EstadoQtd
    Handlers -.-> LocalCache
    Handlers -.-> SupaClient
    SupaClient -->|HTTPS| SupaCloud
```

---

## 2. Infraestrutura Cloud no Supabase

O banco de dados na nuvem do **Blueprint** está configurado na região sul-americana para baixa latência:

- **Nome do Projeto:** `blueprint-app`
- **Project Ref:** `jjnubvilupxybafkasuh`
- **Região:** `sa-east-1` (América do Sul — São Paulo)
- **URL da API:** `https://jjnubvilupxybafkasuh.supabase.co`

### Script SQL da Tabela
O arquivo [`src/services/supabaseSchema.sql`](../src/services/supabaseSchema.sql) contém a estrutura da tabela que armazena os registros do aplicativo:

```sql
create table if not exists public.blueprint_actions (
  id uuid default gen_random_uuid() primary key,
  usuario text not null default 'Nilton',
  categoria text not null,
  criado_em timestamp with time zone default now()
);

alter table public.blueprint_actions enable row level security;

create policy "Permitir insercao de acoes no Blueprint"
  on public.blueprint_actions for insert
  with check (true);

create policy "Permitir leitura de acoes no Blueprint"
  on public.blueprint_actions for select
  using (true);
```

---

## 3. Geração do `.APK` Gratuito para Android

O arquivo [`eas.json`](../eas.json) na raiz do projeto está configurado com `"buildType": "apk"` no perfil `preview`, permitindo gerar um arquivo instalável diretamente nos dispositivos Android sem depender de publicação paga em loja.

### Comandos para Build:
1. Instalar o EAS CLI:
   ```bash
   npm install -g eas-cli
   ```
2. Autenticar na conta Expo:
   ```bash
   eas login
   ```
3. Gerar o `.apk`:
   ```bash
   eas build -p android --profile preview
   ```

---

## 4. Mitigação de Riscos de Implantação

| # | Ponto de Atenção na Implantação | Causa Técnica | Solução Arquitetural Adotada |
| :- | :--- | :--- | :--- |
| **1** | **Conexão em redes móveis (4G/5G) ou Wi-Fi restrito** | O servidor de desenvolvimento local em modo `LAN` exige mesma sub-rede. | Uso de `npx expo start --tunnel` durante testes e build **`.apk`** em produção conectando direto ao Supabase via HTTPS. |
| **2** | **Formato de pacote Android (`.aab` vs `.apk`)** | O build padrão gera *Android App Bundle* restrito à Play Store. | Configuração explícita de `"android": { "buildType": "apk" }` no arquivo [`eas.json`](../eas.json). |
| **3** | **Persistência além da sessão em memória** | O hook `useState` mantém os dados apenas enquanto o ciclo de vida do componente está ativo em memória. | Integração planejada com `AsyncStorage` (offline-first) e sincronização com a tabela `blueprint_actions` no **Supabase**. |
| **4** | **Segurança das chaves de API no repositório** | Chaves expostas em código versionado geram riscos de segurança. | Isolamento das variáveis em `.env` (ignorado via `.gitignore`) e habilitação de *Row Level Security (RLS)* no banco. |
