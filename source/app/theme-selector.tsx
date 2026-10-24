'use client';
import {useEffect, useState} from 'react';
type Theme = 'dark' | 'gray' | 'light';
declare global { interface Window { StudioTheme?: {get: () => Theme; set: (theme: Theme) => void}; } }
export default function ThemeSelector() {
  const [theme, setTheme] = useState<Theme>('dark');
  useEffect(() => {
    const sync = () => setTheme(window.StudioTheme?.get() || 'dark');
    sync(); window.addEventListener('studio-theme-change', sync);
    return () => window.removeEventListener('studio-theme-change', sync);
  }, []);
  return <label className="interface-theme-control"><span>Aparência</span><select aria-label="Tema da interface" value={theme} onChange={e => {const next=e.target.value as Theme;window.StudioTheme?.set(next);setTheme(next);}}><option value="dark">Escuro</option><option value="gray">Cinza</option><option value="light">Claro</option></select></label>;
}
