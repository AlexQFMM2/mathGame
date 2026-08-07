export const GAME_VIEWPORT = {
  width: 320,
  height: 640,
} as const;

export type GameId = "sudoku" | "crossmath" | "grid-architect";

export type GameStatus = "available" | "coming-soon";

export interface GameDescriptor {
  id: GameId;
  title: string;
  subtitle: string;
  status: GameStatus;
}

export const GAME_CATALOG: readonly GameDescriptor[] = [
  {
    id: "sudoku",
    title: "数独",
    subtitle: "从候选数中找到唯一答案",
    status: "available",
  },
  {
    id: "crossmath",
    title: "算术填字",
    subtitle: "让横竖每条数学关系都成立",
    status: "available",
  },
  {
    id: "grid-architect",
    title: "格点建筑师",
    subtitle: "用面积、周长与对称建造图形",
    status: "available",
  },
];
