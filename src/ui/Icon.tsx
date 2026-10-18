import Svg, { Circle, Path, Rect } from "react-native-svg";
import type { ReactNode } from "react";

/** Ícones de traço do canvas v2 (viewBox 24x24). */
export type IconName =
  | "hidratacao"
  | "exercicio"
  | "descanso"
  | "estudo"
  | "outro"
  | "sol"
  | "lua"
  | "mais"
  | "check"
  | "hoje"
  | "calendario"
  | "historico"
  | "perfil"
  | "anterior"
  | "proximo";

type IconProps = {
  name: IconName;
  color: string;
  size?: number;
  strokeWidth?: number;
};

function desenho(name: IconName, color: string): ReactNode {
  switch (name) {
    case "hidratacao":
      return (
        <Path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
      );
    case "exercicio":
      return (
        <>
          <Path d="M6.5 6.5v11" />
          <Path d="M17.5 6.5v11" />
          <Path d="M3.5 9v6" />
          <Path d="M20.5 9v6" />
          <Path d="M6.5 12h11" />
        </>
      );
    case "descanso":
    case "lua":
      return <Path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />;
    case "estudo":
      return (
        <>
          <Path d="M12 7v14" />
          <Path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
        </>
      );
    case "outro":
      return (
        <>
          <Circle cx="5" cy="12" r="1.3" fill={color} />
          <Circle cx="12" cy="12" r="1.3" fill={color} />
          <Circle cx="19" cy="12" r="1.3" fill={color} />
        </>
      );
    case "sol":
      return (
        <>
          <Circle cx="12" cy="12" r="4" />
          <Path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </>
      );
    case "mais":
      return (
        <>
          <Path d="M5 12h14" />
          <Path d="M12 5v14" />
        </>
      );
    case "check":
      return <Path d="M20 6 9 17l-5-5" />;
    case "hoje":
      return (
        <>
          <Circle cx="12" cy="12" r="10" />
          <Path d="m9 12 2 2 4-4" />
        </>
      );
    case "calendario":
      return (
        <>
          <Rect x="3" y="4" width="18" height="18" rx="3" />
          <Path d="M16 2v4M8 2v4M3 10h18" />
        </>
      );
    case "historico":
      return (
        <>
          <Circle cx="12" cy="12" r="10" />
          <Path d="M12 6v6l4 2" />
        </>
      );
    case "anterior":
      return <Path d="m15 18-6-6 6-6" />;
    case "proximo":
      return <Path d="m9 18 6-6-6-6" />;
    case "perfil":
      return (
        <>
          <Path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <Circle cx="12" cy="7" r="4" />
        </>
      );
  }
}

export function Icon({ name, color, size = 22, strokeWidth = 1.9 }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {desenho(name, color)}
    </Svg>
  );
}
