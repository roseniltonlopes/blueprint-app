# 08. Release do APK (etapa 7)

Checklist para gerar o `.apk` de release do Blueprint com o EAS Build. A primeira parte foi conferida no código em 2026-11-22. As demais dependem do dono do projeto.

## 1. Segurança conferida no código

| Item | Situação |
| :--- | :--- |
| Segredos no Git (todas as branches) | Nenhum. Só o texto de exemplo do `.env.example`. O `.env` está no `.gitignore` e não é rastreado. |
| Chave no app | Só a `publishable` (`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). Nenhuma `secret` nem `service_role` no código. |
| Dados no servidor | RLS em todas as tabelas, cada pessoa só lê e grava as próprias linhas; `anon` sem privilégio (migrações 001 e 002). |
| Backup do Android | `android.allowBackup: false`: o AsyncStorage (sessão do Supabase e dados pessoais) não vai para o backup do Google nem sai por `adb backup`. Reinstalar o app começa vazio; os dados voltam ao entrar na conta. |
| Permissões | Câmera e microfone bloqueados no `expo-image-picker`. Declaradas a mais: `SCHEDULE_EXACT_ALARM` e `USE_EXACT_ALARM` (alertas na hora certa). As do `expo-notifications` (notificações e reagendar após reiniciar) vêm do próprio pacote. |
| Logs | Nenhum `console` imprime token, sessão ou senha. |
| Dados fictícios | Os dados de exemplo (`src/dev/`, com nomes e lugares reais do caderno do dono) só são carregados por `require` dentro de `if (__DEV__)`; o Metro descarta o bloco no build de produção. Conferido no bundle de produção do Android (veja a seção 5). |
| LGPD | Aceite dos termos no cadastro (versão gravada pelo servidor), Termos e Política no app e na landing, exclusão da conta e dos dados pelo app (migração 003). Pendências jurídicas em `docs/09`. |
| Tráfego | Só HTTPS (o Android bloqueia texto claro por padrão). |
| Dependências | `npm audit --omit=dev`: 3 moderadas no `minimatch` dentro do `@expo/fingerprint` (ferramenta de build, não vai no APK). A correção sugerida rebaixaria o Expo para o SDK 52; não aplicar. |
| Fonte | Sora, licença OFL (uso comercial livre). A Nohemi não é usada. |
| Versão | `appVersionSource: remote` e `autoIncrement` no perfil `production`: o `versionCode` sobe sozinho a cada build. |

> **`USE_EXACT_ALARM` e Play Store:** a permissão é aceita em APK distribuído fora da loja. Se o app for publicado na Play Store, o Google exige que ele seja um app de alarme ou calendário; nesse caso, troque por `SCHEDULE_EXACT_ALARM` com pedido de permissão na tela.

## 2. Antes do build (dono do projeto)

1. **Aplicar a migração 002** (`supabase/migrations/002_registros_e_exclusao.sql`) depois de revisar, de preferência testando antes num projeto de desenvolvimento. Passo a passo em `docs/02`, seção 2.1. Sem ela o app mostra "O banco precisa da migração 002" e não sincroniza os registros.
2. **Supabase > Authentication:** (feito em 2026-11-22: senha mínima 8 com "Letras e dígitos", igual à validação do app; a proteção contra senhas vazadas só existe no plano Pro)
   - ligar a proteção contra senhas vazadas (Password security > Leaked password protection; o painel de segurança do Supabase acusa que está desligada);
   - conferir a confirmação de e-mail e o remetente (o SMTP padrão do Supabase tem limite baixo de envios por hora);
   - definir a Site URL usada no e-mail de "Esqueci a senha" (o app não tem deep link).
3. **Variáveis no EAS.** O `.env` não sobe para o build na nuvem (está no `.gitignore`). Os perfis `preview` e `production` do `eas.json` leem os ambientes de mesmo nome do EAS. Criar uma vez, com os valores do `.env` local (a chave é a publicável, por isso `plaintext`):

   ```bash
   npx eas-cli env:create --name EXPO_PUBLIC_SUPABASE_URL --value "<URL do .env>" \
     --environment preview --environment production --visibility plaintext --non-interactive
   npx eas-cli env:create --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value "<chave do .env>" \
     --environment preview --environment production --visibility plaintext --non-interactive
   npx eas-cli env:list production
   ```

## 3. Build

```bash
# APK de teste (instalação interna, mesmas variáveis)
npx eas-cli build --platform android --profile preview

# APK de release
npx eas-cli build --platform android --profile production
```

Cada comando usa a cota de builds da conta Expo. Ao terminar, o EAS mostra o link para baixar o `.apk`.

## 4. Conferência no aparelho (APK `preview`)

- [ ] Instala e abre sem tela branca; fonte Sora carregada.
- [ ] Agenda: carregar a agenda, marcar "Feito" e "Não fiz", Desfazer, aba "Ontem" (docs/05, F32).
- [ ] Alertas: permitir no Perfil; compromisso com "Avisar antes" toca com o app fechado e a tela bloqueada; botão "Feito" na notificação (F33).
- [ ] Histórico > Mês: painel de compromissos (F34).
- [ ] Conta: criar conta, confirmar o e-mail, entrar, ver "Sincronizado às HH:MM"; entrar em outro aparelho e ver o mesmo histórico (etapa 5).
- [ ] Sem internet: o app segue funcionando e sincroniza quando a conexão volta.
- [ ] Reiniciar o celular: os alertas continuam agendados.
- [ ] Modo claro e escuro; TalkBack nos botões principais.
- [ ] Primeiro acesso: agenda vazia com o aviso "Sua agenda começa vazia"; nenhuma ferramenta "DEV" na tela.
- [ ] Permissão de notificação só aparece ao salvar um compromisso com aviso, depois da explicação do app.
- [ ] Criar conta com a caixa de aceite; Termos e Política abrem sem internet.
- [ ] Excluir a conta pelo Perfil: some do Supabase (Authentication > Users) e o app fica vazio.

Se tudo passar, gerar o perfil `production`, atualizar a página de venda (`landing/`: tirar "Em breve" do que já estiver no APK e preencher `DOWNLOAD_URL` em `landing/script.js`) e marcar a etapa 7 no README.

## 5. O que mudou nos ajustes de 2026-11-22

- "Não fui" virou "Não fiz" em todos os textos. O valor gravado continua `nao_fui` no aparelho e no banco.
- "Avisar antes" com opções de toque (Sem aviso, Na hora, 5, 10, 15, 30 e 60 min), 10 min por padrão em compromisso novo, também nos avulsos. A permissão de notificação só é pedida ao salvar um aviso, depois de uma explicação do app.
- Dados de exemplo fora do APK: verificação feita com `npx expo export --platform android` (resultado no relatório da tarefa e abaixo).
- Termos de Uso e Política de Privacidade (`src/legal/textos.ts`), caixa de aceite no cadastro, telas no app e páginas `landing/termos.html` e `landing/privacidade.html`.
- Excluir a conta e os dados (função `excluir_minha_conta`, migração 003) e, sem conta, apagar os dados do aparelho.
