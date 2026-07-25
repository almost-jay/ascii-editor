import Notifier from "ui-cues-ts";
import { settings, settingsMeta, type Settings } from "./settings";
import { showText } from "./main";
import { Color, getDirectionToOrigin, type Cell, type Position } from "./utils";
import { DEFAULT_COLOUR_PALETTES } from "./palettes";

export interface Palette {
    foreground: string;
    background: string;
    brForeground: string;
    brBackground: string;
    dimForeground: string;
    dimBackground: string;
    black: string;
    red: string;
    green: string;
    yellow: string;
    blue: string;
    magenta: string;
    cyan: string;
    white: string;
    brBlack: string;
    brRed: string;
    brGreen: string;
    brYellow: string;
    brBlue: string;
    brMagenta: string;
    brCyan: string;
    brWhite: string;
    dimBlack: string;
    dimRed: string;
    dimGreen: string;
    dimYellow: string;
    dimBlue: string;
    dimMagenta: string;
    dimCyan: string;
    dimWhite: string;
}

export type Palettes = Record<string, Palette>;

const DEFAULT_CHARSETS: Record<string, string[]> = {
    classic: ["$","@","B","%","8","&","W","M","#","*","o","a","h","k","b","d","p","q","w","m","Z","O","0","Q","L","C","J","U","Y","X","z","c","v","u","n","x","r","j","f","t","/","\\","|","(",")","1","{","}","[","]","?","-","_","+","~","<",">","i","!","l","I",";",":",",",'"',"^","'",".","`",],
    basic: [ ".",",",":",";","+","=","*","#","@"],
    full: [" ","!",'"',"#","$","%","&","'","(",")","*","+",",","-",".","/","0","1","2","3","4","5","6","7","8","9",":",";","<","=",">","?","@","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z","[","\\","]","^","_","`","a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z","{"," ","|"," ","}","~"],
    ramp: [" ",".","'","\`","^",'"',",",":",";","I","l","!","i","~","+","_","-","?","]","[","}","{","1",")","(","|","\\","/","*","t","f","j","r","x","n","u","v","c","z","X","Y","U","J","C","L","Q","0","O","Z","m","w","q","p","d","b","k","h","a","o","*","#","M","W","&","8","%","B","@","$"],
    blocks: [" ","░","▒","▓","█"],
    braille: ["⠀","⠁","⠂","⠃","⠄","⠅","⠆","⠇","⠈","⠉","⠊","⠋","⠌","⠍","⠎","⠏","⠐","⠑","⠒","⠓","⠔","⠕","⠖","⠗","⠘","⠙","⠚","⠛","⠜","⠝","⠞","⠟","⠠","⠡","⠢","⠣","⠤","⠥","⠦","⠧","⠨","⠩","⠪","⠫","⠬","⠭","⠮","⠯","⠰","⠱","⠲","⠳","⠴","⠵","⠶","⠷","⠸","⠹","⠺","⠻","⠼","⠽","⠾","⠿","⡀","⡁","⡂","⡃","⡄","⡅","⡆","⡇","⡈","⡉","⡊","⡋","⡌","⡍","⡎","⡏","⡐","⡑","⡒","⡓","⡔","⡕","⡖","⡗","⡘","⡙","⡚","⡛","⡜","⡝","⡞","⡟","⡠","⡡","⡢","⡣","⡤","⡥","⡦","⡧","⡨","⡩","⡪","⡫","⡬","⡭","⡮","⡯","⡰","⡱","⡲","⡳","⡴","⡵","⡶","⡷","⡸","⡹","⡺","⡻","⡼","⡽","⡾","⡿","⢀","⢁","⢂","⢃","⢄","⢅","⢆","⢇","⢈","⢉","⢊","⢋","⢌","⢍","⢎","⢏","⢐","⢑","⢒","⢓","⢔","⢕","⢖","⢗","⢘","⢙","⢚","⢛","⢜","⢝","⢞","⢟","⢠","⢡","⢢","⢣","⢤","⢥","⢦","⢧","⢨","⢩","⢪","⢫","⢬","⢭","⢮","⢯","⢰","⢱","⢲","⢳","⢴","⢵","⢶","⢷","⢸","⢹","⢺","⢻","⢼","⢽","⢾","⢿","⣀","⣁","⣂","⣃","⣄","⣅","⣆","⣇","⣈","⣉","⣊","⣋","⣌","⣍","⣎","⣏","⣐","⣑","⣒","⣓","⣔","⣕","⣖","⣗","⣘","⣙","⣚","⣛","⣜","⣝","⣞","⣟","⣠","⣡","⣢","⣣","⣤","⣥","⣦","⣧","⣨","⣩","⣪","⣫","⣬","⣭","⣮","⣯","⣰","⣱","⣲","⣳","⣴","⣵","⣶","⣷","⣸","⣹","⣺","⣻","⣼","⣽","⣾","⣿"],
}

