/** Every gameplay number in one place, so balancing never means hunting through code. */
export const TUNING = {
  /** Fixed simulation step. */
  dt: 1 / 60,
  /** Run length in seconds — the run ends at sunset. */
  duration: 120,

  kayak: {
    /** Two collision circles along the hull (bow, stern). */
    circleOffset: 1.15,
    circleRadius: 0.75,
    strokeTime: 0.45,
    /** A stroke on the other side may begin once the current one is this far through. */
    alternateAt: 0.55,
    /** Peak forward acceleration of a stroke (units/s²). */
    strokeThrust: 7.8,
    /** Peak yaw acceleration of a stroke (rad/s²); a left stroke turns right. */
    strokeYaw: 3.3,
    dragForward: 0.34,
    dragQuadratic: 0.035,
    dragLateral: 4.2,
    dragAngular: 2.7,
    restitution: 0.25,
    startSpeed: 2.2,
  },

  current: {
    /** The Nile flows north (−z). Stronger through the First Cataract to the south. */
    base: 0.35,
    cataract: 0.55,
  },

  ducks: {
    freeTarget: 14,
    pickupRadius: 2.7,
    /** Arc distance of the first follower behind the kayak, then the gap between followers. */
    trailFirst: 3.8,
    trailGap: 1.9,
    maxTrail: 30,
    spawnMinDistance: 32,
    spawnSpacing: 14,
    spawnMinDepth: 5,
    points: 10,
    goldenValue: 5,
    /** Line multiplier: 1 + step × (n − 1), capped. */
    multiplierStep: 0.1,
    multiplierCap: 3,
    goldenAt: [22, 58, 92],
    goldenLife: 26,
  },

  hits: {
    /** Impact speed (units/s) above which a collision scatters ducklings. */
    scatterSpeed: 3.1,
    /** Fraction of the line lost (at least one duckling). */
    scatterFraction: 0.3,
    invulnerable: 1.5,
    regrabDelay: 1.2,
  },

  landmarks: {
    discoverPoints: 50,
  },

  boats: {
    feluccaSpeed: 2.6,
    motorboatSpeed: 4.3,
  },

  /** Soft wall this far inside the play-area edge. */
  edgeMargin: 10,
} as const
