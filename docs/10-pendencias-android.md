# 10. O que falta para o app funcionar 100% no Android

Levantamento de 2026-11-22, feito sobre o commit `ee6cf6c` da `feat/nilton`. Complementa o checklist de release (`docs/08-release-apk.md`) com o que ainda impede quem baixa o `.apk` de usar tudo sem ajuda.

## 1. Situação atual

| Item | Situação |
| :--- | :--- |
| Código das etapas 1 a 5 e 7 | Pronto na `feat/nilton`. Lint, typecheck e 502 testes automatizados passando (42 suítes). |
| APK `preview` | Gerado no EAS a partir do `ee6cf6c` (versionCode 1). |
| APK `production` | Ainda não gerado. |
| Variáveis do Supabase no EAS | Criadas nos ambientes `preview` e `production`. O APK já sai apontando para o Supabase. |
| Migrações 001 a 003 | Aplicadas pelo dono em 2026-11-22 (conforme o README). Não conferi no banco: o acesso pelo MCP foi negado. |
| Conferência no aparelho | Nenhum item da seção 4 do `docs/08` foi marcado. |

## 2. Bloqueantes

Sem resolver estes itens, uma pessoa que baixa o `.apk` não consegue usar todas as funções.

### 2.1 E-mails de confirmação do cadastro

O app trata o caso "confirme o e-mail" (`contaSupabase.ts`, `signUp` sem sessão). Pela documentação do Supabase, o SMTP padrão só envia para e-mails dos membros da equipe da organização e tem limite baixo por hora. Na prática, com a confirmação de e-mail ligada, quem não é da equipe não recebe o link e não consegue entrar.

**O que fazer (painel do Supabase, Authentication > Emails > SMTP Settings):** configurar um SMTP próprio (Resend, Brevo, Amazon SES ou outro) com um domínio verificado. A alternativa, desligar a confirmação de e-mail, permite contas com e-mail de outra pessoa e não é recomendada.

**Conferir antes:** se a confirmação está ligada e qual SMTP está ativo. Não consegui ler essa configuração daqui.

### 2.2 Site URL e página de retorno

Os links de confirmação e de "Esqueci a senha" redirecionam para a *Site URL* do projeto (Authentication > URL Configuration). Se ela continuar no padrão (`http://localhost:3000`), a pessoa toca no link no celular e cai numa página de erro do navegador. O e-mail fica confirmado, mas a impressão é de falha.

**O que fazer:** publicar a landing (`landing/`) num endereço fixo, apontar a Site URL para ele e criar uma página simples de "E-mail confirmado, volte ao app".

### 2.3 "Esqueci a senha" não termina

O app envia o e-mail (`resetPasswordForEmail`), mas não há onde criar a nova senha: o app não tem deep link e não existe página web de redefinição (já registrado em `docs/02`, seção de autenticação). Quem esquece a senha fica sem acesso à conta.

**Duas saídas:**

1. **Página web na landing (não exige novo APK):** uma página que recebe o link do Supabase, mostra o campo de nova senha e chama `supabase.auth.updateUser({ password })`, com a mesma regra de senha do app (mínimo 8, letras e números). A Site URL ou o `redirectTo` aponta para ela.
2. **Deep link no app (exige novo APK):** `scheme` no `app.json`, `redirectTo` no `resetPasswordForEmail` e uma tela de nova senha. Resolve dentro do app, mas só para quem instalar a versão nova.

Recomendo a página web agora e o deep link numa versão futura.

### 2.4 Conferência no aparelho

O checklist da seção 4 do `docs/08` precisa ser feito no APK `preview` antes de gerar o `production`. Os pontos que os testes automatizados **não** cobrem e mais podem falhar no Android real:

- alerta tocando com o app fechado e a tela bloqueada;
- botão "Feito" na notificação com o app fechado;
- alertas depois de reiniciar o celular;
- cadastro, confirmação, entrada e sincronização contra o Supabase real;
- sincronização ao voltar a internet;
- exclusão da conta sumindo de Authentication > Users.

### 2.5 Build de release e link de download

1. Gerar o APK `production`: `npx eas-cli build --platform android --profile production`.
2. Hospedar o `.apk` num endereço permanente (GitHub Releases, por exemplo). O link do EAS depende da retenção de builds do plano da conta Expo.
3. Preencher `DOWNLOAD_URL` em `landing/script.js` e tirar "Em breve" do que já estiver no APK.

## 3. Riscos no Android que afetam o uso diário

