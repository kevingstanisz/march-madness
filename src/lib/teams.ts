export const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]

export const TEAMS_2025: { name: string; seed: number; region: string }[] = [
  // 1 seeds
  { name: "Auburn", seed: 1, region: "East" },
  { name: "Duke", seed: 1, region: "South" },
  { name: "Houston", seed: 1, region: "West" },
  { name: "Florida", seed: 1, region: "Midwest" },
  // 2 seeds
  { name: "Michigan State", seed: 2, region: "East" },
  { name: "Alabama", seed: 2, region: "South" },
  { name: "Tennessee", seed: 2, region: "West" },
  { name: "St. John's", seed: 2, region: "Midwest" },
  // 3 seeds
  { name: "Iowa State", seed: 3, region: "East" },
  { name: "Wisconsin", seed: 3, region: "South" },
  { name: "Kentucky", seed: 3, region: "West" },
  { name: "Texas Tech", seed: 3, region: "Midwest" },
  // 4 seeds
  { name: "Arizona", seed: 4, region: "East" },
  { name: "Maryland", seed: 4, region: "South" },
  { name: "Purdue", seed: 4, region: "West" },
  { name: "Kansas", seed: 4, region: "Midwest" },
  // 5 seeds
  { name: "Michigan", seed: 5, region: "East" },
  { name: "Oregon", seed: 5, region: "South" },
  { name: "Clemson", seed: 5, region: "West" },
  { name: "Memphis", seed: 5, region: "Midwest" },
  // 6 seeds
  { name: "Mississippi", seed: 6, region: "East" },
  { name: "BYU", seed: 6, region: "South" },
  { name: "Illinois", seed: 6, region: "West" },
  { name: "Missouri", seed: 6, region: "Midwest" },
  // 7 seeds
  { name: "Marquette", seed: 7, region: "East" },
  { name: "Saint Mary's", seed: 7, region: "South" },
  { name: "UCLA", seed: 7, region: "West" },
  { name: "Kansas State", seed: 7, region: "Midwest" },
  // 8 seeds
  { name: "Louisville", seed: 8, region: "East" },
  { name: "Mississippi State", seed: 8, region: "South" },
  { name: "Gonzaga", seed: 8, region: "West" },
  { name: "UConn", seed: 8, region: "Midwest" },
  // 9 seeds
  { name: "Creighton", seed: 9, region: "East" },
  { name: "Baylor", seed: 9, region: "South" },
  { name: "Georgia", seed: 9, region: "West" },
  { name: "Arkansas", seed: 9, region: "Midwest" },
  // 10 seeds
  { name: "New Mexico", seed: 10, region: "East" },
  { name: "Vanderbilt", seed: 10, region: "South" },
  { name: "Utah State", seed: 10, region: "West" },
  { name: "Drake", seed: 10, region: "Midwest" },
  // 11 seeds
  { name: "NC State", seed: 11, region: "East" },
  { name: "VCU", seed: 11, region: "South" },
  { name: "Texas", seed: 11, region: "West" },
  { name: "Penn State", seed: 11, region: "Midwest" },
  // 12 seeds
  { name: "UC San Diego", seed: 12, region: "East" },
  { name: "Colorado State", seed: 12, region: "South" },
  { name: "McNeese", seed: 12, region: "West" },
  { name: "Liberty", seed: 12, region: "Midwest" },
  // 13 seeds
  { name: "Yale", seed: 13, region: "East" },
  { name: "High Point", seed: 13, region: "South" },
  { name: "Akron", seed: 13, region: "West" },
  { name: "Troy", seed: 13, region: "Midwest" },
  // 14 seeds
  { name: "Lipscomb", seed: 14, region: "East" },
  { name: "Bryant", seed: 14, region: "South" },
  { name: "Colgate", seed: 14, region: "West" },
  { name: "Wofford", seed: 14, region: "Midwest" },
  // 15 seeds
  { name: "Robert Morris", seed: 15, region: "East" },
  { name: "Montana", seed: 15, region: "South" },
  { name: "UTEP", seed: 15, region: "West" },
  { name: "Omaha", seed: 15, region: "Midwest" },
  // 16 seeds
  { name: "Alabama State", seed: 16, region: "East" },
  { name: "SIU Edwardsville", seed: 16, region: "South" },
  { name: "Norfolk State", seed: 16, region: "West" },
  { name: "American", seed: 16, region: "Midwest" },
]

export function getTeamsBySeed(seed: number) {
  return TEAMS_2025.filter(t => t.seed === seed)
}

export function calculatePoints(winningSeed: number, losingSeed: number): number {
  return 17 - losingSeed
}