//  ▘▝▖▗▌▐▀▄▛▜▙▟█
//  │─┌┐└┘├┤┬┴┼╭╮╰╯│─┃━┏┓┗┛┣┫┳┻╋║═╔╗╚╝╠╣╦╩╬
//  ♔♕♖♗♘♙♚♛♜♝♞♟
//  ✓✗●○■□▲▼▶◀
//  ←↑→↓↔↕⇐⇒⇑⇓

type CursorName = 'auto' | 'default' | 'none' | 'context-menu' | 'help' | 'pointer' | 'progress' | 'wait' | 'cell' | 'crosshair' | 'text' | 'vertical-text' | 'alias' | 'copy' | 'move' | 'no-drop' | 'not-allowed' | 'grab' | 'grabbing' | 'all-scroll' | 'col-resize' | 'row-resize' | 'n-resize' | 'e-resize' | 's-resize' | 'w-resize' | 'ne-resize' | 'nw-resize' | 'se-resize' | 'sw-resize' | 'ew-resize' | 'ns-resize' | 'nesw-resize' | 'nwse-resize' | 'zoom-in' | 'zoom-out';
type CursorSpec = CursorName | { [K in CursorName]?: string };

function createCursorMap<const T extends readonly CursorSpec[]>(items: T) {
  return items.reduce((acc, item) => {
    if (typeof item === 'string') {
      acc[item] = item;
    } else {
      Object.assign(acc, item);
    }
    return acc;
  }, {} as any);
}

export type Tool = "cursor" | "transform" | "eyedropper" | "select" | "wand" | "paint" | "line" | "fill" ;
export type ToolCategory = "selection" | "paint-style" | "set-style" | "other";

export class ToolManager {
    savedPalettes: Record<string, Palette>;
    savedCharsets: Record<string, string[]>;

    currentTool: Tool = 'cursor';
    brushSize: number = 1;

    currentStyle: {
        char: string | null;
        fgColor: string | null;
        bgColor: string | null;
    } = { char: null, fgColor: null, bgColor: null };

    currentPalette: Palette;

    charsetContainerEl: HTMLElement;
    paletteContainerEl: HTMLElement;

    modifyCellFn: (c: Partial<Cell>) => void;
    refreshFn: () => void;
    onToolChanged: () => void;

    constructor(modifyCellFn: typeof this.modifyCellFn, refreshFn: typeof this.refreshFn, onToolChanged: typeof this.onToolChanged) {
        this.modifyCellFn = modifyCellFn;
        this.refreshFn = refreshFn;
        this.onToolChanged = onToolChanged;
        this.initCursors();
        this.setupToolbar();
        this.setupCharsets();
        this.setupColourSwatches();
        this.linkSettingsDialog();

        this.currentPalette = DEFAULT_COLOUR_PALETTES['Standard'];
    }

    public get selectedFg(): string {
        return (this.currentStyle.fgColor ?? this.currentPalette.foreground);
    }
    
    public get selectedBg(): string {
        return (this.currentStyle.bgColor ?? this.currentPalette.background);
    }
    
    public get fgDefault(): string {
        return (this.currentPalette.foreground);
    }
    
