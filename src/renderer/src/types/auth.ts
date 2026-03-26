/**
 * Authentication and User Types
 */

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface License {
  licenseKey: string;
  startDate: string;
  endDate: string;
  isTrial: boolean;
  status: string;
}

export interface AuthData {
  user: User;
  license: License;
  token: string;
}

export interface AuthState {
  isLoggedIn: boolean;
  user: User | null;
  license: License | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}
