/**
 * Database and Application Data Types
 */

export interface VersionInfo {
  node: string;
  chrome: string;
  electron: string;
}

export interface Meta {
  key: string;
  value: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PhaseStatus {
  phase: string;
  status: 'pending' | 'in-progress' | 'complete';
  description: string;
  completedAt?: string;
}