    public get bgDefault(): string {
        return (this.currentPalette.background);
    }

    public get currentBrushSize(): number {
        if (this.toolType === 'paint-style') return this.brushSize;
        return 0;
    }

    public get selectionIsMask(): boolean {
        return (document.getElementById('selection-as-mask') as HTMLInputElement).checked;
    }

    public get skipBlankCells(): boolean {
        return (document.getElementById('skip-blank-cells') as HTMLInputElement).checked;
    }

    // returns a hex string which is the colour which should be DISPLAYED for the foreground
    resolveFgColor(cell: Partial<Cell>): string {
        return cell.style?.fgColor?.toString() ?? this.fgDefault;
    }
    
    // returns a hex string which is the colour which should be DISPLAYED for the background
    resolveBgColor(cell: Partial<Cell>): string {
        return cell.style?.bgColor?.toString() ?? this.bgDefault;
    }

    public get toolType(): ToolCategory {
        switch (this.currentTool) {
            case "transform":
                return "other";
            case "eyedropper":
                return "set-style";
            case "cursor":
            case "select":
            case "wand":
                return "selection";
            case "paint":
            case "line":
            case "fill":
                return "paint-style";
            default:
                console.error('Unknown tool: ',this.currentTool);
                return "other";

        }
    }

    public get toolUsesActiveCell(): boolean {
        switch (this.currentTool) {
            case "cursor":
            case "eyedropper":
            case "select":
            case "wand":
            case "paint":
            case "line":
            case "fill":
                return true;
            default:
                return false;
        }
    }

    public get currentStyledCell(): Partial<Cell> {
        return {
            char: this.currentStyle.char,
            style: {
                ...(this.currentStyle.fgColor !== null ? { fgColor: new Color(this.currentStyle.fgColor) } : {}),
                ...(this.currentStyle.bgColor !== null ? { bgColor: new Color(this.currentStyle.bgColor) } : {}),
            }
        }
    }

    // If you pass in a null, it should clear the style
    // This changes the current styled cell, does not impose it over the current selected cell!
    setCurrentCellStyling(styledCell: Partial<Cell>, impose: boolean = false) {
        if (styledCell.style) {
            if (styledCell.style?.fgColor !== undefined) {
                this.currentStyle.fgColor = styledCell.style?.fgColor?.hexString ?? null;
                this.paletteContainerEl.querySelectorAll('.selected.foreground').forEach((el) => { el.classList.remove('selected','foreground'); });
                this.paletteContainerEl.querySelectorAll(`[data-colour="${styledCell.style?.fgColor?.hexString || 'NULL' }"]`).forEach((el) => { el.classList.add('selected', 'foreground'); });
            }
            if (styledCell.style?.bgColor !== undefined) {
                this.currentStyle.bgColor = styledCell.style?.bgColor?.hexString ?? null;
                this.paletteContainerEl.querySelectorAll('.selected.background').forEach((el) => { el.classList.remove('selected','background'); });
                this.paletteContainerEl.querySelectorAll(`[data-colour="${styledCell.style?.bgColor?.hexString || 'NULL' }"]`).forEach((el) => { el.classList.add('selected', 'background'); });
            }
        }
        if (styledCell.char !== undefined) {
            this.currentStyle.char = styledCell.char;
            this.charsetContainerEl.querySelectorAll('.selected').forEach((el) => { el.classList.remove('selected') });
            this.charsetContainerEl.querySelectorAll(`[data-char="${CSS.escape(this.currentStyle.char?.trim()) || 'NULL' }"]`).forEach((el) => { el.classList.add('selected'); });
        }

        document.documentElement.style.setProperty('--current-fg', `${this.resolveFgColor(styledCell)}`);
        document.documentElement.style.setProperty('--current-bg', `${this.resolveBgColor(styledCell)}`);
        
        const preview = (document.getElementById('style-preview') as HTMLPreElement);
        preview.innerText = this.currentStyle.char;
        preview.title = `char: ${this.currentStyle.char ?? '(unset)'}\nfg: ${this.resolveFgColor(styledCell)}\nbg: ${this.resolveBgColor(styledCell)}`;

        if (impose) this.modifyCellFn(styledCell);
    }
    
