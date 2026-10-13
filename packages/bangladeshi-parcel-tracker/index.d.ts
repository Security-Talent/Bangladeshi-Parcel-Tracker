export type Courier = "redx" | "steadfast" | "pathao" | "rokomari" | "sundarban";
export type StatusCode = "PENDING" | "PICKED_UP" | "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED" | "FAILED" | "CANCELLED" | "RETURNED" | "UNKNOWN";

export interface TrackingOptions {
  timeoutMs?: number;
  /** Retries transient failures for idempotent GET-based providers only. Defaults to 0. */
  retries?: number;
  /** Initial exponential retry delay before jitter. Defaults to 100 ms. */
  retryDelayMs?: number;
  signal?: AbortSignal;
}

export interface TrackOptions extends TrackingOptions {
  /** Opt in to in-memory caching. Disabled by default. */
  cacheTtlMs?: number;
  /** Skip a cached value and make an upstream request. */
  bypassCache?: boolean;
}

export interface TrackingEvent {
  status: string | null;
  description: string | null;
  timestamp: string | null;
  location: string | null;
}

export interface TrackResult {
  success: true;
  courier: Courier;
  trackingNumber: string;
  status: { code: StatusCode; label: string; sourceStatus: string | null };
  estimatedDelivery: string | null;
  events: TrackingEvent[];
  /** Always null; raw upstream payloads can contain personal information. */
  raw: null;
}

export interface TrackInput {
  courier: string;
  trackingNumber: string;
  /** Required for Pathao and Rokomari only. */
  phone?: string;
}

export type TrackingErrorCode = "INVALID_INPUT" | "UNSUPPORTED_COURIER" | "AUTHENTICATION_FAILED" | "COURIER_API_ERROR" | "TIMEOUT" | "RATE_LIMITED" | "ABORTED";

export class TrackingError extends Error {
  readonly code: TrackingErrorCode;
  readonly retryable: boolean;
  readonly cause?: { readonly name: string; readonly code?: string };
}

export const ERROR_CODES: readonly TrackingErrorCode[];
export function getSupportedCouriers(): Courier[];
export function track(input: TrackInput, options?: TrackOptions): Promise<TrackResult>;
export function redx(trackingNumber: string, options?: TrackingOptions): Promise<unknown>;
export function steadfast(trackingNumber: string, options?: TrackingOptions): Promise<unknown>;
export function pathao(trackingNumber: string, phone: string, options?: TrackingOptions): Promise<unknown>;
export function rokomari(trackingNumber: string, phone: string, options?: TrackingOptions): Promise<unknown>;
export function sundarban(trackingNumber: string, options?: TrackingOptions): Promise<unknown>;

declare const tracker: {
  track: typeof track;
  getSupportedCouriers: typeof getSupportedCouriers;
  redx: typeof redx;
  steadfast: typeof steadfast;
  pathao: typeof pathao;
  rokomari: typeof rokomari;
  sundarban: typeof sundarban;
  TrackingError: typeof TrackingError;
  ERROR_CODES: typeof ERROR_CODES;
};

export default tracker;
