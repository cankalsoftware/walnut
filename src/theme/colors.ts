/**
 * Walnut Analysis — Light Walnut Green Design System Tokens
 * Tuned for high outdoor legibility under orchard sunlight and dappled shade.
 */

export const Colors = {
  // Signature Light Walnut Green Scale
  walnutGreen: {
    50: '#F4F8F1',   // Orchard Mist (Main Canvas)
    100: '#E6F0E0',  // Soft Husk (Elevated Surface / Card Header)
    200: '#CFE3C4',  // Light Walnut Green (Signature Brand Tint / Active Pills / Bubbles)
    300: '#A8CC96',  // Spring Leaf (Borders / Subtle Dividers)
    400: '#88B574',  // Mid Husk
    500: '#6B9E58',  // Primary Brand Action (Buttons, Active Tab, Progress Ring)
    600: '#538442',  // Hover / Active Accent
    700: '#3E6B30',  // Deep Grove (High-Contrast Badges)
    800: '#294A1F',  // Canopy Shadow
    900: '#1A2616',  // Deep Bark Charcoal (Primary Text - WCAG AAA)
  },

  // Warm Walnut Wood & Shell Accents
  walnutShell: {
    50: '#FBF7F2',
    100: '#F5EBE0',  // Warm Kernel Parchment
    200: '#E6D0B8',
    500: '#8C5A32',  // Roasted Walnut Shell (Secondary Brand Accent)
    700: '#5C381B',  // Heartwood
  },

  // High-Visibility AR & YOLO Bounding Box Tokens (for Camera HUD)
  visionHud: {
    glassBg: 'rgba(17, 24, 15, 0.80)',
    glassBorder: 'rgba(207, 227, 196, 0.28)',
    canopyHealthy: '#00E676',  // Electric Emerald for green canopy walnuts
    canopyHullSplit: '#FFAB00', // Amber Gold for split-hull harvest-ready walnuts
    canopyBlight: '#FF5252',   // Coral Red for blighted/damaged nuts
    groundClean: '#CCFF00',    // High-Vis Harvest Lime for fallen walnuts on brown leaves/soil
    groundInHull: '#FFD600',   // Bright Gold for fallen walnuts still in hull
  },

  // Care Category Semantic Colors
  careCategory: {
    pruning: '#8C5A32',   // Walnut Wood Brown
    watering: '#0288D1',  // Irrigation Blue
    feeding: '#558B2F',   // Nutrient Green
    harvest: '#E65100',   // Autumn Amber
    winter: '#455A64',    // Frost Slate
  },

  // Neutral & Status Tokens
  surface: {
    canvas: '#F4F8F1',
    card: '#FFFFFF',
    cardTinted: '#EBF3E6',
    border: '#D5E5CC',
  },

  text: {
    primary: '#1A2616',
    secondary: '#4E6147',
    muted: '#76896F',
    onPrimary: '#FFFFFF',
  },

  status: {
    success: '#2E7D32',
    warning: '#EF6C00',
    danger: '#C62828',
    info: '#1565C0',
  },
} as const;

