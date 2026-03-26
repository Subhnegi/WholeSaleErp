/**
 * API Response Types
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
}
