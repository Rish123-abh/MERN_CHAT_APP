import { createContext } from "react";

export interface ThemeContextType {
  theme: "light" | "dark";
  toggleTheme: () => void;
}

// ✅ Only context here — no components
export const ThemeContext = createContext<ThemeContextType | null>(null);
