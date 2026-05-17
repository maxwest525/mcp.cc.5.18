import type { ConnectionKey, ConnectionStatus } from "../types";

export interface OAuthConnectionStatus {
  connectionKey: ConnectionKey;
  status: ConnectionStatus;
  authorized: boolean;
  authUrl?: string;
  scopes?: string[];
  expiresAt?: string;
}

export interface OAuthAdapter {
  connectionKey: ConnectionKey;
  /** Begin OAuth flow; returns a URL the user must visit. */
  beginAuth(): Promise<{ authUrl: string }>;
  /** Get current authorization status. */
  getStatus(): Promise<OAuthConnectionStatus>;
  /** Optional revoke. */
  revoke?(): Promise<void>;
}
