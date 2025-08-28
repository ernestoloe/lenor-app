import { theme } from '../theme';

export type AppTheme = typeof theme;

/**
 * Define la estructura de un anuncio.
 */
export interface Announcement {
  title: string;
  content: string;
  created_at: string;
}

export interface ServiceStatus {
  name: string;
  // ... existing code ...
} 