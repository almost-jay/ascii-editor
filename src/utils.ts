const HEX_COLOUR_PATTERN = new RegExp(/^#?(?:[a-f0-9]{3,4}|[a-f0-9]{6}|[a-f0-9]{8})$/i);

export type RGB = { r: number, g: number, b: number }
export type Position = { r: number; c: number };

export class Color {
    readonly #source: string | RGB;
    hexString: string;
    rgbVal: RGB;

    constructor(value: string | RGB) {
        this.#source = value;
        if (typeof value === "string" && (HEX_COLOUR_PATTERN.test(value))) {
            this.hexString = value;
            this.rgbVal = Color.hexToRgb(value);
        } else if (typeof value === "object" && "r" in value && "g" in value && "b" in value) {            this.rgbVal = value;
            this.hexString = Color.rgbToHex(value.r, value.g, value.b);
        } else {
            console.error(`${value} not a recognised colour!`);
        }
    }

    public get rgbStr(): string {
        return `rgb(${this.rgbVal.r}, ${this.rgbVal.g}, ${this.rgbVal.b})`;
    }

    toString(): string {
        if (typeof this.#source === "string") {
            return this.#source;
        } else {
            return this.rgbStr;
        }
    }

    public static add(a: RGB, b: RGB): Color {
        return new Color({ r: a.r + b.r, g: a.g + b.g, b: a.b + b.b });
    }

    public static hexToRgb(hex: string): { r: number, g: number, b: number } | null {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    public static rgbToHex(r: number, g: number, b: number): string {
        return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase();
    }
}

export interface CellStyle {
    bold?: boolean;
    faint?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    fgColor?: Color;
    bgColor?: Color;
}

export class Cell {
    private _char: string | null;
    private _style: CellStyle = {};
    public pos: Position;
    public isActive: boolean = false;
    private _isSelected: boolean = false;

    constructor(v: string|null, pos: Position) {
        if (v !== null && v.length != 1) console.error(`Error while constructing cell: A cell can only contain a single character (read: ${v} with length ${v.length})`);
        this._char = v;
        this.pos = pos; // TODO: validate

        // showText('New cell with char '+this._char);
    }

    public set char(v: string|null) {
        if (v !== null && v.length != 1) console.error(`A cell can only contain a single character (read: ${v} with length ${v.length})`);
        if (v != null && (v === ' ' || v.trim().length === 0)) v = null;
        this._char = v;
    }

    public get char() {
        return this._char || ' ';
    }

    toString(): string {
        return this.char;
    }

    reset(_v?: CellStyle): void {
        // TODO: if an object is passed, only reset the entries in that object (using it as a mask)
        this._style = {
            // bold: false,
            // faint: false,
            // italic: false,
            // underline: false,
            // strikethrough: false,
            // fgColor: null,
            // bgColor: null,
        };
    }

    public set style(v: CellStyle) {
        this._style = { ...this._style, ...v };
    }

    public get style() {
        return this._style;
        // TODO: use this getter to make the whole fallback thing easier
    }

    public set isSelected(v: boolean) {
        this._isSelected = v;
    }

    public get isSelected(): boolean {
        return this._isSelected;
    }

    public get hasChar(): boolean {
        return this._char !== null;
    }
}

export const clampf = (val, min, max) => Math.max(min, Math.min(max, val));
export const clampi = (val, min, max) => Math.round(clampf(val, min, max));

// returns n where width = height * n
export function getFontAspectRatio(fontFamily: string): number {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0.6; // Fallback default for standard mono fonts

  const fontSize = 100;
  ctx.font = `${fontSize}px ${fontFamily}`;

  // measureText returns the exact layout advance width in pixels
  const metrics = ctx.measureText('M');
  const width = metrics.width;

  // At line-height: 1, layout height equals font size (1em)
  return width / fontSize;
}

export function getReadableName(el) {
  if (!el) return 'null';
  let name = el.tagName.toLowerCase();
  if (el.id) name += `#${el.id}`;
  if (el.className) name += `.${el.className.split(/\s+/).join('.')}`;
  return name;
}

export async function getClipboardText(): Promise<string> {
  try {
    const text = await navigator.clipboard.readText();
    return text;
  } catch (error) {
    console.error("Failed to read clipboard:", error);
  }
}

export async function getClipboardBlob(): Promise<Blob> {
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      if (item.types.includes("image/png")) {
        const blob = await item.getType("image/png");
        return blob;
      }
    }
  } catch (error) {
    console.error("Failed to read complex data:", error);
  }
}

export async function copyToClipboard(text): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy text: ', err);
    return false;
  }
}

export type Direction = "nw" | "ne" | "sw" | "se" | null;

/**
 * Returns the direction from cursor to origin.
 * ("nw", "ne", "sw", "se", or null if indeterminate)
 */
export function getDirectionToOrigin(cursor: Position, origin: Position): Direction {
  // Indeterminate if they are on the same row or column
  if (cursor.r === origin.r || cursor.c === origin.c) {
    return null;
  }

  const vertical = origin.r < cursor.r ? "n" : "s";
  const horizontal = origin.c < cursor.c ? "w" : "e";

  return `${vertical}${horizontal}` as Direction;
}