    initCursors() {
        const spriteCursors: Record<CursorName, string> = createCursorMap([{ default: 'cursor-btn' },'zoom-in','crosshair', 'pointer', 'grab', 'grabbing', { move: 'transform' } ]);

        for (const [cursor, image] of Object.entries(spriteCursors)) {
            document.documentElement.style.setProperty(`--c-${cursor}`, `url("/${image}.png") ${this.getCursorImgOffset(image)}, ${cursor}`);
        }
    }
// "cursor" | "transform" | "eyedropper" | "select" | "wand" | "paint" | "line" | "fill" ;
    /**
     * @returns {string} CSS-valid string, i.e. `cursor: <string>`
     */
    getToolCursor(tool: Tool): string {
        const resolvedCursor = (cursor: CursorName) => { return imgStr+', '+document.documentElement.style.getPropertyValue(`--c-${cursor}`) };
        const imgStr = `url("/${tool}.png") ${this.getCursorImgOffset(tool)}`;
        switch(tool) {
            case "wand": 
            case "cursor": return resolvedCursor('pointer');
            case "transform": return resolvedCursor('move');
            case "eyedropper":
            case "select":
                return resolvedCursor('crosshair');
            default:
                return resolvedCursor('default');
        }
    }

    getCursorImgOffset(imgName: string): string {
        switch(imgName) {
            case "zoom-in":
            case "zoom-out": return '6 6';
            case "cursor-btn": return '4 2';
            case "pointer": return '7 0';
            case "wand": return '3 3';
            case "fill": return '2 7';
            case "paint":
            case "line":
            case "eyedropper": return '1 14';
            default: return '8 8';
        }
    }

    updateArrowCursor(cursor: Position, origin: Position) {
        const dir = getDirectionToOrigin(cursor, origin);
        if (!dir) {
            document.documentElement.style.setProperty('--canvas-cursor', this.getToolCursor(this.currentTool));
        } else {
            document.documentElement.style.setProperty('--canvas-cursor', `var(--c-${dir})`);
            const directionalCss = window.getComputedStyle(document.documentElement).getPropertyValue(`--canvas-cursor`);
            console.log(`Updated to "${directionalCss}" from direction ${dir}`);
        }
    }

    setupToolbar() {
        (document.querySelectorAll('input[name="toolbar"]')).forEach((el: HTMLInputElement) => {
            el.addEventListener('change', () => {
                if (el.checked) {
                    // Update current tool
                    const newTool = el.value as Tool;
                    // maybe could do `.tool-specific .${this.toolType}` instead?
                    document.querySelectorAll(`.tool-specific`).forEach((e: HTMLElement) => { e.style.display = 'none' });
                    this.currentTool = newTool;
                    const toolCursor = this.getToolCursor(newTool);
                    document.documentElement.style.setProperty('--canvas-cursor', toolCursor);
                    document.querySelectorAll(`.tool-specific.${this.toolType}, .tool-specific.${newTool}`).forEach((e: HTMLElement) => { e.style.display = '' });
                }
            });
        });
        document.documentElement.style.setProperty('--canvas-cursor', this.getToolCursor((document.querySelector('input[name="toolbar"]:checked') as HTMLInputElement).value as Tool));
    }

    setupCharsets() {
        const charsetSelect = document.getElementById('charset-select') as HTMLSelectElement;
        this.charsetContainerEl = document.getElementById('charset-grid') as HTMLDivElement;

        this.charsetContainerEl.innerHTML = '';
        charsetSelect.innerHTML = '';

        this.savedCharsets = JSON.parse(localStorage.getItem('charsets'));
        if (!this.savedCharsets) {
            localStorage.setItem('charsets', JSON.stringify(DEFAULT_CHARSETS));
            this.savedCharsets = DEFAULT_CHARSETS;
        }
        
        for (const charsetName in this.savedCharsets) {
            const option = document.createElement('option');
            option.value = charsetName;
            option.innerText = charsetName.charAt(0).toUpperCase() + charsetName.slice(1);
            charsetSelect.appendChild(option);
        }

        charsetSelect.addEventListener('input', () => {
            if (this.savedCharsets[charsetSelect.value]) {
                this.populateCharsetGrid(this.charsetContainerEl, this.savedCharsets[charsetSelect.value]);
            }
        });

        this.populateCharsetGrid(this.charsetContainerEl, this.savedCharsets['classic']);
    }

