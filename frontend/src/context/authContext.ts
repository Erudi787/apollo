import { createContext } from "react";
import type { AuthUser } from "../types";

export interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    login: () => void;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
