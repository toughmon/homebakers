// Shared silhouettes keep the SVG fallback and the metal models identical.
export const badgeDesigns: Record<
  string,
  { outline: string; inscription: string; edition: string }
> = {
  "first-bake": {
    outline:
      "M64 8C76 8 78 20 88 20S100 32 100 42 116 52 116 64 104 76 104 88 92 100 82 100 76 116 64 116 52 104 42 104 28 96 28 86 12 76 12 64 24 52 24 42 36 28 46 28 52 8 64 8Z",
    inscription: "FIRST BAKE",
    edition: "01",
  },
  "five-bakes": {
    outline:
      "M32 12H96Q116 12 116 32V96Q116 116 96 116H32Q12 116 12 96V32Q12 12 32 12Z",
    inscription: "FIVE BAKES",
    edition: "02",
  },
  "three-categories": {
    outline: "M64 6L112 34V94L64 122 16 94V34Z",
    inscription: "BAKING EXPLORER",
    edition: "03",
  },
  weekly: {
    outline: "M12 62C12-6 116-6 116 62V102Q116 116 102 116H26Q12 116 12 102Z",
    inscription: "BAKE TOGETHER",
    edition: "04",
  },
  helpful: {
    outline:
      "M64 118C48 105 8 76 8 43 8 10 46 4 64 30 82 4 120 10 120 43 120 76 80 105 64 118Z",
    inscription: "KIND HEART",
    edition: "05",
  },
  answer: {
    outline:
      "M64 8C80 20 98 22 114 22V62C114 90 94 110 64 122 34 110 14 90 14 62V22C30 22 48 20 64 8Z",
    inscription: "PROBLEM SOLVER",
    edition: "06",
  },
};
export function badgeDesign(id: string) {
  return badgeDesigns[id] ?? badgeDesigns["first-bake"]!;
}
