// Link do botão "Baixar". Troque pelo endereço do .apk quando ele existir.
// Enquanto estiver vazio, os botões levam para a chamada final da página.
const DOWNLOAD_URL = "";

if (DOWNLOAD_URL) {
  document.querySelectorAll("[data-download]").forEach((link) => {
    link.setAttribute("href", DOWNLOAD_URL);
  });
}

// Linha fina no topo depois que a página rola.
const topo = document.getElementById("topo");
function marcarRolagem() {
  topo.classList.toggle("rolou", window.scrollY > 8);
}
marcarRolagem();
window.addEventListener("scroll", marcarRolagem, { passive: true });

// Revela os blocos ao entrar na tela. Sem IntersectionObserver, mostra tudo.
const itens = document.querySelectorAll(".revelar");
if ("IntersectionObserver" in window) {
  const observador = new IntersectionObserver(
    (entradas) => {
      for (const entrada of entradas) {
        if (entrada.isIntersecting) {
          entrada.target.classList.add("visivel");
          observador.unobserve(entrada.target);
        }
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
  );
  itens.forEach((item) => observador.observe(item));
} else {
  itens.forEach((item) => item.classList.add("visivel"));
}