    populateCharsetGrid(container: HTMLElement, charset: string[]) {
        container.innerHTML = '';

        const chars: HTMLPreElement[] = [];
        const lockButton = document.getElementById('charset-lock') as HTMLInputElement;

        const handleSelection = (target: HTMLElement, char: string | null) => {
            container.querySelectorAll('.selected').forEach((el) => { el.classList.remove('selected') });
            target.classList.add('selected');
            this.setCurrentCellStyling({ char }, (this.toolType === 'selection'));
        };

        const adaptivePre = document.createElement('pre');
        adaptivePre.className = 'grid-item adaptive selected';
        adaptivePre.dataset.char = 'NULL';
        adaptivePre.innerText = '•';
        adaptivePre.title ='(unset)';
        adaptivePre.addEventListener('click', (ev: PointerEvent) => {
            ev.preventDefault();
            if (ev.button === 0) handleSelection(adaptivePre, null);
        });
        container.appendChild(adaptivePre);

        for (const ch of charset) {
            const pre = document.createElement('pre');
            pre.classList = 'grid-item';
            pre.title = ch;
            pre.dataset.char = ch;
            pre.innerText = ch;
            pre.addEventListener('click', (ev: PointerEvent) => {
                ev.preventDefault();
                if (ev.button === 2) {
                    if (!lockButton.checked) {
                        Notifier.prompt(`Set character (original: ${ch}): `, {
                            placeholder: pre.dataset.char,
                            inputType: 'text',
                            reFilter: /^.$/ // allow only one character
                        }).then((result) => {
                            if (result) {
                                pre.title = result;
                                pre.dataset.char = result;
                                pre.innerText = result;
                            }
                        })
                    }
                } else if (ev.button === 0) {
                    // left click :)
                    handleSelection(pre, ch);
                }
            });

            container.appendChild(pre);
            chars.push(pre);
        }

        lockButton.addEventListener('input', () => {
            for (const swatch of chars) lockButton.checked ? swatch.classList.add('disabled') : swatch.classList.remove('disabled');
        });
    }

    setupColourSwatches() {
        const paletteSelect = document.getElementById('palette-select') as HTMLSelectElement;
        this.paletteContainerEl = document.getElementById('palette-grid') as HTMLDivElement;

        this.paletteContainerEl.innerHTML = '';
        paletteSelect.innerHTML = '';
        this.savedPalettes = JSON.parse(localStorage.getItem("palettes"));
        if (!this.savedPalettes) {
            localStorage.setItem("palettes",JSON.stringify(DEFAULT_COLOUR_PALETTES));
            this.savedPalettes = DEFAULT_COLOUR_PALETTES;
        }

        for (const palName in this.savedPalettes) {
            const option = document.createElement('option');
            option.value = palName;
            option.innerText = palName.charAt(0).toUpperCase() + palName.slice(1); // capitalise first letter
            paletteSelect.appendChild(option);
        }

        paletteSelect.addEventListener('input', () => {
            if (this.savedPalettes[paletteSelect.value]) {
                this.populateColourSwatches(this.paletteContainerEl, this.savedPalettes[paletteSelect.value]);
                this.currentPalette = this.savedPalettes[paletteSelect.value];
                this.refreshFn();
            }
        });

        this.populateColourSwatches(this.paletteContainerEl, this.savedPalettes['Standard'] ?? DEFAULT_COLOUR_PALETTES['Standard']);
    }

