import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { PerfilRepository } from "../data/PerfilRepository";
import type { Resultado } from "../domain/agenda";
import {
  PERFIL_PADRAO,
  fotoValida,
  nomeParaExibir,
  normalizarNome,
  validarNome,
  type Perfil,
} from "../domain/perfil";

export type UsePerfil = {
  perfil: Perfil;
  /** Nome para mostrar: o escolhido ou "Convidado" */
  nomeExibido: string;
  salvarNome: (nome: string) => Resultado<void>;
  /** null remove a foto e volta para as iniciais */
  definirFoto: (foto: string | null) => Resultado<void>;
};

const PerfilContext = createContext<UsePerfil | null>(null);

const SUCESSO: Resultado<void> = { ok: true, valor: undefined };

type PerfilProviderProps = {
  children: ReactNode;
  perfilInicial?: Perfil;
  /** Onde gravar cada mudança. Sem repositório, o estado fica só em memória (testes). */
  repositorio?: PerfilRepository;
};

/** Estado do perfil compartilhado entre as telas. Cada mudança valida e só então grava. */
export function PerfilProvider({
  children,
  perfilInicial = PERFIL_PADRAO,
  repositorio,
}: PerfilProviderProps) {
  const [perfil, setPerfil] = useState<Perfil>(perfilInicial);
  const primeiraRenderizacao = useRef(true);

  useEffect(() => {
    // O estado inicial veio do próprio repositório; só grava a partir da 1ª mudança.
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false;
      return;
    }
    repositorio?.salvar(perfil).catch((erro: unknown) => {
      console.warn("Não foi possível salvar o perfil no aparelho.", erro);
    });
  }, [perfil, repositorio]);

  const salvarNome = useCallback<UsePerfil["salvarNome"]>((nome) => {
    const erro = validarNome(nome);
    if (erro !== null) return { ok: false, erro };
    setPerfil((atual) => ({ ...atual, nome: normalizarNome(nome) }));
    return SUCESSO;
  }, []);

  const definirFoto = useCallback<UsePerfil["definirFoto"]>((foto) => {
    if (foto !== null && !fotoValida(foto)) {
      return { ok: false, erro: "Essa foto não pôde ser usada. Escolha outra." };
    }
    setPerfil((atual) => ({ ...atual, foto }));
    return SUCESSO;
  }, []);

  const valor = useMemo<UsePerfil>(
    () => ({ perfil, nomeExibido: nomeParaExibir(perfil), salvarNome, definirFoto }),
    [perfil, salvarNome, definirFoto],
  );

  return <PerfilContext.Provider value={valor}>{children}</PerfilContext.Provider>;
}

export function usePerfil(): UsePerfil {
  const contexto = useContext(PerfilContext);
  if (contexto === null) {
    throw new Error("usePerfil precisa estar dentro de um PerfilProvider");
  }
  return contexto;
}
