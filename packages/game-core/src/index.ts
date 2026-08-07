export const GAME_VIEWPORT = {
  width: 320,
  height: 640,
} as const;

export type GameId = "sudoku";

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
];