    populateColourSwatches(container: HTMLElement, palette: Palette) {
        container.innerHTML = '';
        const swatches: HTMLPreElement[] = [];
        const lockButton = document.getElementById('palette-lock') as HTMLInputElement;

        const handleSelection = (target: HTMLElement, colour: string | null, type: 'foreground' | 'background') => {
            container.querySelectorAll('.selected.'+type).forEach((el) => { el.classList.remove('selected'); el.classList.remove(type) });
            target.classList.add('selected', type);
            this.setCurrentCellStyling({ style: { [type === 'foreground' ? 'fgColor' : 'bgColor']: colour ? new Color(colour) : null } }, (this.toolType === 'selection'))
        };

        const existingColours = [];

        // To extend for background colour, add a second handleSelection & split this into handleFgSelection and handleBgSelection 
        // (with different styling on the CSS)

        const adaptivePre = document.createElement('pre');
        adaptivePre.className = 'grid-item adaptive selected foreground background';
        adaptivePre.innerText = '•';
        adaptivePre.title ='(unset)';
        adaptivePre.dataset.colour = 'NULL';
        adaptivePre.addEventListener('click', (ev: PointerEvent) => {
            ev.preventDefault();
            if (ev.button === 0) handleSelection(adaptivePre, null, ev.altKey ? 'background' : 'foreground');
        });
        container.appendChild(adaptivePre);
        for (const [name, col] of Object.entries(palette)) {
            if (!existingColours.includes(col)) {
                const pre = document.createElement('pre');
                pre.classList = 'grid-item swatch-item';
                pre.dataset.colour = col;
                pre.style.backgroundColor = col;
                pre.title = `${name}: ${col}`;
                pre.addEventListener('click', (ev: PointerEvent) => {
                    ev.preventDefault();
                    if (ev.button === 2) {
                        if (!lockButton.checked) {
                            Notifier.colorPicker({
                                initialColor: pre.dataset.colour,
                                theme: 'dark',
                                showPalette: false
                            }).then((colorResult) => {
                                if (colorResult) {
                                    pre.dataset.colour = colorResult;
                                    pre.style.backgroundColor = colorResult;
                                    pre.title = colorResult;
                                }
                            })
                        }
                    } else if (ev.button === 0) handleSelection(pre, col, ev.altKey ? 'background' : 'foreground');
                });
    
                container.appendChild(pre);
                swatches.push(pre);
                existingColours.push(col);
            }
        }

        lockButton.addEventListener('input', () => {
            for (const swatch of swatches) lockButton.checked ? swatch.classList.add('disabled') : swatch.classList.remove('disabled');
        });
    }

