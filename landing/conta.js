/*
 * Páginas de conta do Blueprint: e-mail confirmado e nova senha.
 * O Supabase devolve o resultado do link no fragmento da URL (#access_token=...&type=...)
 * ou, em erro, como #error=...&error_code=...&error_description=...
 */
(function () {
  "use strict";

  let SENHA_MIN = 8;
  let SENHA_MAX = 72;
  let TEM_LETRA = /[A-Za-z]/;
  let TEM_DIGITO = /[0-9]/;

  /** Mesma regra do app (src/domain/conta.ts). */
  function validarSenha(senha) {
    if (senha.length < SENHA_MIN) return "A senha precisa ter pelo menos 8 caracteres";
    if (senha.length > SENHA_MAX) return "A senha pode ter no máximo 72 caracteres";
    if (!TEM_LETRA.test(senha) || !TEM_DIGITO.test(senha)) {
      return "A senha precisa ter letras e números";
    }
    return null;
  }

  function parametrosDoFragmento() {
    let bruto = window.location.hash.replace(/^#/, "");
    let lista = {};
    bruto.split("&").forEach(function (par) {
      if (!par) return;
      let partes = par.split("=");
      lista[decodeURIComponent(partes[0])] = decodeURIComponent(
        (partes[1] || "").replace(/\+/g, " "),
      );
    });
    return lista;
  }

  /** Mensagem em português para os erros que o Supabase devolve no link. */
  function textoDoErro(parametros) {
    if (parametros.error_code === "otp_expired") return "Este link expirou ou já foi usado.";
    if (parametros.error_code === "access_denied") return "O link não é mais válido.";
    return "Não foi possível usar este link.";
  }

  function mostrar(id, visivel) {
    let elemento = document.getElementById(id);
    if (elemento) elemento.hidden = !visivel;
  }

  /**
   * Link de "Esqueci a senha" que caiu na Site URL (início ou e-mail confirmado): leva para a
   * página de nova senha com o mesmo fragmento. Devolve true quando encaminhou.
   */
  function encaminharRecuperacao() {
    let parametros = parametrosDoFragmento();
    if (parametros.type === "recovery" && window.location.pathname.indexOf("nova-senha") === -1) {
      window.location.replace("nova-senha.html" + window.location.hash);
      return true;
    }
    return false;
  }

  function mostrarResultadoDaConfirmacao() {
    if (encaminharRecuperacao()) return;
    let parametros = parametrosDoFragmento();
    if (parametros.error || parametros.error_code) {
      document.getElementById("erro-texto").textContent = textoDoErro(parametros);
      mostrar("ok", false);
      mostrar("erro", true);
    }
    // Tira os tokens da barra de endereço: a página não usa a sessão.
    if (window.location.hash) {
      history.replaceState(null, "", window.location.pathname);
    }
  }

  function iniciarNovaSenha() {
    let config = window.BLUEPRINT_CONFIG || {};
    let parametros = parametrosDoFragmento();

    function invalido(texto) {
      document.getElementById("invalido-texto").textContent = texto;
      mostrar("carregando", false);
      mostrar("formulario", false);
      mostrar("invalido", true);
    }

    if (!config.supabaseUrl || !config.supabaseChavePublicavel || !window.supabase) {
      invalido("Esta página ainda não foi configurada. Avise o responsável pelo Blueprint.");
      return;
    }
    if (parametros.error || parametros.error_code) {
      invalido(textoDoErro(parametros));
      return;
    }

    let cliente = window.supabase.createClient(config.supabaseUrl, config.supabaseChavePublicavel, {
      auth: { detectSessionInUrl: true, persistSession: false, autoRefreshToken: false },
    });
    let liberado = false;

    function liberarFormulario() {
      if (liberado) return;
      liberado = true;
      mostrar("carregando", false);
      mostrar("formulario", true);
      document.getElementById("senha").focus();
    }

    cliente.auth.onAuthStateChange(function (evento, sessao) {
      if (evento === "PASSWORD_RECOVERY" || (sessao && parametros.type === "recovery")) {
        liberarFormulario();
      }
    });

    // Sem evento em alguns segundos: o link não trouxe uma sessão de recuperação válida.
    window.setTimeout(function () {
      if (!liberado) invalido("Este link expirou ou já foi usado.");
    }, 6000);

    let formulario = document.getElementById("formulario");
    let erro = document.getElementById("erro");
    let botao = document.getElementById("salvar");

    formulario.addEventListener("submit", function (evento) {
      evento.preventDefault();
      let senha = document.getElementById("senha").value;
      let confirmacao = document.getElementById("confirmacao").value;
      let problema = validarSenha(senha);
      if (!problema && senha !== confirmacao) problema = "As duas senhas precisam ser iguais";
      if (problema) {
        erro.textContent = problema;
        erro.hidden = false;
        return;
      }
      erro.hidden = true;
      botao.disabled = true;
      botao.textContent = "Salvando…";
      cliente.auth
        .updateUser({ password: senha })
        .then(function (resposta) {
          if (resposta.error) throw resposta.error;
          return cliente.auth.signOut();
        })
        .then(function () {
          history.replaceState(null, "", window.location.pathname);
          mostrar("formulario", false);
          mostrar("pronto", true);
        })
        .catch(function (falha) {
          let codigo = falha && falha.code;
          erro.textContent =
            codigo === "same_password"
              ? "A nova senha precisa ser diferente da anterior"
              : codigo === "weak_password"
                ? "Senha fraca: use pelo menos 8 caracteres, com letras e números"
                : "Não foi possível salvar. Confira a internet e tente de novo.";
          erro.hidden = false;
          botao.disabled = false;
          botao.textContent = "Salvar nova senha";
        });
    });
  }

  window.BlueprintConta = {
    encaminharRecuperacao: encaminharRecuperacao,
    mostrarResultadoDaConfirmacao: mostrarResultadoDaConfirmacao,
    iniciarNovaSenha: iniciarNovaSenha,
  };
})();
