// src/ugc/ad_engine.ts — Topview AI-Grade UGC & E-Commerce Video Ad Engine
// Direct-response advertising framework with 0-3s pattern interrupt hooks, packshot rim lighting, and kinetic CTAs.

import type { AutonomousProductionGoal } from '../harness/runner.js';

export type UgcHookType =
  | 'visual_spectacle'    // High-energy explosion, liquid splash, or physics drop
  | 'pain_agitator'       // "Stop doing X the hard way"
  | 'curiosity_gap'       // "The secret Amazon won't tell you"
  | 'before_after_split'  // Split-screen dramatic contrast
  | 'unboxing_satisfying';// Macro packaging tear and pristine product reveal

export interface UgcProductSpec {
  name: string;
  category: 'beauty_skincare' | 'tech_gadget' | 'apparel' | 'fmcg' | 'saas_software';
  tagline: string;
  pain_point: string;
  solution_hero: string;
  offer_cta: string; // e.g. "Save 40% Today with code FLASH40"
}

export interface UgcAdCampaign {
  campaign_id: string;
  product: UgcProductSpec;
  hook_type: UgcHookType;
  creator_persona: {
    name: string;
    descriptor: string;
    voice: { pitch: number; speed: number; timbre: string };
  };
  aspect_ratio: '9:16' | '16:9';
  target_model?: 'minimax-h3' | 'omniflash-1.2' | 'kling-4';
  budget_usd: number;
}

/**
 * Compiles a direct-response UGC Ad Campaign into an unbending AutonomousProductionGoal
 * structured across the 5 high-converting commercial beats.
 */
