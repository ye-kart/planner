import { useContext } from 'react';
import { ThemeContext } from '../themes/index.js';

export function useTheme() {
  return useContext(ThemeContext);
}
