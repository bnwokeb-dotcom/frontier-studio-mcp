export type ImageSize = '1K' | '2K' | '4K';

export interface ImageLaneRequest {
  prompt: string;
  /** Reference images; max 14, enforced by the caller. */
  refImages: { data: Buffer; mimeType: string }[];
  /** e.g. '16:9' */
  aspectRatio: string;
  imageSize: ImageSize;
  previousInteractionId?: string;
}

export interface LaneInteraction {
  interactionId: string;
}

export interface LaneStatus {
  done: boolean;
  interactionId: string;
}

export interface ImageArtifact {
  data: Buffer;
  mimeType: string;
  interactionId: string;
  priceUsd: number;
}

export interface ImageLane {
  readonly cameraVocabulary: 'prose';
  price(req: ImageLaneRequest): number;
  submit(req: ImageLaneRequest): Promise<LaneInteraction>;
  /** Images are synchronous: always `{ done: true }`. */
  status(ref: LaneInteraction): Promise<LaneStatus>;
  result(ref: LaneInteraction): Promise<ImageArtifact>;
}

export type FetchLike = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;
