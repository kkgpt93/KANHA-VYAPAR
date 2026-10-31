import { ColorThemeId, ColorThemeMeta } from '../types';

export const DEFAULT_COLOR_THEME: ColorThemeId = 'peacock';

export const COLOR_THEMES: ColorThemeMeta[] = [
  {
    id: 'peacock',
    name: 'Royal Peacock & Gold',
    nameHindi: 'मयूर नील और गोल्ड',
    description: 'Deep midnight sapphire command bar, ocean-teal actions & saffron gold highlights',
    commandHex: '#0A2540',
    accentHex: '#0E7490',
    highlightHex: '#F59E0B',
  },
  {
    id: 'maharaja',
    name: 'Maharaja Indigo',
    nameHindi: 'महाराजा इंडिगो',
    description: 'Imperial indigo-velvet header, crisp sapphire accents & marigold active states',
    commandHex: '#1B144A',
    accentHex: '#4338CA',
    highlightHex: '#FBBF24',
  },
  {
    id: 'ruby',
    name: 'Shahi Ruby & Ivory',
    nameHindi: 'शाही रूबी मैरून',
    description: 'Velvet garnet command surface, warm silk-ivory canvas & rich crimson CTAs',
    commandHex: '#420D21',
    accentHex: '#BE123C',
    highlightHex: '#FCD34D',
  },
  {
    id: 'kesariya',
    name: 'Kesariya Copper',
    nameHindi: 'केसरिया कॉपर',
    description: 'Warm espresso-bronze command bar, sandstone canvas & vibrant saffron-copper CTAs',
    commandHex: '#33180C',
    accentHex: '#C2410C',
    highlightHex: '#FBBF24',
  },
  {
    id: 'emerald',
    name: 'Malabar Emerald',
    nameHindi: 'मालाबार पन्ना ग्रीन',
    description: 'Deep forest-pine command header, sage-porcelain canvas & jade-emerald actions',
    commandHex: '#082B20',
    accentHex: '#047857',
    highlightHex: '#FBBF24',
  },
];
