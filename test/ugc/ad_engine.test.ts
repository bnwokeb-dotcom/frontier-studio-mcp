// test/ugc/ad_engine.test.ts
import { describe, it, expect } from 'vitest';
import { compileUgcAdCampaign, createSkincareAdCampaign } from '../../src/ugc/ad_engine.js';

describe('Topview-Grade UGC & E-Commerce Video Ad Engine', () => {
  it('compiles a 5-beat direct response ad campaign into an autonomous production goal', () => {
    const campaign = createSkincareAdCampaign();
    const goal = compileUgcAdCampaign(campaign);

    expect(goal.film_id).toBe('ad_skincare_lumina_01');
    expect(goal.niche).toBe('ugc_ecommerce_ads');
    expect(goal.aspect_ratio).toBe('9:16');
    expect(goal.shots.length).toBe(5);

    // Beat 1: Hook
    const b1 = goal.shots[0];
    expect(b1.id).toContain('beat01_hook');
    expect(b1.duration_s).toBe(3);
    expect(b1.camera.reason).toContain('social feed scrolling');
    expect(b1.action).toContain('GLASS SKIN IN 7 SECONDS');

    // Beat 2: Pain
    const b2 = goal.shots[1];
    expect(b2.id).toContain('beat02_pain');
    expect(b2.dialogue?.line).toContain('wasted hundreds of dollars');

    // Beat 3: Solution Packshot
    const b3 = goal.shots[2];
    expect(b3.id).toContain('beat03_solution');
    expect(b3.camera.lens).toBe('85mm');
    expect(b3.action).toContain('turntable rotating 360 degrees');

    // Beat 5: CTA
    const b5 = goal.shots[4];
    expect(b5.id).toContain('beat05_cta');
    expect(b5.dialogue?.line).toContain('Buy One Get One Free with code GLOW');
  });
});
