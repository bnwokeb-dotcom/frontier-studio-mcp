// scripts/browser/canvas_bridge.ts — Infinite canvas bridge (Lumina / Google Flow style).
import { readFileSync, statSync } from 'node:fs';
import { BridgeQueue, BridgeRequestError, type BridgeJob, type BridgeJobInput } from '../../src/bridge/web_bridge_server.js';
import { errLaneDown, errValidation } from '../../src/errors.js';

export interface CharacterCanvasNode {
  id: string;
  sheetPath: string;
  mark: 'left' | 'right' | 'center';
}

export interface LocationCanvasNode {
  id: string;
  platePath: string;
}

export interface CanvasGraphParams {
  filmTitle: string;
  characterNodes: CharacterCanvasNode[];
  locationNode: LocationCanvasNode;
  prompt: string;
  validateAssets?: boolean;
}

export interface CanvasNodePayload {
  id: string;
  type: 'character_anchor' | 'location_plate' | 'video_node';
  data: Record<string, unknown>;
  position: { x: number; y: number };
}

export interface CanvasGraphOutput {
  filmTitle: string;
  nodes: CanvasNodePayload[];
  connections: Array<{ from: string; to: string; label: string }>;
  promptText: string;
}

export interface CanvasBridgeOptions {
  validateAssets?: boolean;
  fetchFn?: typeof fetch;
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function assertRealImageMagic(filePath: string, label: string): void {
  if (!filePath || !filePath.trim()) {
    throw errValidation(`missing asset path for "${label}"`, 'provide a valid PNG or JPEG image path');
  }
  let size = 0;
  try {
    const st = statSync(filePath);
    if (!st.isFile()) {
      throw errValidation(`asset "${label}" is not a regular file: ${filePath}`, 'provide a valid PNG or JPEG file');
    }
    size = st.size;
  } catch (err) {
    if (err instanceof Error && err.name === 'StudioError') throw err;
    throw errValidation(`missing image asset "${label}": ${filePath}`, 'generate or provide the PNG/JPEG asset before staging canvas');
  }

  if (size < 8) {
    throw errValidation(`invalid image asset "${label}": file too small (${size} bytes)`, 'provide a valid PNG or JPEG image file');
  }

  const bytes = readFileSync(filePath);
  const isPng = bytes.length >= 8 && bytes.subarray(0, 8).equals(PNG_SIGNATURE);
  const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (!isPng && !isJpeg) {
    throw errValidation(
      `invalid image asset "${label}": file lacks PNG or JPEG magic header (${filePath})`,
      'replace fake/placeholder file with a real PNG or JPEG image',
    );
  }
}

export class CanvasBridgeRunner {
  constructor(private options: CanvasBridgeOptions = {}) {}

  buildCanvasNodeGraph(params: CanvasGraphParams): CanvasGraphOutput {
    const shouldValidate = params.validateAssets ?? this.options.validateAssets ?? false;
    if (shouldValidate) {
      assertRealImageMagic(params.locationNode.platePath, `location:${params.locationNode.id}`);
      for (const c of params.characterNodes) {
        assertRealImageMagic(c.sheetPath, `character:${c.id}`);
      }
    }

    const nodes: CanvasNodePayload[] = [];
    const connections: Array<{ from: string; to: string; label: string }> = [];

    // Location plate node
    nodes.push({
      id: params.locationNode.id,
      type: 'location_plate',
      data: { platePath: params.locationNode.platePath },
      position: { x: 100, y: 100 },
    });

    // Character reference nodes
    params.characterNodes.forEach((c, idx) => {
      nodes.push({
        id: c.id,
        type: 'character_anchor',
        data: { sheetPath: c.sheetPath, mark: c.mark },
        position: { x: 100, y: 300 + idx * 200 },
      });
      // Link character to video generation node
      connections.push({
        from: c.id,
        to: 'video_node_1',
        label: `@${c.id}`,
      });
    });

    // Main video generation node
    nodes.push({
      id: 'video_node_1',
      type: 'video_node',
      data: { prompt: params.prompt },
      position: { x: 600, y: 200 },
    });

    connections.push({
      from: params.locationNode.id,
      to: 'video_node_1',
      label: 'background_plate',
    });

    return {
      filmTitle: params.filmTitle,
      nodes,
      connections,
      promptText: params.prompt,
    };
  }

