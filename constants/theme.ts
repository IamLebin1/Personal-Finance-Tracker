export interface ThemeColors {
  background: string;
  card: string;
  cardBorder: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryBg: string;
  secondary: string;
  success: string;
  danger: string;
  accent: string;
  statusBar: 'light-content' | 'dark-content';
}

export const DarkPalette: ThemeColors = {
  background: '#070817',
  card: '#16193b',
  cardBorder: '#232859',
  text: '#ffffff',
  textMuted: '#8a90c6',
  primary: '#8a6eff',
  primaryBg: 'rgba(138, 110, 255, 0.15)',
  secondary: '#101230',
  success: '#20ce8f',
  danger: '#ff4d6d',
  accent: '#a18aff',
  statusBar: 'light-content',
};

export const LightPalette: ThemeColors = {
  background: '#f5f7ff',
  card: '#ffffff',
  cardBorder: '#e0e4f5',
  text: '#070817',
  textMuted: '#636781',
  primary: '#6e57ff',
  primaryBg: 'rgba(110, 87, 255, 0.1)',
  secondary: '#ffffff',
  success: '#00b894',
  danger: '#ff7675',
  accent: '#8a6eff',
  statusBar: 'dark-content',
};

export type ThemeType = 'dark' | 'light';
