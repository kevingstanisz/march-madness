export const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]

export const TEAMS_2025: { name: string; seed: number; region: string }[] = [
  // 1 seeds
  { name: "Duke", seed: 1, region: "East" },
  { name: "Florida", seed: 1, region: "South" },
  { name: "Arizona", seed: 1, region: "West" },
  { name: "Michigan", seed: 1, region: "Midwest" },
  // 2 seeds
  { name: "UConn", seed: 2, region: "East" },
  { name: "Houston", seed: 2, region: "South" },
  { name: "Purdue", seed: 2, region: "West" },
  { name: "Iowa State", seed: 2, region: "Midwest" },
  // 3 seeds
  { name: "Michigan State", seed: 3, region: "East" },
  { name: "Illinois", seed: 3, region: "South" },
  { name: "Gonzaga", seed: 3, region: "West" },
  { name: "Virginia", seed: 3, region: "Midwest" },
  // 4 seeds
  { name: "Kansas", seed: 4, region: "East" },
  { name: "Nebraska", seed: 4, region: "South" },
  { name: "Arkansas", seed: 4, region: "West" },
  { name: "Alabama", seed: 4, region: "Midwest" },
  // 5 seeds
  { name: "St. John's", seed: 5, region: "East" },
  { name: "Vanderbilt", seed: 5, region: "South" },
  { name: "Wisconsin", seed: 5, region: "West" },
  { name: "Texas Tech", seed: 5, region: "Midwest" },
  // 6 seeds
  { name: "Louisville", seed: 6, region: "East" },
  { name: "North Carolina", seed: 6, region: "South" },
  { name: "BYU", seed: 6, region: "West" },
  { name: "Tennessee", seed: 6, region: "Midwest" },
  // 7 seeds
  { name: "UCLA", seed: 7, region: "East" },
  { name: "Saint Mary's", seed: 7, region: "South" },
  { name: "Miami", seed: 7, region: "West" },
  { name: "Kentucky", seed: 7, region: "Midwest" },
  // 8 seeds
  { name: "TCU", seed: 8, region: "East" },
  { name: "Clemson", seed: 8, region: "South" },
  { name: "Villanova", seed: 8, region: "West" },
  { name: "Georgia", seed: 8, region: "Midwest" },
  // 9 seeds
  { name: "Ohio State", seed: 9, region: "East" },
  { name: "Iowa", seed: 9, region: "South" },
  { name: "Utah State", seed: 9, region: "West" },
  { name: "Saint Louis", seed: 9, region: "Midwest" },
  // 10 seeds
  { name: "UCF", seed: 10, region: "East" },
  { name: "Texas A&M", seed: 10, region: "South" },
  { name: "Missouri", seed: 10, region: "West" },
  { name: "Santa Clara", seed: 10, region: "Midwest" },
  // 11 seeds
  { name: "South Florida", seed: 11, region: "East" },
  { name: "VCU", seed: 11, region: "South" },
  { name: "Texas", seed: 11, region: "West" },
  { name: "NC State", seed: 11, region: "West" },
  { name: "Miami (Ohio)", seed: 11, region: "Midwest" },
  { name: "SMU", seed: 11, region: "Midwest" },
  // 12 seeds
  { name: "Northern Iowa", seed: 12, region: "East" },
  { name: "McNeese", seed: 12, region: "South" },
  { name: "High Point", seed: 12, region: "West" },
  { name: "Akron", seed: 12, region: "Midwest" },
  // 13 seeds
  { name: "Cal Baptist", seed: 13, region: "East" },
  { name: "Troy", seed: 13, region: "South" },
  { name: "Hawaii", seed: 13, region: "West" },
  { name: "Hofstra", seed: 13, region: "Midwest" },
  // 14 seeds
  { name: "North Dakota State", seed: 14, region: "East" },
  { name: "Penn", seed: 14, region: "South" },
  { name: "Kennesaw State", seed: 14, region: "West" },
  { name: "Wright State", seed: 14, region: "Midwest" },
  // 15 seeds
  { name: "Furman", seed: 15, region: "East" },
  { name: "Idaho", seed: 15, region: "South" },
  { name: "Queens", seed: 15, region: "West" },
  { name: "Tennessee State", seed: 15, region: "Midwest" },
  // 16 seeds
  { name: "Siena", seed: 16, region: "East" },
  { name: "Prairie View A&M", seed: 16, region: "South" },
  { name: "Lehigh", seed: 16, region: "South" },
  { name: "LIU", seed: 16, region: "West" },
  { name: "UMBC", seed: 16, region: "Midwest" },
  { name: "Howard", seed: 16, region: "Midwest" },
]

export function getTeamsBySeed(seed: number) {
  return TEAMS_2025.filter(t => t.seed === seed)
}

export function calculatePoints(winningSeed: number, losingSeed: number): number {
  return 17 - losingSeed
}
