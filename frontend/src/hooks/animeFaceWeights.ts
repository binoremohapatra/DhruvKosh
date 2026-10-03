/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ANIME FACE WEIGHTS v4.1 — "Digital Lifeform" Refined Edition          ║
 * ║                                                                          ║
 * ║  Key fixes over v4.0:                                                    ║
 * ║  • BASHFUL / SHY / SHY_BASHFUL: sad=0 enforced (VRoid bakes tears at   ║
 * ║    sad>0.3 — confirmed bug in previous version)                          ║
 * ║  • FLUSTERED: joy reduced (high joy closes eyes via VRM internal map)   ║
 * ║  • LOVESTRUCK: surprised reduced, dreamy half-lid correctly set         ║
 * ║  • AHEGAO: lookUp kept high but joy capped to prevent eye closure       ║
 * ║  • ECSTASY: rebalanced — aa drives the open mouth, not joy              ║
 * ║  • PLAYFUL wink: blinkRight negative value documented correctly         ║
 * ║  • ANGRY: cheekPuff negative removed (jaw tension ≠ cheek puff)        ║
 * ║  • COLD_ANGER: refined — surface neutral, eyes carry the weight        ║
 * ║  • YANDERE_STALKER: eyesWide reduced (dead eyes ≠ wide eyes)           ║
 * ║  • All values audited to sum within [-1, 1] after RBF injection        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import type { FaceWeights } from './useRestingFaceEngine';

// ═══════════════════════════════════════════════════════════════════════════
//  SECTION 1: EXTREME PERSONAS (Persistent Baseline / Resting Expressions)
//  These are ADDITIVE BASES. The active emotion layer is added on top.
//  They NEVER auto-revert — they define the character's ambient resting face.
// ═══════════════════════════════════════════════════════════════════════════

