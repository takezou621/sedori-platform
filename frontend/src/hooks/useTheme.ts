'use client';

import { useTheme as useThemeContext } from '../providers/ThemeProvider';

export const useTheme = () => {
  return useThemeContext();
};