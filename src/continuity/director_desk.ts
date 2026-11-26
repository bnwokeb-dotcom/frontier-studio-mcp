// src/continuity/director_desk.ts — Interactive 3D Director's Desk compiler & 180-degree Line-of-Action verifier.
import { errValidation } from '../errors.js';

export interface DirectorDeskRole {
  role_id: string;
  label?: string;
  x: number;
  y?: number;
  z: number;
  facing_deg?: number;
  action?: string;
}

export interface DirectorDeskCamera {
  camera_id: string;
  lens_mm?: number;
  x: number;
  y?: number;
  z: number;
  target_role_id?: string;
  move?: string;
  motivated_axis_switch?: boolean;
}

export interface DirectorDeskSceneInput {
  location_summary?: string;
  roles: DirectorDeskRole[];
  cameras: DirectorDeskCamera[];
}

export interface DirectorDeskCompiledCamera {
  camera_id: string;
  lens: string;
  cardinal_position: string;
  distance_to_target_m: number;
  line_of_action_side: 'side_alpha' | 'side_beta' | 'on_axis' | 'single_subject';
  screen_direction: 'screen_left' | 'screen_right' | 'center';
  move: string;
}

export interface DirectorDeskCompileResult {
  passed_axis_check: boolean;
  violations: string[];
  geo_block_draft: string;
  camera_setups: DirectorDeskCompiledCamera[];
}

function cardinalOf(dx: number, dz: number): string {
  // Convention: North = -Z, South = +Z, East = +X, West = -X
  const ns = dz < -0.5 ? 'north' : dz > 0.5 ? 'south' : '';
  const ew = dx > 0.5 ? 'east' : dx < -0.5 ? 'west' : '';
  return `${ns}${ns && ew ? '-' : ''}${ew}` || 'center';
}

export function compileDirectorDeskScene(scene: DirectorDeskSceneInput): DirectorDeskCompileResult {
  if (!Array.isArray(scene.roles) || scene.roles.length === 0) {
    throw errValidation('at least one role is required on Director Desk', 'add Role A on the 3D stage');
  }
  if (!Array.isArray(scene.cameras) || scene.cameras.length === 0) {
    throw errValidation('at least one camera is required on Director Desk', 'place Camera 1 on the 3D stage');
  }

  const roleMap = new Map(scene.roles.map((r) => [r.role_id, r]));
  const centerX = scene.roles.reduce((s, r) => s + r.x, 0) / scene.roles.length;
  const centerZ = scene.roles.reduce((s, r) => s + r.z, 0) / scene.roles.length;

  const hasAxisPair = scene.roles.length >= 2;
  const roleA = scene.roles[0];
  const roleB = scene.roles[1];
  const abx = hasAxisPair ? roleB.x - roleA.x : 1;
  const abz = hasAxisPair ? roleB.z - roleA.z : 0;
  const abLen = Math.hypot(abx, abz);

  const violations: string[] = [];
  const cameraSetups: DirectorDeskCompiledCamera[] = [];

  for (const cam of scene.cameras) {
    const target = (cam.target_role_id ? roleMap.get(cam.target_role_id) : undefined) ?? roleA;
    const distance = Number(Math.hypot(cam.x - target.x, (cam.y ?? 1.6) - (target.y ?? 1.6), cam.z - target.z).toFixed(2));
    const cardinal = cardinalOf(cam.x - centerX, cam.z - centerZ);

    let side: DirectorDeskCompiledCamera['line_of_action_side'] = 'single_subject';
    let screenDir: DirectorDeskCompiledCamera['screen_direction'] = 'center';

    if (hasAxisPair && abLen > 1e-4) {
      const acx = cam.x - roleA.x;
      const acz = cam.z - roleA.z;
      const cross = abx * acz - abz * acx;
      if (Math.abs(cross) < 0.15 * abLen) {
        side = 'on_axis';
        screenDir = 'center';
      } else if (cross > 0) {
        side = 'side_alpha';
        screenDir = 'screen_left';
      } else {
        side = 'side_beta';
        screenDir = 'screen_right';
      }
    }

    cameraSetups.push({
      camera_id: cam.camera_id,
      lens: `${cam.lens_mm ?? 35}mm`,
      cardinal_position: `${cardinal} (${distance}m from ${target.role_id})`,
      distance_to_target_m: distance,
      line_of_action_side: side,
      screen_direction: screenDir,
      move: cam.move || 'static',
    });
  }

  for (let i = 1; i < scene.cameras.length; i++) {
    const prev = cameraSetups[i - 1];
    const curr = cameraSetups[i];
    const rawCurr = scene.cameras[i];
    if (
      (prev.line_of_action_side === 'side_alpha' && curr.line_of_action_side === 'side_beta') ||
      (prev.line_of_action_side === 'side_beta' && curr.line_of_action_side === 'side_alpha')
    ) {
      if (!rawCurr.motivated_axis_switch) {
        violations.push(
          `180_DEGREE_AXIS_CROSS: "${curr.camera_id}" (${curr.line_of_action_side}) crossed the Line of Action from "${prev.camera_id}" (${prev.line_of_action_side}). Move camera back to the same hemisphere or set motivated_axis_switch: true.`,
        );
      }
    }
  }

  const roleDescriptions = scene.roles
    .map((r) => `${r.label || r.role_id} staged on the ${cardinalOf(r.x - centerX, r.z - centerZ)} mark (x=${r.x.toFixed(1)}, z=${r.z.toFixed(1)})${r.action ? ` — ${r.action}` : ''}`)
    .join('; ');
  const envPrefix = scene.location_summary?.trim() ? `${scene.location_summary.trim()}. ` : '';
  const geoBlockDraft = `${envPrefix}Spatial staging (North=-Z, East=+X, South=+Z, West=-X): ${roleDescriptions}. Camera hemisphere locked on ${cameraSetups[0]?.cardinal_position ?? 'master wide'}.`;

  return {
    passed_axis_check: violations.length === 0,
    violations,
    geo_block_draft: geoBlockDraft,
    camera_setups: cameraSetups,
  };
}
