// Single source of truth for the game map's geography.
//
// Coordinates are real WGS84 positions (mostly read off OpenStreetMap), so the
// layout of Elephantine and its neighbours is true to life. Distances are then
// compressed by SCALE so a lap fits a two-minute run.

/** Where the kayak may paddle. Everything outside is scenery. */
export const PLAY_BOUNDS = {
  south: 24.0795,
  north: 24.1045,
  west: 32.8768,
  east: 32.899,
}

/** Terrain and water extend this far so the play area never ends in a void. */
export const WORLD_BOUNDS = {
  south: 24.0725,
  north: 24.1115,
  west: 32.8685,
  east: 32.9075,
}

/** Projection origin — roughly the middle of the play area. */
export const ORIGIN = { lat: 24.092, lon: 32.8879 }

/** Game units per real metre. 1 unit reads as "about a metre" at kayak scale. */
export const SCALE = 0.24

/** Terrain/SDF grid spacing in game units. */
export const TERRAIN_CELL = 1.5
/** Collision SDF spacing (shipped to the client). */
export const SDF_CELL = 2

/**
 * Landmarks double as discovery checkpoints. Ones with `nest` also host a
 * nest where the duckling line is delivered and banked.
 *
 * `site` is where the landmark itself stands; the nest is generated on the
 * nearest water in the direction of `nestToward` (a lat/lon on the river).
 */
export const LANDMARKS = [
  {
    id: "nubianVillage",
    site: { lat: 24.0878, lon: 32.8858 },
    nestToward: { lat: 24.0878, lon: 32.8836 },
    nest: true,
    model: "village",
  },
  {
    id: "nilometer",
    site: { lat: 24.08353, lon: 32.88657 },
    nestToward: { lat: 24.0833, lon: 32.8878 },
    nest: true,
    model: "nilometer",
  },
  {
    id: "khnumTemple",
    site: { lat: 24.0844, lon: 32.8862 },
    nest: false,
    model: "khnum",
  },
  {
    id: "oldCataract",
    site: { lat: 24.0823, lon: 32.8884 },
    nest: false,
    model: "oldCataract",
  },
  {
    id: "firstCataract",
    site: { lat: 24.0837, lon: 32.8816 },
    nest: false,
    model: null,
  },
  {
    id: "agaKhan",
    site: { lat: 24.08829, lon: 32.87883 },
    nestToward: { lat: 24.0883, lon: 32.881 },
    nest: true,
    model: "agaKhan",
  },
  {
    id: "botanicalGarden",
    site: { lat: 24.0945, lon: 32.8871 },
    nestToward: { lat: 24.0955, lon: 32.8897 },
    nest: true,
    model: "botanical",
  },
  {
    id: "tombsNobles",
    site: { lat: 24.1022, lon: 32.8897 },
    nestToward: { lat: 24.1022, lon: 32.8925 },
    nest: true,
    model: "tombs",
  },
  {
    id: "corniche",
    site: { lat: 24.0905, lon: 32.8962 },
    nestToward: { lat: 24.0905, lon: 32.8945 },
    nest: true,
    model: null,
  },
]

/** Named places that shape biomes and prop scattering. */
export const ZONES = {
  // Nubian villages on Elephantine (Koti in the south-west, Siou mid-island).
  villages: [
    { lat: 24.0872, lon: 32.8862, radiusM: 170 },
    { lat: 24.0907, lon: 32.8902, radiusM: 190 },
    { lat: 24.0925, lon: 32.8898, radiusM: 120 },
    // West-bank Nubian village near the Aga Khan hill.
    { lat: 24.0812, lon: 32.8786, radiusM: 140 },
  ],
  // Ancient town mound around the Temple of Khnum — sandy ruins, no houses.
  ruins: [{ lat: 24.0848, lon: 32.8862, radiusM: 140 }],
  // The Mövenpick tower on the north of Elephantine.
  tower: { lat: 24.0936, lon: 32.8917 },
  // Latitude below which shores turn to First Cataract granite.
  graniteSouthOf: 24.089,
  // Hills on the west bank: Qubbet el-Hawa above the tombs, and the Aga Khan hill.
  hills: [
    { lat: 24.1022, lon: 32.8884, radiusM: 260, heightM: 110 },
    { lat: 24.0885, lon: 32.8778, radiusM: 230, heightM: 85 },
    { lat: 24.0955, lon: 32.8745, radiusM: 420, heightM: 70 },
  ],
}

/**
 * Felucca sailing lanes, as open centre-lines (north → south) of lat/lon
 * waypoints. The build nudges each point to the middle of its channel and
 * turns the line into a two-lane loop, so boats pass each other rather than
 * through each other.
 */
export const FELUCCA_ROUTES = [
  // West channel: past Kitchener's Island down towards the Aga Khan bank.
  [
    { lat: 24.09838, lon: 32.88786 },
    { lat: 24.09627, lon: 32.88587 },
    { lat: 24.09429, lon: 32.88433 },
    { lat: 24.09175, lon: 32.88341 },
    { lat: 24.08893, lon: 32.88279 },
  ],
  // East channel, along the Corniche.
  [
    { lat: 24.1005, lon: 32.8948 },
    { lat: 24.09655, lon: 32.8941 },
    { lat: 24.09288, lon: 32.89324 },
    { lat: 24.08978, lon: 32.89232 },
    { lat: 24.08696, lon: 32.89124 },
  ],
  // Middle channel, between Kitchener's Island and Elephantine.
  [
    { lat: 24.09909, lon: 32.8917 },
    { lat: 24.09542, lon: 32.89001 },
    { lat: 24.09203, lon: 32.88786 },
    { lat: 24.0904, lon: 32.88577 },
  ],
]
