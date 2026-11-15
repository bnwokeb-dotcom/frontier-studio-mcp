export type ErrorCode = 'AUTH' | 'BUDGET' | 'VALIDATION' | 'LANE_DOWN' | 'JOB_FAILED' | 'NOT_FOUND';

export class StudioError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly nextAction: string,
  ) {
    super(`${message} — NEXT: ${nextAction}`);
    this.name = 'StudioError';
  }
}
export const errValidation = (m: string, next: string) => new StudioError('VALIDATION', m, next);
export const errNotFound = (m: string, next: string) => new StudioError('NOT_FOUND', m, next);
export const errAuth = (m: string, next: string) => new StudioError('AUTH', m, next);
export const errBudget = (m: string, next: string) => new StudioError('BUDGET', m, next);
export const errLaneDown = (m: string, newA: string) => new StudioError('LANE_DOWN', m, newA);
export const errJobFailed = (m: string, next: string) => new StudioError('JOB_FAILED', m, next);
