const STORAGE_KEY = 'settings';

const schema = {
  showGrid: {
    default: true,
    control: { type: 'boolean', label: 'Show grid lines' },
  },
  fontSize: {
    default: 24,
    control: { type: 'number', label: 'Font size', min: 2, max: 128 },
  },
  fontFamily: {
    default: 'monospace',
    control: { type: 'string', label: 'CSS font family string, sets the font family to be used for rendering the main canvas' } 
  },
  cellHeightFactor: {
    default: 2,
    control: { type: 'float', label: 'Bare height of each character cell relative to its width', min: 0 }
  },
  typingDirection: {
    default: 'right' as 'right' | 'down',
    control: { type: 'select', label: 'Typing direction', options: ['right', 'down'] },
  },
  selectionMaskColor: {
    default: '#000',
    control: { type: 'color', label: 'Colour to mask out the unselected cells while a selection is active' }
  },
  selectionMaskOpacity: {
    default: 0.6,
    control: { type: 'float', label: 'Opacity of selection mask, with 0 being transparent and 1 being darkest', min: 0.0, max: 1.0 }
  },
  selectionMaskPersist: {
    default: 'whileActive' as 'whileActive' | 'always' | 'never',
    control: { type: 'select', label: 'When to show the selection mask', options: ['whileActive','always','never'] }
  },
  maxStackLength: {
    default: 32,
    control: { type: 'number', label: 'Maximum undo stack size in number of items', min: 1 }
  },
  recentUndoThreshold: {
    default: 60,
    control: { type: 'number', label: 'Time in seconds to keep undo history at 100% precision', min: 0 }
  },
  idleThreshold: {
    default: 30,
    control: { type: 'number', label: 'Time in seconds to discard between edits when pruning undo stack', min: 0 }
  },
  charMapKey: {
    default: '\`',
    control: { type: 'char', label: 'Key to hold down to trigger character map menu' }
  },
  longPressTime: {
    default: 400,
    control: { type: 'number', label: 'Time in ms to hold down the char map key to trigger the menu' }
  },
  keepLastNChars: {
    default: 30,
    control: { type: 'number', label: 'Number of characters to keep in recent history' }
  },
  checkerboard: {
    default: true,
    control: { type: 'boolean', label: 'Whether to show a checkerboard pattern' }
  },
  crosshairHighlighting: {
    default: true,
    control: { type: 'boolean', label: 'Whether to highlight the active row and column' }
  },
  secondaryCursorType: {
    default: 'none' as 'none' | 'crosshair' | 'dot' | 'ring',
    control: { type: 'select', label: 'Secondary cursor shape', options: ['none', 'crosshair', 'dot', 'ring'] }
  },
  secondaryCursorColour: {
    default: 'magenta' as  'magenta' | 'cyan' | 'black' | 'yellow' | 'grey',
    control: { type: 'select', label: 'Colour in which to render the secondary cursor', options: ['magenta', 'cyan', 'black', 'yellow', 'grey'] }
  },
} satisfies Record<string, { default: unknown; control?: unknown }>;

export type Settings = { [K in keyof typeof schema]: (typeof schema)[K]['default'] };

export const defaultSettings: Settings = Object.fromEntries(
  Object.entries(schema).map(([key, def]) => [key, def.default])
) as Settings;

export const settingsMeta = Object.fromEntries(
  Object.entries(schema)
    .filter(([, def]) => 'control' in def)
    .map(([key, def]) => [key, (def as any).control])
);

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultSettings };
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return { ...defaultSettings };
  } finally {
    console.info('Settings loaded from localStorage');
  }
}

function persist(data: Settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error(err);
    console.warn('See previous message. Storage may be full or blocked?');
  }
}

type Listener = (settings: Settings) => void;
const listeners = new Set<Listener>();

export function onSettingsChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const data = load();

export const settings: Settings = new Proxy(data, {
  set(target, prop, value) {
    (target as any)[prop] = value;
    persist(target);
    listeners.forEach((fn) => fn(target));
    return true;
  },
});