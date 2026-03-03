import { createContext } from 'react';

export interface ClientPrincipal {
  userDetails: string;   // AAD email/UPN
  userId: string;        // AAD object ID (lowercase 'd' — matches SWA JSON payload)
  userRoles: string[];   // ['anonymous', 'authenticated']
}

export interface UserContextType {
  user: ClientPrincipal | null;
  setUser: (user: ClientPrincipal | null) => void;
  isLoading: boolean;
}

export const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
  isLoading: true,
});
