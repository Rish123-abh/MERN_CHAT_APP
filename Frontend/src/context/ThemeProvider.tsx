import {useState} from "react";
import { ThemeContext } from "./ThemeContext";
import type { ReactNode } from "react";

export const ThemeProvider=({children}:{children:ReactNode})=>{
    const [theme,setTheme]=useState<'light'|'dark'>('light');
    const toggleTheme=()=>{
        setTheme((prevTheme)=>(prevTheme==='light'?'dark':'light'));
    }
    return(
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
    );
}