export function compileUgcAdCampaign(campaign: UgcAdCampaign): AutonomousProductionGoal {
  const { product, creator_persona, campaign_id, aspect_ratio, budget_usd, hook_type } = campaign;

  const hookActionMap: Record<UgcHookType, string> = {
    visual_spectacle: `Dramatic high-speed macro splash of liquid and vibrant particles exploding around the sleek ${product.name}, illuminated by high-contrast neon rim lights.`,
    pain_agitator: `${creator_persona.name} shakes their head with genuine visceral frustration at a clunky, broken alternative, aggressively tossing it onto the table.`,
    curiosity_gap: `${creator_persona.name} leans closely into the selfie camera with a wide-eyed whispered expression of revelation, holding up the mysterious matte packaging.`,
    before_after_split: `Fast whip-pan transition contrasting a chaotic, stressed environment on the left with a calm, illuminated setup featuring ${product.name} on the right.`,
    unboxing_satisfying: `Extremely satisfying close-up macro peel of protective film off ${product.name}, revealing pristine brushed metal textures with crisp studio rim reflections.`
  };

  const shots = [
    // Beat 1: The 0-3s Pattern Interrupt Hook
    {
      id: `${campaign_id}_beat01_hook`,
      action: `${hookActionMap[hook_type]} [Overlaid Kinetic Title: "${product.tagline.toUpperCase()}"]`,
      camera: {
        lens: '24mm',
        move: 'aggressive push-in crash zoom',
        reason: 'halt social feed scrolling within first 1.5 seconds'
      },
      duration_s: 3,
      continuity: 'cut' as const,
      dialogue: {
        character: 'creator_hero',
        line: `Stop scrolling if you still struggle with ${product.pain_point}!`
      }
    },
    // Beat 2: Pain Agitation (3-8s)
    {
      id: `${campaign_id}_beat02_pain`,
      action: `${creator_persona.name} gestures emphatically toward the camera, demonstrating the daily exhaustion and friction caused by conventional methods.`,
      camera: {
        lens: '35mm',
        move: 'dynamic handheld vlog motion',
        reason: 'establish relatable creator authenticity and emotional empathy'
      },
      duration_s: 4,
      continuity: 'cut' as const,
      chain_from_shot_id: `${campaign_id}_beat01_hook`,
      dialogue: {
        character: 'creator_hero',
        line: `I wasted hundreds of dollars trying to solve this until I found this one game-changer.`
      }
    },
    // Beat 3: Solution Hero Reveal (8-16s)
    {
      id: `${campaign_id}_beat03_solution`,
      action: `Commercial packshot studio reveal: ${product.name} sits centered on a turntable rotating 360 degrees under commercial 4:1 key-to-fill lighting with sharp edge highlights.`,
      camera: {
        lens: '85mm',
        move: 'smooth orbital arc with shallow depth-of-field bokeh',
        reason: 'elevate perceived brand value and sensory desire'
      },
      duration_s: 5,
      continuity: 'cut' as const,
      chain_from_shot_id: `${campaign_id}_beat02_pain`,
      dialogue: {
        character: 'creator_hero',
        line: `This is ${product.name}. It completely replaces your old routine with ${product.solution_hero}.`
      }
    },
    // Beat 4: Social Proof & B-Roll Demonstration (16-22s)
    {
      id: `${campaign_id}_beat04_proof`,
      action: `Action demonstration: ${creator_persona.name} smiles radiantly as they seamlessly use ${product.name} in daily life with flawless effortless results.`,
      camera: {
        lens: '50mm',
        move: 'subtle tracking drift',
        reason: 'prove ease of use and immediate tangible payoff'
      },
      duration_s: 4,
      continuity: 'cut' as const,
      chain_from_shot_id: `${campaign_id}_beat03_solution`,
      dialogue: {
        character: 'creator_hero',
        line: `Over 10,000 people have already switched, and the reviews speak for themselves.`
      }
    },
    // Beat 5: Conversion CTA & Urgency Button (22-26s)
    {
      id: `${campaign_id}_beat05_cta`,
      action: `${creator_persona.name} points directly down to the screen where a vibrant pulsating discount card and limited-time offer badge animate into view.`,
      camera: {
        lens: '35mm',
        move: 'punch-in forward snap',
        reason: 'drive immediate click-through conversion'
      },
      duration_s: 4,
      continuity: 'cut' as const,
      chain_from_shot_id: `${campaign_id}_beat04_proof`,
      dialogue: {
        character: 'creator_hero',
        line: `Tap the link below right now to get ${product.offer_cta} before stock runs out!`
      }
    }
  ];

  return {
    film_id: campaign_id,
    title: `${product.name} — Direct Response Video Ad`,
    logline: `High-converting commercial ad for ${product.name} focusing on ${product.pain_point}`,
    budget_usd,
    niche: 'ugc_ecommerce_ads',
    aspect_ratio,
    target_model: campaign.target_model || 'minimax-h3',
    characters: [
      {
        asset_id: 'creator_hero',
        descriptor: creator_persona.descriptor,
        voice: creator_persona.voice,
        acting: 'high-energy authentic creator expressions with sharp communicative hand gestures and expressive eyebrows'
      }
    ],
    location: {
      asset_id: `loc_${campaign_id}_set`,
      descriptor: 'modern sunlit apartment living room with warm wood accents, natural window light from west, and clean minimal aesthetic',
      geo_block: 'Center sofa facing south; large floor-to-ceiling window on west wall casting soft afternoon daylight; product demonstration counter on east wall.'
    },
    shots
  };
}

/**
 * PRESET FLAGSHIP UGC AD CAMPAIGNS
 */
export function createSkincareAdCampaign(): UgcAdCampaign {
  return {
    campaign_id: 'ad_skincare_lumina_01',
    product: {
      name: 'Lumina Peptide Glow Serum',
      category: 'beauty_skincare',
      tagline: 'Glass skin in 7 seconds',
      pain_point: 'dry textured dull skin that ruins your makeup',
      solution_hero: 'instant deep cellular hydration with triple copper peptides',
      offer_cta: 'Buy One Get One Free with code GLOW'
    },
    hook_type: 'visual_spectacle',
    creator_persona: {
      name: 'Emma',
      descriptor: 'radiant 28-year-old woman with glass skin, natural makeup, casual cream cashmere knit top, warm engaging brown eyes',
      voice: { pitch: 1.08, speed: 1.05, timbre: 'warm, enthusiastic, clear millennial creator' }
    },
    aspect_ratio: '9:16',
    target_model: 'minimax-h3',
    budget_usd: 150
  };
}
