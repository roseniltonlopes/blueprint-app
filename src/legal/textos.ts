/**
 * Fonte única dos Termos de Uso e da Política de Privacidade. As telas do app (TermosScreen e
 * PrivacidadeScreen) e as páginas da landing (landing/termos.html e landing/privacidade.html)
 * mostram exatamente estes textos; um teste confere que a landing não ficou para trás.
 * Os pontos que dependem de revisão jurídica estão em docs/09-lgpd-pendencias-juridicas.md.
 */

/** Versão aceita no cadastro: vai no user_metadata do signUp e o banco grava com a data (003). */
export const VERSAO_DOS_TERMOS = "2026-11-22";
export const DATA_DOS_TERMOS = "22 de novembro de 2026";

export const CONTROLADOR = "Rosenilton Lopes";
export const CONTATO = "roseniltonlopes1993@gmail.com";

export type Secao = { titulo: string; paragrafos: readonly string[] };

export type DocumentoLegal = {
  titulo: string;
  versao: string;
  atualizadoEm: string;
  introducao: string;
  secoes: readonly Secao[];
};

export const TERMOS_DE_USO: DocumentoLegal = {
  titulo: "Termos de Uso",
  versao: VERSAO_DOS_TERMOS,
  atualizadoEm: DATA_DOS_TERMOS,
  introducao:
    "Estes termos valem para o aplicativo Blueprint. Ao criar uma conta, você declara que leu e aceita estes termos e a Política de Privacidade.",
  secoes: [
    {
      titulo: "O que o Blueprint faz",
      paragrafos: [
        'O Blueprint ajuda você a organizar a rotina: montar a agenda da semana, receber lembretes no celular, marcar cada compromisso como "Feito" ou "Não fiz" e acompanhar o histórico.',
        "Os dados ficam no seu aparelho. Se você criar uma conta, ficam também na nuvem, para usar o app em mais de um aparelho.",
      ],
    },
    {
      titulo: "Uso pessoal",
      paragrafos: [
        "O app é para uso pessoal. Você pode usá-lo sem conta; nesse caso, os dados ficam só no aparelho.",
      ],
    },
    {
      titulo: "Sua conta e sua senha",
      paragrafos: [
        "Você é responsável pelo e-mail e pela senha da sua conta e por manter a senha em segredo.",
        `Se suspeitar de uso indevido, troque a senha pelo "Esqueci a senha" e escreva para ${CONTATO}.`,
      ],
    },
    {
      titulo: "Não é orientação profissional",
      paragrafos: [
        "O Blueprint organiza a rotina. Ele não oferece orientação médica, psicológica nem nutricional e não substitui o acompanhamento de um profissional.",
      ],
    },
    {
      titulo: "Lembretes",
      paragrafos: [
        "Os lembretes são notificações do próprio aparelho. Não há garantia de que um alerta toque na hora certa: isso depende do aparelho, do sistema, da economia de bateria e das permissões que você concedeu.",
      ],
    },
    {
      titulo: "Disponibilidade",
      paragrafos: [
        "O app e a sincronização com a nuvem podem passar por falhas ou interrupções. Sem internet, o app continua funcionando com os dados do aparelho e sincroniza quando a conexão voltar.",
      ],
    },
    {
      titulo: "Como encerrar a conta",
      paragrafos: [
        'Você pode excluir a conta a qualquer momento em Perfil, seção Privacidade, "Excluir minha conta e dados". Isso apaga a conta e os dados dela na nuvem e no aparelho, e não dá para desfazer.',
        `Você também pode pedir a exclusão pelo e-mail ${CONTATO}.`,
      ],
    },
    {
      titulo: "Mudanças nestes termos",
      paragrafos: [
        "Se estes termos mudarem, a nova versão aparece no app. A versão e a data no topo mostram qual texto está valendo.",
      ],
    },
    {
      titulo: "Lei aplicável",
      paragrafos: [
        "Estes termos seguem as leis do Brasil, inclusive a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018).",
      ],
    },
    {
      titulo: "Contato",
      paragrafos: [`Dúvidas sobre estes termos: ${CONTROLADOR}, ${CONTATO}.`],
    },
  ],
};

