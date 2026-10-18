import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { DadosDeCadastro, ResultadoDoCadastro, ServicoDeAutenticacao, Usuario } from "./tipos";

export type EstadoDaAutenticacao =
  | { situacao: "carregando" }
  | { situacao: "desconectado" }
  | { situacao: "conectado"; usuario: Usuario }
  /** Supabase não configurado no .env: o app funciona só com dados locais */
  | { situacao: "indisponivel" };

type ValorDoContexto = {
  estado: EstadoDaAutenticacao;
  entrar: (email: string, senha: string) => Promise<void>;
  cadastrar: (dados: DadosDeCadastro) => Promise<ResultadoDoCadastro>;
  sair: () => Promise<void>;
};

const AuthContext = createContext<ValorDoContexto | null>(null);

type AuthProviderProps = {
  children: ReactNode;
  /** null quando o Supabase não está configurado */
  servico: ServicoDeAutenticacao | null;
};

export function AuthProvider({ children, servico }: AuthProviderProps) {
  const [estado, setEstado] = useState<EstadoDaAutenticacao>(
    servico ? { situacao: "carregando" } : { situacao: "indisponivel" },
  );

  useEffect(() => {
    if (!servico) {
      return;
    }
    let ativo = true;
    const aplicar = (usuario: Usuario | null) => {
      if (ativo) {
        setEstado(usuario ? { situacao: "conectado", usuario } : { situacao: "desconectado" });
      }
    };
    servico
      .usuarioAtual()
      .then(aplicar)
      .catch((erro: unknown) => {
        console.warn("Não foi possível ler a sessão salva.", erro);
        aplicar(null);
      });
    const cancelar = servico.aoMudarUsuario(aplicar);
    return () => {
      ativo = false;
      cancelar();
    };
  }, [servico]);

  const exigirServico = useCallback(() => {
    if (!servico) {
      throw new Error("Autenticação indisponível: Supabase não configurado.");
    }
    return servico;
  }, [servico]);

  const valor = useMemo<ValorDoContexto>(
    () => ({
      estado,
      entrar: (email, senha) => exigirServico().entrar(email, senha),
      cadastrar: (dados) => exigirServico().cadastrar(dados),
      sair: () => exigirServico().sair(),
    }),
    [estado, exigirServico],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth(): ValorDoContexto {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error("useAuth precisa estar dentro de um AuthProvider.");
  }
  return contexto;
}