Não impedem a instalação, mas fazem o app parecer quebrado em alguns aparelhos.

### 3.1 Economia de bateria

Fabricantes como Xiaomi, Samsung e Motorola adiam ou cancelam notificações agendadas de apps com restrição de bateria. Hoje o app só mostra o texto "deixe o Blueprint sem restrição de bateria" no cartão de alertas (`CartaoDeAlertas.tsx`) e um botão para as configurações gerais do app.

**Melhoria sugerida (novo APK):** um botão que abre direto a tela de otimização de bateria do Android (`Linking.sendIntent("android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS")`). Validar na documentação do React Native da versão instalada antes de implementar.

### 3.2 Alertas cobrem só 14 dias

O app agenda no máximo 14 dias à frente e até 120 alertas (`src/domain/alertas.ts`), e reagenda ao abrir ou ao mudar a agenda. Se a pessoa ficar 14 dias sem abrir o app, os alertas param. Com mais de cerca de 8 alertas por dia, a janela fica menor que 14 dias.

**O que fazer:** avisar no cartão de alertas ("abra o app pelo menos uma vez por semana") ou, numa versão futura, reagendar em segundo plano.

### 3.3 Alarme exato

O app declara `SCHEDULE_EXACT_ALARM` e `USE_EXACT_ALARM`. No Android 13 ou mais novo, `USE_EXACT_ALARM` é concedida na instalação. Conferir no aparelho que o alerta toca no minuto certo, de preferência num Android 14 ou 15. Se o app for para a Play Store, ver o aviso da seção 1 do `docs/08`.

### 3.4 Projeto Supabase no plano gratuito

No plano gratuito, o Supabase pausa o projeto depois de um período sem uso. Com o projeto pausado, o app continua funcionando só com os dados do aparelho e a sincronização falha até alguém reativar o projeto no painel. Para uso real com outras pessoas, acompanhar o painel ou mudar de plano.

### 3.5 Atualizações

O app não tem atualização pelo ar (sem `expo-updates`). Cada correção exige um novo `.apk`. Para instalar por cima sem perder dados:

- usar sempre o mesmo projeto EAS (mesma chave de assinatura);
- o `versionCode` novo precisa ser maior que o instalado (o perfil `production` sobe sozinho; os APKs `preview` saíram todos com versionCode 1);
- não desinstalar antes: com `allowBackup: false`, desinstalar apaga os dados do aparelho. Quem tem conta recupera ao entrar; quem não tem perde tudo.

### 3.6 Foto do perfil

A foto fica só no aparelho e não vai para a nuvem. Em outro aparelho ou depois de reinstalar, ela não volta.

## 4. Pendências fora do código

- **LGPD:** os textos de Termos e Política precisam de revisão jurídica antes da distribuição pública. Lista em `docs/09-lgpd-pendencias-juridicas.md`.
- **Leaked password protection:** só existe no plano Pro do Supabase. Fica desligada no plano gratuito.

## 5. O que a pessoa precisa fazer no celular

Texto base para a landing ou para enviar junto com o link:

1. Baixar o `.apk` pelo link oficial.
2. Permitir a instalação: o Android pede para autorizar o navegador ou o gerenciador de arquivos a instalar apps desconhecidos.
3. Se o Play Protect avisar que o app não é conhecido, tocar em "Mais detalhes" e "Instalar mesmo assim". O aviso aparece porque o app não vem da Play Store.
4. Abrir o Blueprint, criar a conta e confirmar o e-mail.
5. Ao salvar o primeiro compromisso com aviso, permitir as notificações.
6. Em Configurações > Apps > Blueprint > Bateria, escolher "Sem restrição" para os alertas tocarem na hora.
7. Abrir o app pelo menos uma vez a cada 14 dias para os alertas continuarem agendados.

## 6. Ordem sugerida

1. Configurar SMTP próprio e Site URL no Supabase (2.1 e 2.2).
2. Publicar a landing com as páginas de "E-mail confirmado" e de nova senha (2.2 e 2.3).
3. Fazer o checklist do `docs/08`, seção 4, no APK `preview` já gerado (2.4).
4. Corrigir o que falhar. Se mexer no app, gerar um novo `preview` e repetir.
5. Gerar o `production`, hospedar o `.apk` e preencher o link da landing (2.5).
6. Numa versão seguinte: atalho da bateria, aviso dos 14 dias e deep link de nova senha (3.1, 3.2 e 2.3).