export const POLITICA_DE_PRIVACIDADE: DocumentoLegal = {
  titulo: "Política de Privacidade",
  versao: VERSAO_DOS_TERMOS,
  atualizadoEm: DATA_DOS_TERMOS,
  introducao:
    "Esta política explica quais dados o Blueprint guarda, para quê e como você controla esses dados, de acordo com a Lei Geral de Proteção de Dados Pessoais (LGPD, Lei nº 13.709/2018).",
  secoes: [
    {
      titulo: "Quem é o responsável",
      paragrafos: [
        `O responsável pelos dados (controlador) é ${CONTROLADOR}, pessoa física. Contato: ${CONTATO}.`,
      ],
    },
    {
      titulo: "Sem conta",
      paragrafos: ["Sem conta, tudo fica só no seu aparelho e nada é enviado para servidores."],
    },
    {
      titulo: "Dados guardados com conta",
      paragrafos: [
        "O e-mail e a senha. A senha fica com o provedor de autenticação só em forma cifrada (hash): ninguém consegue lê-la.",
        "O nome que você escolher no perfil, se escolher.",
        'A agenda: atividades, compromissos, períodos e avisos antes de cada compromisso. Os registros de "Feito" e "Não fiz" e as ações de hábito registradas.',
        "O fuso horário do aparelho no momento do cadastro.",
        "A versão destes termos que você aceitou e a data do aceite, gravada pelo servidor.",
        "A foto do perfil, as preferências de aparência e a meta diária ficam só no aparelho e não são enviadas.",
      ],
    },
    {
      titulo: "Para que usamos",
      paragrafos: [
        "Só para guardar a sua rotina e sincronizá-la entre os seus aparelhos, para você entrar na conta e para recuperar a senha por e-mail.",
      ],
    },
    {
      titulo: "Base legal",
      paragrafos: [
        "Execução do contrato (art. 7º, inciso V, da LGPD): os dados são necessários para o app fazer o que você pediu ao criar a conta.",
        "Consentimento (art. 7º, inciso I): dado ao marcar a caixa de aceite no cadastro. Você pode revogá-lo a qualquer momento excluindo a conta.",
      ],
    },
    {
      titulo: "Onde os dados ficam",
      paragrafos: [
        "Os dados da conta ficam no Supabase, provedor de banco de dados e de autenticação, em servidores na região de São Paulo (sa-east-1). O Supabase é uma empresa estrangeira e trata os dados conforme os termos dele.",
        "No aparelho, os dados ficam no armazenamento interno do app.",
      ],
    },
    {
      titulo: "Compartilhamento",
      paragrafos: [
        "Os dados não são vendidos nem compartilhados com terceiros. Quem os armazena, por nossa conta, é só o provedor de infraestrutura (Supabase).",
        "Não usamos os dados para publicidade nem para decisões automatizadas sobre você. As contas e porcentagens do histórico existem só para você acompanhar a própria rotina.",
      ],
    },
    {
      titulo: "Por quanto tempo",
      paragrafos: [
        "Enquanto a conta existir. Ao excluir a conta pelo app, a conta e os dados dela são apagados da nuvem e do aparelho na mesma hora.",
        "Cópias de segurança feitas pelo provedor de infraestrutura podem conter esses dados por um período adicional, conforme as rotinas do provedor, até serem descartadas.",
      ],
    },
    {
      titulo: "Seus direitos",
      paragrafos: [
        "Pelo art. 18 da LGPD, você pode: confirmar se tratamos seus dados e acessá-los; corrigir dados (o nome e a agenda se corrigem no próprio app); pedir a exclusão, no app ou pelo e-mail; revogar o consentimento, o que encerra a conta; e saber com quem os dados são compartilhados.",
        `Para pedidos pelo e-mail ${CONTATO}, a resposta vem em até 15 dias.`,
      ],
    },
    {
      titulo: "Notificações e sessão",
      paragrafos: [
        "Os lembretes são notificações locais: o próprio aparelho agenda e dispara, sem passar por servidor.",
        "A sessão da conta (o acesso que mantém você conectado) fica guardada no armazenamento do app, no aparelho, e é apagada quando você sai.",
      ],
    },
    {
      titulo: "Segurança",
      paragrafos: [
        "Cada conta só enxerga os próprios dados: o banco aplica essa regra em toda consulta. A comunicação com a nuvem é cifrada (HTTPS).",
      ],
    },
    {
      titulo: "Mudanças nesta política",
      paragrafos: [
        "Se esta política mudar, a nova versão aparece no app. A versão e a data no topo mostram qual texto está valendo.",
      ],
    },
    {
      titulo: "Contato",
      paragrafos: [`${CONTROLADOR}, ${CONTATO}.`],
    },
  ],
};