  /**
   * Enqueues Flow plate and character turnaround jobs from a compiled canvas graph
   * onto a live BridgeQueue or WebBridgeServer URL.
   */
  async dispatchToBridge(
    graph: CanvasGraphOutput,
    queueOrUrl: BridgeQueue | string,
    filmId: string,
  ): Promise<{ filmId: string; jobIds: string[]; jobs: BridgeJob[] }> {
    const cleanFilmId = filmId.trim();
    if (!cleanFilmId) {
      throw errValidation('filmId is required for canvas bridge dispatch', 'pass a valid alphanumeric filmId');
    }

    const jobInputs: BridgeJobInput[] = [];
    for (const node of graph.nodes) {
      if (node.type === 'location_plate') {
        jobInputs.push({
          target: 'flow_plate',
          film_id: cleanFilmId,
          asset_id: node.id,
          prompt: `Location master plate anchor for "${graph.filmTitle}": ${graph.promptText}`,
          model_hint: 'Nano Banana 2.5',
          aspect_ratio: '2.39:1',
          metadata: {
            bridge: 'canvas_bridge',
            film_title: graph.filmTitle,
            plate_path: node.data.platePath,
            connections: graph.connections.filter((c) => c.from === node.id),
          },
        });
      } else if (node.type === 'character_anchor') {
        jobInputs.push({
          target: 'flow_sheet',
          film_id: cleanFilmId,
          asset_id: node.id,
          prompt: `Character turnaround anchor (@${node.id}, mark: ${String(node.data.mark ?? 'center')}) for "${graph.filmTitle}": ${graph.promptText}`,
          model_hint: 'Nano Banana 2.5',
          aspect_ratio: '16:9',
          metadata: {
            bridge: 'canvas_bridge',
            film_title: graph.filmTitle,
            sheet_path: node.data.sheetPath,
            mark: node.data.mark,
            connections: graph.connections.filter((c) => c.from === node.id),
          },
        });
      }
    }

    if (jobInputs.length === 0) {
      throw errValidation('canvas graph has no character or location anchor nodes to dispatch', 'include at least one locationNode or characterNodes entry');
    }

    const jobs: BridgeJob[] = [];
    if (typeof queueOrUrl === 'string') {
      const endpoint = `${queueOrUrl.replace(/\/+$/, '')}/bridge/jobs`;
      const fetchFn = this.options.fetchFn ?? globalThis.fetch.bind(globalThis);
      for (const input of jobInputs) {
        let res: Response;
        try {
          res = await fetchFn(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          });
        } catch (err) {
          throw errLaneDown(
            `Canvas bridge HTTP dispatch failed: ${(err as Error).message}`,
            'verify WebBridgeServer is reachable at the given URL',
          );
        }
        const raw = await res.text();
        if (!res.ok) {
          throw errLaneDown(
            `Canvas bridge HTTP error (${res.status}): ${raw}`,
            'check WebBridgeServer /bridge/jobs request payload',
          );
        }
        let parsed: { job?: BridgeJob };
        try {
          parsed = JSON.parse(raw) as { job?: BridgeJob };
        } catch {
          throw errLaneDown(
            `Canvas bridge returned invalid JSON on HTTP ${res.status}`,
            'inspect WebBridgeServer /bridge/jobs response body',
          );
        }
        if (!parsed.job) {
          throw errLaneDown('Canvas bridge returned missing job object', 'inspect WebBridgeServer /bridge/jobs response');
        }
        jobs.push(parsed.job);
      }
    } else {
      for (const input of jobInputs) {
        try {
          jobs.push(queueOrUrl.enqueue(input));
        } catch (err) {
          if (err instanceof BridgeRequestError) {
            throw errValidation(err.message, 'pass valid canvas node and film identifiers');
          }
          throw err;
        }
      }
    }

    return {
      filmId: cleanFilmId,
      jobIds: jobs.map((j) => j.id),
      jobs,
    };
  }
}
