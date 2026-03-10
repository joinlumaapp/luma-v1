// Shared premium design constants for all purchase/subscription screens
// Ensures visual consistency across PackagesScreen, MembershipPlansScreen, JetonMarketScreen

export const PREMIUM_THEME = {
  // Background — powder pink matching LUMA heart logo
  bg: '#E8A4B8',
  bgLight: '#F0B8C8',
  bgDark: '#D4909F',

  // Card colors — minimalist gold + matte black
  cardBg: '#1A1A1A',
  cardBgElevated: '#252525',
  cardBorder: 'rgba(255, 215, 0, 0.15)',

  // Gold metallic palette
  gold: '#FFD700',
  goldLight: '#FFE44D',
  goldDark: '#C5A600',
  goldMatte: '#B8960C',
  goldGradient: ['#FFD700', '#F0C800', '#D4A800'] as const,

  // Text on dark cards
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.45)',
  textGold: '#FFD700',

  // Text on pink background
  textOnPink: '#1A1A1A',
  textOnPinkMuted: 'rgba(26, 26, 26, 0.6)',

  // Button — metallic gold pill
  buttonBg: '#FFD700',
  buttonText: '#1A1A1A',
  buttonRadius: 28,
  buttonHeight: 56,

  // Tier accent colors
  tierColors: {
    free: { accent: '#6B7280', gradient: ['#9CA3AF', '#6B7280'] as const },
    gold: { accent: '#FFD700', gradient: ['#FFE44D', '#FFD700', '#C5A600'] as const },
    pro: { accent: '#8B5CF6', gradient: ['#A78BFA', '#8B5CF6', '#6D28D9'] as const },
    reserved: { accent: '#EC4899', gradient: ['#F472B6', '#EC4899', '#BE185D'] as const },
  },

  // Shadows
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  goldGlow: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },

  // Logo sizing
  logoSize: 120,
  logoRadius: 22,
} as const;
