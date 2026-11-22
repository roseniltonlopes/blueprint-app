# 09. LGPD: pendências para revisão jurídica

Os Termos de Uso e a Política de Privacidade (`src/legal/textos.ts`, versão `2026-11-22`) foram escritos em linguagem simples, a partir do que o app faz de fato. **Não foram revisados por advogado.** Antes de divulgar o app para além de uso pessoal ou acadêmico, um profissional precisa olhar os pontos abaixo.

Controlador: Rosenilton Lopes (pessoa física). Contato público: roseniltonlopes1993@gmail.com.

## 1. Pontos para o advogado

| # | Ponto | Como está hoje | Dúvida |
| :-: | :--- | :--- | :--- |
| 1 | **Base legal** | A política cita execução do contrato (art. 7º, V) e consentimento (art. 7º, I), dado na caixa de aceite. | Usar as duas bases é adequado? Se a base principal for a execução do contrato, revogar o consentimento precisa mesmo encerrar a conta, como o texto diz? |
| 2 | **Retenção e cópias de segurança do provedor** | "Cópias de segurança feitas pelo provedor de infraestrutura podem conter esses dados por um período adicional, conforme as rotinas do provedor." | Confirmar no contrato e no plano do Supabase por quanto tempo os backups guardam dados e se é preciso citar um prazo. |
| 3 | **Transferência internacional** | Servidores em São Paulo (sa-east-1), mas o Supabase é empresa estrangeira (EUA). O texto só diz que é "empresa estrangeira". | Há transferência internacional no sentido do art. 33 (suporte, acesso remoto, subprocessadores)? Que cláusulas ou avisos são necessários? |
| 4 | **Idade mínima e menores** | Os textos não falam de idade. | Definir idade mínima ou exigir consentimento dos pais ou responsáveis (art. 14) e escrever a regra nos termos. |
| 5 | **Encarregado (DPO)** | Não há encarregado nomeado; o contato é o do controlador. | Pessoa física que trata dados para uso próprio de um app gratuito precisa nomear encarregado? A Resolução CD/ANPD nº 2/2022 (agentes de pequeno porte) se aplica? |
| 6 | **Foro** | Os termos só dizem que seguem as leis do Brasil. | Definir foro (ou deixar o do domicílio do consumidor, pelo CDC). |
| 7 | **Limitação de responsabilidade** | Os termos dizem que não há garantia de que um alerta toque e que o app pode ter falhas. | Redação aceitável diante do CDC? Precisa de cláusula mais clara de limitação? |
| 8 | **Registro das versões aceitas** | O banco grava `perfis.termos_versao` e `perfis.termos_aceitos_em` (hora do servidor) no cadastro. Quem já tinha conta antes da migração 003 fica sem registro. | Isso basta como prova do consentimento? É preciso pedir novo aceite a quem não tem registro ou quando a versão mudar? |
| 9 | **Termos da loja** | O app é distribuído por `.apk`, fora da Play Store. | Se publicar na Play Store, conferir a política de dados da loja (formulário de segurança dos dados, link público da política) e se os textos atendem. |
| 10 | **Prazo de resposta ao titular** | "A resposta vem em até 15 dias" para pedidos por e-mail. | Confirmar o prazo do art. 19 para cada tipo de pedido (confirmação, acesso, correção, exclusão). |
| 11 | **Direito de portabilidade** | O app não exporta os dados em arquivo; o texto não promete portabilidade. | Precisa oferecer exportação (art. 18, V) ou basta atender por e-mail? |

## 2. Coletar só o necessário (revisão técnica)

| Dado | Onde | Necessário? |
| :--- | :--- | :--- |
| E-mail e senha | Supabase Auth | Sim (login e recuperação de senha). |
| Nome | `perfis.nome` e `user_metadata.nome` | Opcional. A cópia no `user_metadata` (feita no cadastro) fica no Auth mesmo depois de a pessoa mudar o nome no app. Dá para deixar de enviar o nome no cadastro: a sincronização já sobe o nome para `perfis`. |
| Fuso horário | `perfis.fuso` e `user_metadata.fuso` | **Hoje não é usado**: o app calcula os dias pelo relógio do aparelho e não lê `perfis.fuso`. Candidato a deixar de enviar no cadastro até ser usado. |
| Versão dos termos | `perfis.termos_versao` e `user_metadata.termos_versao` | Sim em `perfis` (prova do aceite). A cópia no `user_metadata` é o caminho que o gatilho usa e fica guardada no Auth. |
| Tema, destaque e meta diária | `perfis.tema`, `perfis.destaque`, `perfis.meta_diaria` | O app não envia; o banco guarda os valores padrão. Não são dados da pessoa hoje. |
| Foto do perfil | Só no aparelho | O bucket `avatares` existe, mas o app não envia fotos. |
| Agenda, registros e ações | Tabelas da agenda | Sim (é o serviço). |

## 3. O que já está feito no app

- Caixa de aceite desmarcada no cadastro; "Criar conta" só habilita depois de marcar.
- Termos e Política no app (funcionam sem internet) e na landing (`landing/termos.html`, `landing/privacidade.html`), com o mesmo texto: um teste compara os dois.
- Exclusão da conta e de todos os dados pelo próprio app (Perfil > Privacidade), com dupla confirmação; sem conta, apagar os dados do aparelho.
- A data do aceite é a do servidor; o app não consegue escrever nem alterar as colunas do aceite (permissões por coluna na migração 003).
- Sem publicidade, sem rastreadores e sem envio da foto.