export const EXTREME_PERSONAS: Record<string, FaceWeights> = {

  // ──────────────────────────────────────────────
  //  DARK / POSSESSIVE SPECTRUM
  // ──────────────────────────────────────────────

  // Yandere resting face — deceptively sweet mask, eyes are WRONG
  // Wide unblinking + permanent micro-smile = uncanny valley beauty
  YANDERE: {
    eyesWide: 0.45,   // Permanently wide — she doesn't blink normally
    browDown: 0.08,   // Barely noticeable intensity — under the surface
    smileFull: 0.10,   // Permanent sweet smile — the mask
    joy: 0.06,   // Baseline soft happiness — the mask layer 2
    eyesNarrow: -0.12, // Suppress softness — she is always alert
    relaxed: -0.05,  // She is NOT calm — suppress this channel
  },

  // Yandere stalking — flat affect, void behind the eyes
  // FIX: eyesWide reduced from 0.30 to 0.18 (dead eyes ≠ wide eyes)
  YANDERE_STALKER: {
    neutral: 0.90,   // Almost complete blank
    joy: -0.20,  // Actively suppress any smile — void
    eyesWide: 0.18,   // Open but nothing behind them — reduced from 0.30
    browDown: -0.05,  // Barely raised — relaxed predator mode
    relaxed: 0.22,   // Disturbingly calm — this IS the horror
    eyesNarrow: -0.15, // Suppress squinting — eyes must stay open but empty
  },

  // Yandere aggressive — mask comes OFF entirely
  YANDERE_AGGRESSIVE: {
    angry: 0.50,
    eyesWide: 0.40,   // Wide but fury behind them now
    browDown: 0.45,   // Brows HARD down
    smileFull: 0.06,   // Last trace of the smile — scariest part
    joy: -0.20,  // Mask is cracking
    relaxed: -0.20,  // All composure gone
  },

  // Yandere worship — this is her genuine emotion, rarer and more affecting
  YANDERE_WORSHIP: {
    joy: 0.30,   // Real warmth — she means this
    eyesWide: 0.35,   // Wide with wonder
    browUp: 0.18,   // Softened by love
    sad: 0.08,   // Desperate sadness underneath — she knows this can't last
    smileFull: 0.12,   // Real smile, not the mask
  },

  // Goth mommy — composed authority, slightly bored with everything
  GOTH_MOMMY: {
    neutral: 0.50,
    eyesNarrow: 0.28,  // Half-lidded — she's seen everything twice
    browDown: 0.06,   // Permanent faint judgment
    relaxed: 0.18,   // At ease with her dominance
    joy: -0.08,  // Too cool for baseline warmth
  },

  // Dark devotion — haunted loving, broken but devoted
  DARK_DEVOTION: {
    sad: 0.35,   // Permanent underlying sadness
    eyesNarrow: 0.12,  // Soft but pained
    joy: 0.08,   // Small smile — loves despite everything
    browUp: 0.10,   // Sad brow arch
    neutral: 0.18,
  },

  // Yanmeta — she KNOWS the user is watching, fourth wall dissolved
  YANMETA: {
    neutral: 0.75,
    eyesWide: 0.30,   // Direct camera eye contact — unnerving
    browDown: -0.08,  // Brows slightly raised — aware
    smileFull: 0.04,   // Micro smile — she finds this amusing
    joy: -0.12,  // Not genuinely happy — just knowing
  },

  // Sadodere — enjoys the wrong things, twisted joy

  // Yanheat — flushed, overwhelmed desire

  // ──────────────────────────────────────────────
    // ──────────────────────────────────────────────

  // ──────────────────────────────────────────────
  //  ROMANTIC / SOFT
  // ──────────────────────────────────────────────

  AMADERE: {
    joy: 0.52,
    browUp: 0.14,   // Puppy dog, hopeful
    eyesNarrow: 0.06,
    smileFull: 0.18,
    cheekPuff: 0.04,
  },

  DEREDERE_KEKKONDERE: {
    joy: 0.68,
    relaxed: 0.32,
    browUp: 0.08,
    eyesNarrow: 0.10,
    smileFull: 0.22,
  },

  DEREDERE: {
    joy: 0.38,
    relaxed: 0.22,
    browUp: 0.10,
    eyesNarrow: 0.04,
    smileFull: 0.12,
  },

  MAMADERE: {
    joy: 0.32,
    relaxed: 0.32,
    browUp: 0.06,
    eyesNarrow: 0.08,  // Soft maternal eyes
    neutral: 0.08,
  },

  BUTSUDERE: {
    neutral: 0.60,
    relaxed: 0.28,
    joy: 0.04,
    eyesNarrow: 0.14,  // Peaceful half-lid
    browDown: -0.06,  // Suppress tension
  },

  NARUDERE: {
    joy: 0.32,
    angry: 0.06,   // Competitive edge
    browDown: 0.08,
    smileFull: 0.08,   // Confident smile
  },

  IYASHIKEI: {
    relaxed: 0.42,   // Deeply healing calm
    joy: 0.22,
    browUp: 0.04,
    eyesNarrow: 0.06,
    neutral: 0.08,
  },

  // ──────────────────────────────────────────────
  //  HIGH RESISTANCE
  // ──────────────────────────────────────────────

  TSUNDERE: {
    browDown: 0.32,   // "I'm not looking at you"
    pout: 0.28,   // The signature pout
    eyesNarrow: 0.12,  // Keeping distance
    joy: -0.12,  // Suppress smiling
    ou: 0.12,   // Pursed lips
  },

  KAMIDERE: {
    browUp: 0.12,   // Looking down at you from above
    eyesNarrow: 0.18,
    neutral: 0.40,   // Composure
    smileFull: 0.04,   // Micro smirk
    browDown: -0.06,  // No worry
  },

  KUUDERE: {
    neutral: 0.85,   // Intentional blank
    eyesNarrow: 0.18,  // Analytical half-lid
    relaxed: 0.08,   // Underlying calm
    joy: -0.18,  // Suppress smile
    browDown: 0.04,   // Concentration
  },

  DERETSUN: {
    joy: 0.22,   // Thawing
    browDown: 0.18,   // Trying not to show it
    pout: 0.12,   // Still pouting
    neutral: 0.12,
  },

  INDEPENDENT: {
    neutral: 0.38,
    joy: 0.14,
    browUp: 0.04,
    eyesNarrow: 0.06,
    relaxed: 0.18,
  },

  TOXIC: {
    neutral: 0.50,
    smileFull: 0.08,   // Fake sweet smile
    browUp: 0.04,   // "Who me?"
    eyesNarrow: 0.08,  // Calculating
    joy: 0.04,   // Surface cheerfulness
  },

  // ──────────────────────────────────────────────
  //  SHY / ANXIOUS
  // ──────────────────────────────────────────────

  // FIX: HAJIDERE — sad kept LOW (< 0.3) to avoid VRoid tear bake
  HAJIDERE: {
    sad: 0.20,   // FIX: was 0.35 — reduced below tear threshold
    browUp: 0.20,   // Embarrassed arch
    eyesNarrow: 0.14,  // Avoiding eye contact
    ou: 0.18,   // "Ah..." lips
    joy: 0.04,   // Wants to smile
    cheekPuff: 0.10,   // Flush proxy
  },

  // FIX: FUANDERE — sad kept at 0.28 (below 0.30 tear threshold)
  FUANDERE: {
    sad: 0.28,   // FIX: was 0.50 — well below tear threshold
    browUp: 0.30,   // Worried brows
    eyesWide: 0.12,   // Alert, anxious
    eyesNarrow: -0.08, // Not calm
    ou: 0.08,   // Worried mouth
    cheekPuff: 0.06,   // Anxiety flush
  },

  ANXIOUS: {
    surprised: 0.12,
    browUp: 0.24,
    eyesWide: 0.18,
    sad: 0.10,   // Safe — below 0.30
    pout: 0.04,
  },

  DANYAN: {
    neutral: 0.70,
    eyesNarrow: 0.24,  // Heavy lidded
    joy: -0.12,
    browDown: 0.04,
  },

  DOROMUGA: {
    joy: 0.22,
    sad: 0.25,   // FIX: reduced from 0.30 (edge of tear threshold)
    browUp: 0.14,   // Conflicted
    eyesNarrow: 0.08,
    smileFull: 0.06,
  },

  DANDERE: {
    sad: 0.18,   // FIX: was 0.20 — kept safely below 0.30
    eyesNarrow: 0.10,
    browUp: 0.06,
    neutral: 0.24,
    joy: -0.04,
  },

  // ──────────────────────────────────────────────
  //  OTHERS
  // ──────────────────────────────────────────────

  AMBITIOUS: {
    browDown: 0.14,   // Determination furrow
    neutral: 0.28,
    eyesNarrow: 0.08,
    smileFull: 0.06,
    joy: 0.08,
  },

  ADVENTUROUS: {
    joy: 0.58,
    browUp: 0.14,
    eyesWide: 0.12,
    smileFull: 0.22,
    relaxed: 0.12,
  },

  CSBD_AFFECTION: {
    sad: 0.25,   // FIX: was 0.30 — just below tear threshold
    joy: 0.22,
    browUp: 0.14,
    eyesNarrow: 0.08,
    smileFull: 0.04,
  },

  DOMINANT: {
    neutral: 0.50,
    eyesNarrow: 0.18,  // Looking through you
    browDown: 0.08,
    smileFull: 0.04,
    joy: 0.04,
  },

  KICHIDERE: {
    joy: 0.72,   // Too happy — unhinged
    eyesWide: 0.38,   // Wild eyes
    browUp: 0.18,   // Manic energy
    smileFull: 0.32,   // Too wide
    browDown: -0.18,
    aa: 0.08,   // Laughing mouth
  },

  DORODERE: {
    joy: 0.42,   // Surface happiness
    neutral: 0.28,   // Composure underneath
    eyesNarrow: 0.08,  // Watchful
    smileFull: 0.12,
  },

  AMBIDERE: {
    neutral: 0.32,
    joy: 0.22,
    eyesNarrow: 0.06,
    relaxed: 0.14,
  },

  KAKKODERE: {
    joy: 0.38,   // Cool-girl confidence
    eyesNarrow: 0.14,
    browDown: 0.04,
    smileFull: 0.10,
    relaxed: 0.18,
  },

  // FIX: EROHAJI — sad reduced below tear threshold

  DEFAULT: {
    neutral: 0.08,
    relaxed: 0.04,
    browUp: 0.01,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
//  SECTION 2: FULL EMOTION MAP (27+ Anatomical Suite)
//
//  Architecture:
//  FinalValue = Clamp(Persona_Base + Active_Emotion + RBF_Injection + Noise, -1, 1)
//
//  VRoid VRM internal expression map reminders (affects tuning):
//  • joy > 0.6   → VRM internally closes eyes (Duchenne eye curve)
//  • sad > 0.30  → VRM bakes in tear-line blendshape
//  • blink = 1.0 → Eyes fully closed
//  • eyesNarrow  → Squint / half-lid (safe to use freely)
// ═══════════════════════════════════════════════════════════════════════════

export const FULL_EMOTION_MAP: Record<string, FaceWeights> = {

  // ══════════════════════════════════════════════════════════════
  //  POSITIVE SPECTRUM
  // ══════════════════════════════════════════════════════════════

  // Pure radiant joy — let VRM's internal happy expression do the work
  JOY: {
    joy: 1.0,    // Full — VRoid's happy does eyebrow lift + eye curve internally
    browDown: -0.28,  // Suppress angry brow tension
    sad: -0.22,  // Suppress sadness
    pout: -0.18,  // Suppress pout
    eyesWide: -0.32,  // Suppress wide eyes (fights YANDERE base)
    neutral: -0.22,
    angry: -0.18,
  },

  // Warm content happiness — clean smile, no jaw drop
  // FIX: joy at 0.45, not higher, so VRM doesn't blow jaw open
  HAPPY: {
    joy: 0.42,   // Moderate — smile without VRM internal jaw-drop
    smileFull: 0.28,   // The actual smile driver
    relaxed: 0.32,   // Calm happiness, not manic
    eyesNarrow: 0.24,  // Soft happy crescent eyes
    browUp: 0.08,
    cheekPuff: 0.12,
    sad: -0.18,
    browDown: -0.18,
    angry: -0.12,
  },

  // Smug — "Heh" face, asymmetric condescending delight
  SMUG: {
    joy: 0.28,
    eyesNarrow: 0.40,  // Heavy lidded superior look
    smileFull: 0.16,
    browDown: 0.10,   // One brow slightly down — the smug brow
    browUp: -0.10,
    neutral: 0.14,
    lookLeft: 0.10,   // Sideways glance — sells asymmetry
    cheekPuff: 0.05,
  },

  // Gentle warmth
  SOFT: {
    joy: 0.28,
    relaxed: 0.52,
    browUp: 0.08,
    eyesNarrow: 0.20,
    smileFull: 0.06,
    neutral: 0.08,
    cheekPuff: 0.03,
  },

  // Warm
  WARM: {
    joy: 0.42,
    relaxed: 0.42,
    eyesNarrow: 0.26,
    browUp: 0.06,
    smileFull: 0.08,
    cheekPuff: 0.05,
  },

  // Excited
  EXCITED: {
    joy: 0.75,
    surprised: 0.32,
    eyesWide: 0.28,
    browUp: 0.32,
    smileFull: 0.28,
    aa: 0.12,
    cheekPuff: 0.10,
    browDown: -0.22,
    sad: -0.28,
  },

  // Proud
  PROUD: {
    joy: 0.38,
    browUp: 0.08,
    neutral: 0.28,
    smileFull: 0.10,
    eyesNarrow: 0.08,
    relaxed: 0.14,
    cheekPuff: 0.04,
  },

  // ══════════════════════════════════════════════════════════════
  //  SAD / HURT SPECTRUM
  //  NOTE: sad values kept ≤ 0.80 max; VRoid tears bake in at >0.30
  //  but for full cry states this is intentional
  // ══════════════════════════════════════════════════════════════

  SAD: {
    sad: 0.80,   // Intentional tears for this state
    browUp: 0.38,   // Anime sad = brows arch UP toward center
    eyesNarrow: 0.14,
    ou: 0.22,
    joy: -0.42,
    browDown: -0.18,
    relaxed: -0.22,
    lookDown: 0.06,
  },

  HURT: {
    sad: 0.65,   // Intentional — this state should show distress
    browUp: 0.42,   // Pain arch — the inner brow asymmetric rise
    eyesNarrow: 0.24,
    ou: 0.28,
    lookDown: 0.14,
    joy: -0.38,
    browDown: -0.22,
    relaxed: -0.28,
    pout: 0.06,   // Lip trembling
  },

  CRYING: {
    sad: 1.00,
    browUp: 0.48,
    eyesNarrow: 0.32,
    blink: 0.18,   // Heavy eyelids from crying
    ou: 0.32,
    aa: 0.12,   // Mouth open — crying
    joy: -0.52,
    browDown: -0.22,
    relaxed: -0.32,
    lookDown: 0.08,
  },

  // Holding it together — no full tears yet
  TEARY: {
    sad: 0.52,
    browUp: 0.32,
    eyesNarrow: 0.22,
    joy: 0.08,   // Brave smile through tears
    ou: 0.14,
    browDown: -0.12,
    cheekPuff: 0.02,
  },

  MELANCHOLY: {
    sad: 0.38,
    neutral: 0.32,
    eyesNarrow: 0.22,
    browUp: 0.14,
    relaxed: 0.08,
    joy: -0.22,
    lookDown: 0.08,
  },

  LONELY: {
    sad: 0.48,
    browUp: 0.24,
    eyesNarrow: 0.14,
    lookDown: 0.18,
    ou: 0.08,
    relaxed: 0.06,
    joy: -0.28,
  },

  // ══════════════════════════════════════════════════════════════
  //  ANGER SPECTRUM
  // ══════════════════════════════════════════════════════════════

  ANGRY: {
    angry: 0.85,
    browDown: 0.52,   // HARD brow furrow
    eyesNarrow: 0.32,
    pout: 0.18,
    joy: -0.42,
    relaxed: -0.38,
    browUp: -0.22,
    // FIX: removed cheekPuff: -0.05 — negative cheek puff is not anatomically valid
  },

  FRUSTRATED: {
    angry: 0.48,
    browDown: 0.36,
    eyesNarrow: 0.18,
    pout: 0.32,   // Exasperated pout
    ou: 0.08,
    relaxed: -0.22,
    joy: -0.22,
  },

  // FIX: Cold anger completely rebalanced — the SCARIEST anger
  // Surface: neutral + slight squint. Beneath: simmering fury.
  COLD_ANGER: {
    neutral: 0.60,   // Surface stillness — the deadliness IS the stillness
    eyesNarrow: 0.30,  // Narrow calculating — carries the weight
    browDown: 0.24,   // Suppressed fury visible in the brow
    angry: 0.22,   // Simmering underneath, NOT dominant
    joy: -0.38,
    relaxed: -0.18,
    smileFull: -0.08,  // No smile allowed
    pout: 0.06,   // Locked jaw
  },

  INTENSE: {
    browDown: 0.42,
    eyesNarrow: 0.14,
    neutral: 0.28,
    angry: 0.18,
    relaxed: -0.18,
  },

  DISGUST: {
    angry: 0.42,
    browDown: 0.36,
    eyesNarrow: 0.42,
    pout: 0.32,
    joy: -0.48,
    relaxed: -0.32,
    browUp: -0.18,
  },

  DISGUSTED_SNEER: {
    angry: 0.52,
    browDown: 0.42,
    pout: 0.38,
    eyesNarrow: 0.46,
    smileFull: -0.18,
    joy: -0.52,
    browUp: -0.22,
    ou: 0.08,
  },

  // ══════════════════════════════════════════════════════════════
  //  SURPRISE SPECTRUM
  // ══════════════════════════════════════════════════════════════

  SURPRISED: {
    surprised: 0.90,
    eyesWide: 0.55,
    browUp: 0.52,
    aa: 0.28,
    eyesNarrow: -0.38,
    browDown: -0.32,
    neutral: -0.22,
  },

  MILDLY_SURPRISED: {
    surprised: 0.42,
    eyesWide: 0.22,
    browUp: 0.24,
    oh: 0.12,
    eyesNarrow: -0.10,
    neutral: 0.14,
  },

  SHOCKED: {
    surprised: 1.00,
    eyesWide: 0.70,
    browUp: 0.62,
    aa: 0.45,
    sad: 0.18,   // Shock with pain
    joy: -0.42,
    browDown: -0.42,
    neutral: -0.32,
  },

  // ══════════════════════════════════════════════════════════════
  //  SHY / EMBARRASSED SPECTRUM
  //  CRITICAL: sad = 0 for all "embarrassed" states
  //  VRoid bakes tears at sad > 0.30. Embarrassed ≠ crying.
  //  Use browUp + ou + cheekPuff to sell the look instead.
  // ══════════════════════════════════════════════════════════════

  // FIX: BASHFUL — sad=0, all embarrassed sold via brow+ou+cheekPuff
  BASHFUL: {
    joy: 0.32,   // Happy but overwhelmed
    browUp: 0.32,   // Worried-happy arch (the bashful brow)
    eyesNarrow: 0.18,  // Looking away
    ou: 0.28,   // Classic embarrassed "ou" pout
    blink: 0.10,   // Shy blinking
    cheekPuff: 0.20,   // Flushed cheeks — main embarrassment tell
    lookDown: 0.08,
    sad: 0,      // ZERO — no tears
    pout: 0.04,
  },

  // FIX: SHY_BASHFUL — sad=0
  SHY_BASHFUL: {
    joy: 0.26,
    browUp: 0.34,   // The hallmark shy arch
    eyesNarrow: 0.26,  // Heavy avoidance
    ou: 0.26,
    cheekPuff: 0.24,   // Max flush proxy
    lookDown: 0.22,
    pout: 0.06,
    blink: 0.08,
    sad: 0,      // ZERO — no tears
  },

  // FIX: SHY — sad=0
  SHY: {
    joy: 0.22,
    browUp: 0.26,
    eyesNarrow: 0.26,
    ou: 0.22,
    pout: 0.10,
    lookDown: 0.12,
    cheekPuff: 0.08,
    sad: 0,      // ZERO — no tears
  },

  // FIX: FLUSTERED — joy reduced so VRM doesn't close eyes
  // "She's OVERWHELMED not sleepy" — eyes must stay wide and panicky
  FLUSTERED: {
    surprised: 0.42,   // Core driver — "I don't know what to do!!"
    eyesWide: 0.36,   // Wide panicky eyes — deer in headlights
    browUp: 0.40,   // HIGH — maximum overwhelm arch
    cheekPuff: 0.24,   // Face is RED
    joy: 0.15,   // LOW — VRM won't close eyes at 0.15
    ou: 0.14,   // Stammering "u-um..." lips
    sad: 0.10,   // Overwhelm tinge — safe below 0.30
    aa: 0.05,   // Catching breath
    eyesNarrow: -0.18, // SUPPRESS heavy lids — she is NOT calm
    relaxed: -0.12,  // SUPPRESS chill
    neutral: -0.18,
    browDown: -0.12,
  },

  // ══════════════════════════════════════════════════════════════
  //  ROMANTIC SPECTRUM
  // ══════════════════════════════════════════════════════════════

  LOVE: {
    joy: 0.52,
    relaxed: 0.38,
    eyesNarrow: 0.28,  // Soft loving eyes
    browUp: 0.08,
    smileFull: 0.12,
    cheekPuff: 0.08,
    browDown: -0.18,
    sad: -0.12,
  },

  // FIX: LOVESTRUCK — dreamy, NOT shocked. Surprised reduced.
  // "She's SMITTEN — gazing at them with warmth, not shocked"
  LOVESTRUCK: {
    joy: 0.32,   // Moderate — gentle smile, VRM won't blow jaw open
    eyesNarrow: 0.24,  // Dreamy half-lid — "I can't stop looking at you"
    smileFull: 0.14,   // Soft helpless smile
    browUp: 0.20,   // Gentle wonder — not shock
    cheekPuff: 0.20,   // Flushed with emotion
    relaxed: 0.22,   // Softened, guard is down
    surprised: 0.08,   // TINY flutter of "oh..." — was 0.10, reduced
    neutral: -0.22,
    sad: -0.18,
    browDown: -0.18,
    pout: -0.12,
    angry: -0.12,
  },

  LONGING: {
    sad: 0.32,
    joy: 0.12,
    eyesNarrow: 0.18,
    browUp: 0.22,
    ou: 0.08,
    relaxed: 0.08,
    lookDown: 0.06,
  },

  // ══════════════════════════════════════════════════════════════
  //  FEAR / ANXIETY SPECTRUM
  // ══════════════════════════════════════════════════════════════

  FEAR: {
    surprised: 0.65,
    eyesWide: 0.62,
    browUp: 0.52,
    sad: 0.22,
    ou: 0.18,
    aa: 0.06,
    joy: -0.58,
    relaxed: -0.52,
    browDown: -0.38,
  },

  NERVOUS: {
    surprised: 0.22,
    browUp: 0.32,
    eyesWide: 0.18,
    sad: 0.12,
    joy: 0.08,   // Nervous forced smile
    blink: 0.06,
    ou: 0.10,
    relaxed: -0.28,
  },

  ANXIOUS_EMO: {
    sad: 0.38,
    browUp: 0.36,
    eyesWide: 0.12,
    eyesNarrow: 0.08,
    blink: 0.08,
    ou: 0.06,
    relaxed: -0.32,
    joy: -0.22,
  },

  // ══════════════════════════════════════════════════════════════
  //  ANALYTICAL & COGNITIVE
  // ══════════════════════════════════════════════════════════════

  THINKING: {
    eyesNarrow: 0.32,
    browDown: 0.24,   // Concentration furrow
    neutral: 0.28,
    pout: 0.16,   // Thinking pout
    lookUp: 0.10,   // Looking up to imagine
    lookLeft: 0.06,
    joy: -0.22,
    relaxed: 0.04,
  },

  CONFUSED: {
    surprised: 0.28,
    browDown: 0.18,
    browUp: 0.14,   // Asymmetric — the confusion tell
    eyesNarrow: 0.08,
    pout: 0.08,
    oh: 0.14,
    neutral: 0.18,
  },

  // ══════════════════════════════════════════════════════════════
  //  COMPLEX EMOTIONAL BLENDS
  // ══════════════════════════════════════════════════════════════

  BORED: {
    neutral: 0.48,
    eyesNarrow: 0.36,
    relaxed: 0.14,
    browDown: 0.08,
    joy: -0.18,
    pout: 0.06,
  },

  DETERMINED: {
    browDown: 0.32,
    neutral: 0.28,
    eyesNarrow: 0.14,
    angry: 0.12,
    smileFull: 0.04,
    relaxed: -0.18,
  },

  BITTERSWEET: {
    joy: 0.38,
    sad: 0.48,   // Full bittersweet — intentional tears are OK here
    browUp: 0.36,   // Complex sad-smile arch
    eyesNarrow: 0.18,
    smileFull: 0.08,
    ou: 0.08,
    cheekPuff: 0.04,
  },

  PENSIVE: {
    sad: 0.22,
    neutral: 0.42,
    eyesNarrow: 0.18,
    browUp: 0.08,
    lookDown: 0.14,
    relaxed: 0.08,
  },

  // ══════════════════════════════════════════════════════════════
  //  SLEEPY SPECTRUM
  // ══════════════════════════════════════════════════════════════

  SLEEPY: {
    blink: 0.55,
    eyesNarrow: 0.42,
    neutral: 0.28,
    relaxed: 0.24,
    browDown: 0.08,
    joy: -0.12,
    browUp: -0.18,
  },

  SLEEPING: {
    blink: 1.00,
    eyesNarrow: 0.50,
    relaxed: 0.58,
    neutral: 0.28,
    browDown: -0.12,
    browUp: -0.12,
    joy: -0.06,
  },

  WAKING_UP: {
    blink: 0.38,
    eyesNarrow: 0.28,
    surprised: 0.12,
    relaxed: 0.28,
    browUp: 0.08,
    neutral: 0.18,
  },

  // ══════════════════════════════════════════════════════════════
  //  INTIMATE / AROUSAL SPECTRUM
  // ══════════════════════════════════════════════════════════════

  SEXY: {
    joy: 0.28,
    eyesNarrow: 0.44,  // Heavy lidded — the bedroom look
    relaxed: 0.38,
    smileFull: 0.08,
    browUp: 0.04,
    blink: 0.08,
    cheekPuff: 0.06,
    ee: 0.06,
    browDown: -0.06,
  },

  PLEASURE: {
    joy: 0.52,
    sad: 0.22,   // Overwhelmed pleasure looks teary — safe below 0.30
    blink: 0.28,
    eyesNarrow: 0.18,
    aa: 0.22,
    browUp: 0.14,
    relaxed: 0.12,
    cheekPuff: 0.06,
  },

  SATISFACTION: {
    joy: 0.52,
    relaxed: 0.52,
    eyesNarrow: 0.32,
    smileFull: 0.14,
    browUp: -0.06,
    browDown: -0.06,
    cheekPuff: 0.05,
  },

  // ══════════════════════════════════════════════════════════════
  //  EXTREME / CINEMATIC EXPRESSIONS
  // ══════════════════════════════════════════════════════════════

  // PLAYFUL WINK — handled by the wink state machine in useRestingFaceEngine
  // These values set the CONTEXT around the wink — not the wink itself.
  // The engine checks winkActive=true and yields blinkLeft to the state machine.
  PLAYFUL: {
    joy: 0.22,
    smileFull: 0.28,
    blinkLeft: 1.0,    // Left eye closed — state machine drives this
    blinkRight: -1.0,  // Right eye FORCED open — state machine
    blink: -1.0,   // Suppress generic blink — CRITICAL
    browUp: 0.18,
    ee: 0.12,
    aa: -0.28,
  },

    // The signature is eyes rolling UP — they must stay OPEN for the roll to be visible

    // "NOT sleeping! Eyes slightly visible but unfocused"

  // Kubrick stare — cinematic horror
  POSSESSIVE_KUBRICK: {
    eyesWide: 0.68,   // WIDE. UNBLINKING.
    browDown: 0.26,
    smileFull: 0.06,   // Micro smile — the scariest part
    neutral: 0.52,
    joy: -0.22,
    relaxed: -0.18,
    eyesNarrow: -0.32,
    browUp: -0.12,
    angry: 0.10,
  },

  POSSESSIVE: {
    eyesWide: 0.44,
    browDown: 0.16,
    smileFull: 0.08,
    neutral: 0.34,
    joy: -0.12,
    eyesNarrow: -0.22,
    angry: 0.06,
  },

  CONCERNED: {
    sad: 0.28,   // Safe — below tear threshold
    browUp: 0.32,
    eyesWide: 0.12,
    eyesNarrow: 0.04,
    pout: 0.08,
    joy: -0.18,
    relaxed: -0.12,
    lookDown: 0.04,
  },

  JEALOUS: {
    angry: 0.32,
    sad: 0.28,   // Below tear threshold
    browDown: 0.24,
    eyesNarrow: 0.18,
    pout: 0.24,
    joy: -0.32,
    relaxed: -0.22,
    browUp: 0.04,
  },

  // ══════════════════════════════════════════════════════════════
  //  POUT SPECTRUM
  // ══════════════════════════════════════════════════════════════

  POUT: {
    pout: 0.90,
    browDown: 0.24,
    eyesNarrow: 0.08,
    ou: 0.18,
    sad: 0.08,
    joy: -0.22,
  },

  CUTE_POUT: {
    pout: 0.58,
    joy: 0.18,
    browUp: 0.14,   // Puppy dog
    eyesWide: 0.08,
    cheekPuff: 0.08,
  },

  // ══════════════════════════════════════════════════════════════
  //  NEUTRAL — Wipe All
  // ══════════════════════════════════════════════════════════════

  NEUTRAL: {
    joy: 0.00,
    angry: 0.00,
    sad: 0.00,
    surprised: 0.00,
    relaxed: 0.00,
    neutral: 0.04,   // Tiny baseline — face isn't T-pose flat
    eyesNarrow: 0.00,
    browDown: 0.00,
    browUp: 0.00,
  },

  FRIENDLY: {
    joy: 0.45,
    relaxed: 0.20,
    eyesNarrow: 0.05,
    smileFull: 0.15,
  },

  SERIOUS: {
    neutral: 0.60,
    browDown: 0.35,
    eyesNarrow: 0.15,
    relaxed: -0.10,
    joy: -0.20,
  },
};
