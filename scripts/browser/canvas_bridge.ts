// scripts/browser/canvas_bridge.ts — Infinite canvas bridge (Lumina / Google Flow style).

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

export class CanvasBridgeRunner {
  buildCanvasNodeGraph(params: CanvasGraphParams): CanvasGraphOutput {
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
}