    linkSettingsDialog() {
        const btn = document.getElementById('options-btn');
        if (!btn) return;

        const dialog = document.createElement('dialog');
        dialog.id = 'settings-dialog';
        document.body.appendChild(dialog);

        dialog.innerHTML = '';

        const form = document.createElement('form');
        form.method = 'dialog';

        const title = document.createElement('h2');
        title.textContent = 'Options';
        form.appendChild(title);

        const filterDiv = document.createElement('div');
        filterDiv.className = 'settings-filter-container';

        const filterBox = document.createElement('input');
        filterBox.type = "text";
        filterBox.id = 'settings-filter';
        filterBox.placeholder = "Filter settings...";
        filterBox.maxLength = 10;

        form.appendChild(filterDiv);

        const fieldGetters: Array<() => [keyof Settings, unknown]> = [];

        filterBox.addEventListener('input', () => {
            const filter = filterBox.value.toLowerCase().trim();                       
            if (filter.length < 2) return;

            if (!filter) form.querySelectorAll('[filtertags]').forEach((el: HTMLElement) => { el.style.display = '' });
            else form.querySelectorAll('[filtertags]').forEach((el: HTMLElement) => { 
                if (!el.dataset["filtertags"].includes(filter)) {
                    el.style.display = 'none';
                }
            });
        });

        filterDiv.appendChild(filterBox);
        
        for (const [key, rawMeta] of Object.entries(settingsMeta)) {
            const meta = rawMeta as {
                type: string;
                label?: string;
                min?: number;
                max?: number;
                options?: string[];
            };

            const wrapper = document.createElement('div');
            wrapper.className = 'setting-field';
            wrapper.dataset["filtertags"] = (
                [key, ...meta.label.split(' '), ...(meta.options || [])].join(' ').toLowerCase().match(/[a-z0-9]+/g).join(' ')
            );

            const label = document.createElement('label');
            const labelText = document.createElement('span');
            labelText.textContent = meta.label ?? key;
            label.appendChild(labelText);

            const currentValue = settings[key as keyof Settings];

            if (meta.options && Array.isArray(meta.options)) {
                const select = document.createElement('select');
                meta.options.forEach((opt) => {
                    const option = document.createElement('option');
                    option.value = opt;
                    option.textContent = opt;
                    if (opt === String(currentValue)) option.selected = true;
                    select.appendChild(option);
                });
                label.appendChild(select);
                fieldGetters.push(() => [key as keyof Settings, select.value]);

            } else if (meta.type === 'boolean') {
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.classList = 'icon-btn';
                checkbox.dataset.icon = 'checkbox';
                checkbox.checked = Boolean(currentValue);

                checkbox.style.backgroundImage = `url('/checkbox-${checkbox.checked ? 'checked' : 'unchecked'}.png')`;
                checkbox.onchange = () => checkbox.style.backgroundImage = `url('public/checkbox-${checkbox.checked ? 'checked' : 'unchecked'}.png')`

                label.append(checkbox);
                fieldGetters.push(() => [key as keyof Settings, checkbox.checked]);

            } else if (meta.type === 'number' || meta.type === 'float') {
                const input = document.createElement('input');
                input.type = 'number';
                if (meta.min !== undefined) input.min = String(meta.min);
                if (meta.max !== undefined) input.max = String(meta.max);
                if (meta.type === 'float') input.step = 'any';
                input.value = String(currentValue);
                label.appendChild(input);
                fieldGetters.push(() => [key as keyof Settings, Number(input.value)]);
            } else if (meta.type === 'char') {
                const input = document.createElement('input');
                input.type = 'text';
                input.classList = 'char-input'
                input.maxLength = 1;

                input.value = String(currentValue);
                label.appendChild(input);
                fieldGetters.push(() => [key as keyof Settings, input.value]);

            } else if (meta.type === 'color') {
                const input = document.createElement('input');
                input.type = 'color';

                const hexVal = String(currentValue);
                input.value = hexVal.length === 5 ? `#${hexVal[1]}${hexVal[1]}${hexVal[2]}${hexVal[2]}${hexVal[3]}${hexVal[3]}` : hexVal.slice(0, 7);
                label.appendChild(input);
                fieldGetters.push(() => [key as keyof Settings, input.value]);

            } else {
                const input = document.createElement('input');
                input.type = 'text';
                input.value = String(currentValue);
                label.appendChild(input);
                fieldGetters.push(() => [key as keyof Settings, input.value]);
            }
            wrapper.appendChild(label);
            form.appendChild(wrapper);
        }

        const actions = document.createElement('div');
        actions.className = 'dialog-actions';

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', () => dialog.close());

        const saveBtn = document.createElement('button');
        saveBtn.type = 'submit';
        saveBtn.textContent = 'Save';

        actions.appendChild(cancelBtn);
        actions.appendChild(saveBtn);
        form.appendChild(actions);

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            fieldGetters.forEach((getFieldValue) => {
                const [key, val] = getFieldValue();
                (settings as any)[key] = val; });
            dialog.close();
            this.refreshFn();
        });

        dialog.appendChild(form);

        btn.addEventListener('click', () => {
            this.openSettingsDialog();
        });
    }

    openSettingsDialog() {
        showText('Opening settings dialog');
        let dialog = document.getElementById('settings-dialog') as HTMLDialogElement;
        dialog.showModal();
    }

    public getCharmapInput(commonCharacters: string[], current: string): Promise<string | null> {
        const characters = new Set(...commonCharacters, ...Object.values(this.savedCharsets).flat());
        return Notifier.select("Type to search for character", Array.from(characters), { placeholder: current });
    }
}