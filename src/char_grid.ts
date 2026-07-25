import Notifier from "ui-cues-ts";
import { showText } from "./main";
import { settings } from "./settings";
import { ToolManager } from "./tool_manager";
import { Cell, clampf, clampi, Color, copyToClipboard, debounce, getClipboardText, getDirectionToOrigin, getFontAspectRatio, type CellStyle, type Direction, type Position } from "./utils";
type SelectionOperation = "replace" | "add" | "intersect" | "subtract";

const SelectAdd = (_target): boolean => { return true };
const SelectSubtract = (_target: boolean): boolean => { return false };
const SelectFlip = (target: boolean): boolean => { if (target == true) return false; return true; };

const TWOPI = 2 * Math.PI;

interface Snapshot {
    ansiGrid: string;    // The complete text buffer with ANSI color codes
    selection: number[]; // Flat integer indices of selected cells (flattened from row & col)
    time: number; // time at which snapshot was saved
}

export class CharGrid {
    width: number; // number of columns
    height: number; // number of rows
    cellWidth: number; // width of one cell in px
    cellHeight: number; // height of one cell in px
    grid: Cell[][] = []; // always grid[row][col]
    flatGrid: Cell[] = []; // cheap, don't modify once set
    
    undoStack: Snapshot[] = [];
    redoStack: Snapshot[] = [];

    undoBtn: HTMLButtonElement;
    redoBtn: HTMLButtonElement;

    currentZoom: number = 1.0;
    currentPanX: number = 0.0;
    currentPanY: number = 0.0;
    awaitingMouseUp: boolean = false;
    isPanning: boolean = false;
    lastPanPos: { x: number, y: number } = { x: 0, y: 0 };
    
    lastMouseEv: MouseEvent | null;
    mouseStartEv: MouseEvent | null;

    animCallbacks: Set<()=>boolean> = new Set();
    frame: number = 0;
    selectionStartCell: Cell | null;
    selectionType: SelectionOperation = 'replace';

    hoveredCell: Cell | null;
    activeCell: Cell | null;
    selectedCells: Set<Cell> = new Set();
    selectedCellBuffer: Set<Cell> = new Set();

    activeTransform: Position | null = null;
    transformBase: Position = { r: 0, c: 0 }; // accumulated delta from earlier (released) drags of the same pending transform
    
    insertionMode: 'insert' | 'overwrite' = 'insert';
    toolManager: ToolManager;
    mostCommonChars: string[] = [];

    charInputEl: HTMLTextAreaElement;
    canvasContainer: HTMLDivElement;
    statusEl: HTMLDivElement;

    cCanvas: HTMLCanvasElement; // canvas on which the underlying ASCII is rendered
    cCtx: CanvasRenderingContext2D;

    sCanvas: HTMLCanvasElement; // canvas which is often updated, e.g. with selection or mouseover
    sCtx: CanvasRenderingContext2D;

    bCanvas: HTMLCanvasElement; // buffer canvas
    bCtx: CanvasRenderingContext2D;
    
    pCanvas: HTMLPreElement; // <pre> element showing the output
    
    debugMode: boolean = true;

    constructor(width: number, height: number, canvasContainer: HTMLDivElement, statusEl: HTMLDivElement) {
        if (width < 0) console.error(`Width must be greater than zero (input: ${width}`);
        if (height < 0) console.error(`Height must be greater than zero (input: ${height}`);

        this.width = width;
        this.height = height;

        this.canvasContainer = canvasContainer;
        this.canvasContainer.innerHTML = '';
        document.documentElement.style.setProperty('--cols', `${width}`);
        document.documentElement.style.setProperty('--rows', `${height}`);

        this.charInputEl = document.createElement('textarea');
        this.charInputEl.classList = 'hidden-char-input';
        this.canvasContainer.appendChild(this.charInputEl);

        this.statusEl = statusEl;

        this.cCanvas = document.createElement('canvas');
        this.cCanvas.id = 'cCanvas';
        this.cCanvas.classList = 'rendering-canvas';
        canvasContainer.appendChild(this.cCanvas);
        this.cCtx = this.cCanvas.getContext('2d') as CanvasRenderingContext2D;
        this.cCtx.imageSmoothingEnabled = false;

        this.sCanvas = document.createElement('canvas');
        this.sCanvas.classList = 'rendering-canvas';
        canvasContainer.appendChild(this.sCanvas);
        this.sCtx = this.sCanvas.getContext('2d') as CanvasRenderingContext2D;
        this.sCtx.imageSmoothingEnabled = false;

        this.bCanvas = document.createElement('canvas');
        this.bCtx = this.bCanvas.getContext('2d') as CanvasRenderingContext2D;
        this.bCtx.imageSmoothingEnabled = false;

        this.pCanvas = document.getElementById('preview') as HTMLPreElement;

        this.undoBtn = document.getElementById('undo-btn') as HTMLButtonElement;
        this.redoBtn = document.getElementById('redo-btn') as HTMLButtonElement;
        this.toolManager = new ToolManager((sty: Partial<Cell>) => 
            this.imposeCellStyle(sty, this.hasSelection ? this.selectedCells : [this.activeCell], true), () => {
                this.setCanvasSize();
                this.render(this.allCells);
                this.renderCellBorders();
        },() => this.cancelTransform);

        this.setCanvasSize();
        
        this.populateGrid();
        this.setupZoom();
        this.setupEvents();
        this.setupExportBtn();
        this.setupSetupBtn();
        this.linkMiscButtons();
        this.render(this.allCells);

        this.animateLoop();
    }

    public get allCells(): Iterable<Cell> {
        return this.flatGrid;
    }

    public get hasSelection(): boolean {
        return (this.selectedCells.size > 0);
    }

    // returns world pos from mouse event
    getMousePos(ev: MouseEvent) {
        const rect = this.canvasContainer.getBoundingClientRect();
        const scaleX = this.canvasContainer.clientWidth / (rect.width || 1);
        const scaleY = this.canvasContainer.clientHeight / (rect.height || 1);

        const screenX = (ev.clientX - rect.left) * scaleX;
        const screenY = (ev.clientY - rect.top) * scaleY;

        return {
            x: (screenX - this.currentPanX) / this.currentZoom, 
            y: (screenY - this.currentPanY) / this.currentZoom 
        };
    }

    convertMousePosToCellPos(x: number, y: number): Position {
        let cols = Math.floor(x / this.cellWidth);
        let rows = Math.floor(y / this.cellHeight);

        return { c: cols, r: rows };
    }

    getTransformCellPositions(startEv: MouseEvent, currentEv: MouseEvent): { start: Position, now: Position } {
        const startWorld = this.getMousePos(startEv);
        const nowWorld = this.getMousePos(currentEv);

        return {
            start: this.convertMousePosToCellPos(startWorld.x, startWorld.y),
            now: this.convertMousePosToCellPos(nowWorld.x, nowWorld.y),
        };
    }

    setCanvasSize() {
        document.documentElement.style.setProperty('--cells-font-size', `${settings.fontSize}px`);
        document.documentElement.style.setProperty('--cells-font-family', `${settings.fontFamily}`);

        document.documentElement.style.setProperty('--canvas-width', `${settings.fontSize * getFontAspectRatio(settings.fontFamily) * this.width}px`);
        document.documentElement.style.setProperty('--canvas-height', `${settings.fontSize * this.height}px`);
        
        const width = this.canvasContainer.clientWidth;
        const height = this.canvasContainer.clientHeight;

        const canvases: HTMLCanvasElement[] = [this.cCanvas, this.sCanvas, this.bCanvas];
        const dpr = window.devicePixelRatio || 1;
        for (const c of canvases) {
            c.width = Math.floor(width * dpr);
            c.height = Math.floor(height * dpr);

            c.style.width = `${width}px`;
            c.style.height = `${height}px`;

            (c.getContext('2d') as CanvasRenderingContext2D).scale(dpr, dpr);
        }

        const fontRatio = getFontAspectRatio(window.getComputedStyle(this.pCanvas).fontFamily); // returns n where char width = height * n
        const pCanvasW = this.pCanvas.getBoundingClientRect().width;
        
        this.pCanvas.style.height = `${((pCanvasW / this.width) / fontRatio) * this.height}px`;
        this.pCanvas.style.fontSize = `${(pCanvasW / this.width) / fontRatio}px`;
        showText(`<br>${fontRatio * (this.width / pCanvasW)}px<br>`)

        this.cellWidth = width / this.width;
	    this.cellHeight = height / this.height;

        showText(`Set: font family "${settings.fontFamily}"; font size ${settings.fontSize}`, "info");
        showText(`Updated width to: ${width} x ${height} with a DPR of ${dpr}; cell size is now ${this.cellWidth} × ${this.cellHeight}`);
    }

    updatePreview() {
        this.pCanvas.innerText = this.grid.map(row => row.join('')).join('\n');
        
    }

    exportToANSI(mask?: Iterable<Cell>): string {
        const maskSet = mask ? (mask instanceof Set ? mask : new Set(mask)) : null;

        let out = "";
        let currentStyle: CellStyle = {};

        for (let r = 0; r < this.height; r++) {
            let lastCol = this.width - 1;
            while (lastCol >= 0) {
                const cell = this.grid[r][lastCol];
                const isIncluded = !maskSet || maskSet.has(cell);
                const hasStyle = isIncluded && Object.keys(cell.style).length > 0;
                const hasChar = isIncluded && cell.hasChar && cell.char !== ' ';

                if (hasChar || hasStyle) break;
                lastCol--;
            }

            for (let c = 0; c <= lastCol; c++) {
                const cell = this.grid[r][c];
                const isIncluded = !maskSet || maskSet.has(cell);

                const nextStyle = isIncluded ? cell.style : {};
                const char = isIncluded ? cell.char : ' ';

                let needsReset = false;
                if (
                    (currentStyle.bold && !nextStyle.bold) ||
                    (currentStyle.faint && !nextStyle.faint) ||
                    (currentStyle.italic && !nextStyle.italic) ||
                    (currentStyle.underline && !nextStyle.underline) ||
                    (currentStyle.strikethrough && !nextStyle.strikethrough) ||
                    (currentStyle.fgColor && !nextStyle.fgColor) ||
                    (currentStyle.bgColor && !nextStyle.bgColor)
                ) { needsReset = true; }

                const codes: string[] = [];

                if (needsReset) {
                    codes.push("0");
                    currentStyle = {};
                }

                if (nextStyle.bold && !currentStyle.bold) codes.push("1");
                if (nextStyle.faint && !currentStyle.faint) codes.push("2");
                if (nextStyle.italic && !currentStyle.italic) codes.push("3");
                if (nextStyle.underline && !currentStyle.underline) codes.push("4");
                if (nextStyle.strikethrough && !currentStyle.strikethrough) codes.push("9");

                if (nextStyle.fgColor && nextStyle.fgColor.toString() !== currentStyle.fgColor?.toString()) {
                    const rgb = nextStyle.fgColor.rgbVal;
                    if (rgb) codes.push(`38;2;${rgb.r};${rgb.g};${rgb.b}`);
                }

                if (nextStyle.bgColor && nextStyle.bgColor.toString() !== currentStyle.bgColor?.toString()) {
                    const rgb = Color.hexToRgb(nextStyle.bgColor.toString());
                    if (rgb) codes.push(`48;2;${rgb.r};${rgb.g};${rgb.b}`);
                }

                if (codes.length > 0) {
                    out += `\x1b[${codes.join(';')}m`;
                    currentStyle = { ...nextStyle };
                }

                out += char;
            }

            out += "\x1b[0m\n";
            currentStyle = {}; 
        }

        return out;
    }

    private createSnapshot(): Snapshot {
        const ansiGrid = this.exportToANSI();
        const selection = Array.from(this.selectedCells).map(cell => cell.pos.r * this.width + cell.pos.c);

        return { ansiGrid, selection, time: Date.now() };
    }

    private applySnapshot(snapshot: Snapshot) {
        this.importFromANSI(snapshot.ansiGrid);

        this.selectedCells.forEach(cell => cell.isSelected = false);
        this.selectedCells.clear();

        for (const index of snapshot.selection) {
            const r = Math.floor(index / this.width);
            const c = index % this.width;
            
            const cell = this.grid[r][c];
            cell.isSelected = true;
            this.selectedCells.add(cell);
        }

        this.render(this.allCells);
        this.renderCellBorders();
        this.persistStorage();
    }

    private persistStorage(): boolean {
        const payload = {
            undoStack: this.undoStack,
            redoStack: this.redoStack,
        };

        try {
            const json = JSON.stringify(payload);
            localStorage.setItem('history', json);
            return true;
        } catch (e) {
            if (e instanceof DOMException && e.name === 'QuotaExceededError') {
                console.warn('LocalStorage quota exceeded. Trimming oldest history states...');
                
                if (this.undoStack.length > 1) {
                    const dropCount = Math.max(1, Math.floor(this.undoStack.length * 0.25));
                    this.undoStack.splice(0, dropCount);
                    return this.persistStorage();
                }
            }

            console.error('Failed to persist history to localStorage:', e);
            return false;
        }
        this.updateHistoryButtons();
    }

    importFromANSI(text) {
        let r = 0;
        let c = 0;
        let currentStyle: CellStyle = {};

        const tokens = text.split(/(\x1b\[[0-9;]*m)/g);

        for (const token of tokens) {
            if (!token) continue;

            if (token.startsWith("\x1b[")) { // TODO: normalise escape codes beforehand
                const codes = token.slice(2, -1).split(';');
                
                for (let i = 0; i < codes.length; i++) {
                    const code = parseInt(codes[i], 10);
                    
                    if (isNaN(code) || code === 0) { currentStyle = {}; }
                    else if (code === 1) { currentStyle.bold = true; }
                    else if (code === 2) { currentStyle.faint = true; }
                    else if (code === 3) { currentStyle.italic = true; }
                    else if (code === 4) { currentStyle.underline = true; }
                    else if (code === 9) { currentStyle.strikethrough = true; }
                    else if (code === 22) { currentStyle.bold = false; currentStyle.faint = false; }
                    else if (code === 23) { currentStyle.italic = false; }
                    else if (code === 24) { currentStyle.underline = false; }
                    else if (code === 29) { currentStyle.strikethrough = false; }
                    else if (code === 38 && codes[i+1] === "2") {
                        const rv = parseInt(codes[i+2]);
                        const gv = parseInt(codes[i+3]);
                        const bv = parseInt(codes[i+4]);
                        currentStyle.fgColor = new Color(Color.rgbToHex(rv, gv, bv));
                        i += 4;
                    }
                    else if (code === 48 && codes[i+1] === "2") {
                        const rv = parseInt(codes[i+2]);
                        const gv = parseInt(codes[i+3]);
                        const bv = parseInt(codes[i+4]);
                        currentStyle.bgColor = new Color(Color.rgbToHex(rv, gv, bv));
                        i += 4;
                    }
                    else if (code === 39) { delete currentStyle.fgColor; }
                    else if (code === 49) { delete currentStyle.bgColor; }
                }
            } else {
                for (const char of token) {
                    if (char === '\n') {
                        while (c < this.width) {
                            if (r < this.height) {
                                this.grid[r][c].char = null;
                                this.grid[r][c].reset();
                            }
                            c++;
                        }
                        r++;
                        c = 0;
                        continue;
                    }

                    if (r < this.height && c < this.width) {
                        const cell = this.grid[r][c];
                        cell.char = char;
                        cell.reset();
                        if (Object.keys(currentStyle).length > 0) {
                            cell.style = { ...currentStyle };
                        }
                        c++;
                    }
                }
            }
        }
        
        while (r < this.height) {
            while (c < this.width) {
                this.grid[r][c].char = null;
                this.grid[r][c].reset();
                c++;
            }
            r++;
            c = 0;
        }
    }

    populateGrid() {
        for (let i = 0; i < this.height; i++) {
            let row = [];
            for (let j = 0; j < this.width; j++) {
                const char = Math.random() < 0.25 ? String.fromCharCode(Math.floor(Math.random() * (126 - 32 + 1)) + 32) : null;
                const cell = new Cell(char, { r: i, c: j }); 
                row.push(cell);
                this.flatGrid.push(cell);
            }
            this.grid.push(row);
        }

        showText(`Populated grid with ${this.grid.flat().length} cells`);
    }

    setupZoom() {
        const inBtn = document.getElementById('zoom-in-btn') as HTMLButtonElement;
        const outBtn = document.getElementById('zoom-out-btn') as HTMLButtonElement;

        const slider = (document.getElementById('zoom-slider') as HTMLInputElement);
        const numInp = (document.getElementById('zoom-number') as HTMLInputElement);

        inBtn.addEventListener('click', () => { this.zoomByStep(0.05) });
        outBtn.addEventListener('click', () => { this.zoomByStep(-0.05) });

        slider.addEventListener('input', () => {
            this.zoomTo(slider.valueAsNumber / 100);
        });
        
        numInp.addEventListener('input', () => {
            this.zoomTo(numInp.valueAsNumber / 100);
        });
    
    }

    setupExportBtn() {
        const btn = document.getElementById('export-btn') as HTMLInputElement;

        btn.addEventListener('click', () => {
            if (this.hasSelection) {
                const ansiStr = this.exportToANSI(this.selectedCells);
                copyToClipboard(ansiStr).then((copyResult) => {
                    if (copyResult) Notifier.success('Copied to clipboard!');
                });
            } else {
                Notifier.confirm('No selection active. Export entire canvas?').then((result) => {
                    if (!result) return;
                    
                    const ansiStr = this.exportToANSI();
                    copyToClipboard(ansiStr).then((copyResult) => {
                        if (copyResult) Notifier.success('Copied to clipboard!');
                    });
                });
            }
        });
    }
    
    setupSetupBtn() {
        const btn = document.getElementById('setup-btn') as HTMLInputElement;

        btn.addEventListener('click', () => {
            const dialog = document.getElementById('page-setup') as HTMLDialogElement;

            (document.getElementById('canvas-width') as HTMLInputElement).value = `${this.width}`;
            (document.getElementById('canvas-height') as HTMLInputElement).value = `${this.height}`;
            dialog.showModal();
        });
    }

    linkMiscButtons() {
        const debugModeBtn = document.getElementById('debug-mode-btn') as HTMLInputElement;

        debugModeBtn.addEventListener('input', () => {
            this.debugMode = debugModeBtn.checked;
            this.renderCellBorders();
        });
        this.debugMode = debugModeBtn.checked;
    }

    setupEvents() {
        this.canvasContainer.addEventListener('contextmenu', ev => ev.preventDefault());

        document.addEventListener('mousemove', (ev: MouseEvent) => {
            this.lastMouseEv = ev;
            if (!this.awaitingMouseUp) {
                this.renderCellBorders();
                this.updateCellHit(ev);
                this.renderMouseoverDebug(ev);
                return;
            } else {
                if (!this.isPanning) {
                    if (this.toolManager.currentTool === 'select' && this.selectionStartCell) {
                        const { x, y } = this.getMousePos(ev);
    
                        const col = Math.floor(x / this.cellWidth);
                        const row = Math.floor(y / this.cellHeight);
    
                        if (this.isPosInBounds(row, col)) {
                            this.toolManager.updateArrowCursor({ r: row, c: col }, this.selectionStartCell.pos);
                        }
                    } else if (this.toolManager.currentTool === 'paint') {
                        const { x, y } = this.getMousePos(ev);
    
                        const col = Math.floor(x / this.cellWidth);
                        const row = Math.floor(y / this.cellHeight);
    
                        if (this.isPosInBounds(row, col)) {
                            const cell = this.grid[row][col];

                            const isMaskedOut = this.toolManager.selectionIsMask && !cell.isSelected && (this.hasSelection || !settings.skipMaskWhenNoSelection);
                            const isBlankSkipped = this.toolManager.skipBlankCells && !cell.hasChar;

                            if (!isMaskedOut && !isBlankSkipped) {
                                this.paintCell(this.toolManager.currentStyledCell, cell, false);
                                this.renderCellBorders();
                            } else {
                                this.updateActiveCell(cell);
                            }
                        }
                    } else if (this.toolManager.currentTool === 'transform' && this.mouseStartEv) {
                        const { start, now } = this.getTransformCellPositions(this.mouseStartEv, ev);
                        this.activeTransform = {
                            r: this.transformBase.r + (now.r - start.r),
                            c: this.transformBase.c + (now.c - start.c)
                        };
                        
                        this.emptySelectionBuffer();

                        this.selectedCells.forEach((cell) => {
                            const destPos = { r: this.activeTransform.r + cell.pos.r, c: this.activeTransform.c + cell.pos.c };
                            if (this.isPosInBounds(destPos.r, destPos.c)) {
                                this.selectedCellBuffer.add(this.grid[destPos.r][destPos.c]);
                            }
                        });
                    }
                }
                    
            }

            ev.preventDefault();
            if (this.isPanning) {
                const dx = ev.clientX - this.lastPanPos.x;
                const dy = ev.clientY - this.lastPanPos.y;
                this.currentPanX += dx;
                this.currentPanY += dy;
                this.lastPanPos = { x: ev.clientX, y: ev.clientY };

                this.clampPan();
                
                this.render();
                this.renderCellBorders();
            } else {
                this.renderCellBorders();
                this.updateCellHit(ev);
                this.renderMouseoverDebug(ev);
            }
            // ???
            
        });

        this.canvasContainer.addEventListener('mousedown', (ev: MouseEvent) => {
            ev.preventDefault();
            this.awaitingMouseUp = true;
            if (ev.button === 2) {
                this.isPanning = true;
                this.lastPanPos = { x: ev.clientX, y: ev.clientY };
            } else {
                this.charInputEl.focus();
                this.mouseStartEv = ev;
                if (this.toolManager.currentTool === 'select') this.startRectSelection(ev);
                if (this.toolManager.currentTool === 'transform') {
                    this.transformBase = this.activeTransform ? { ...this.activeTransform } : { r: 0, c: 0 };
                }
                this.updateCellHit(ev, this.toolManager.toolUsesActiveCell);
                if (this.toolManager.currentTool === 'wand') this.wandSelection(ev);
                if (this.toolManager.toolType === 'paint-style') this.commit();
                this.render();
                this.renderCellBorders();
                this.renderMouseoverDebug(ev);
            }
        });
        
        document.addEventListener('mouseup', (ev: MouseEvent) => {
            if (!this.awaitingMouseUp) return;
            ev.preventDefault();

            if (ev.button === 2 && this.isPanning) {
                this.isPanning = false;
                this.render(this.allCells);
            } else {
                if (this.toolManager.currentTool === 'select') this.endSelection(ev);
                if (this.toolManager.currentTool === 'transform' && this.activeTransform) {
                    showText(`Transform pending (Δr:${this.activeTransform.r}, Δc:${this.activeTransform.c})`);
                }
                this.updateCellHit(ev, this.toolManager.toolUsesActiveCell);
                this.render();
                this.renderCellBorders();
                this.renderMouseoverDebug(ev);

                if (this.hoveredCell) this.resolveClick(this.hoveredCell);
            }

            this.awaitingMouseUp = false;
            this.mouseStartEv = null;
        });
        
        document.addEventListener('contextmenu', (ev: PointerEvent) => {
            if (this.awaitingMouseUp) ev.preventDefault();
        })

        let timer: number | null = null;
        document.addEventListener('keyup', (ev: KeyboardEvent) => {
            if (ev.key === settings.charMapKey) {
                if (timer) {
                    clearTimeout(timer);
                    timer = null;
                }
            }
        });
        document.addEventListener('keydown', (ev: KeyboardEvent) => {
            // showText(`[KEYPRESS] Current focus el: ${getReadableName(document.activeElement)}`)
            if (document.activeElement.tagName === "INPUT" && document.activeElement != this.charInputEl) return;

            if (this.toolManager.currentTool === 'transform' && this.activeTransform) {
                if (ev.key === 'Enter') {
                    ev.preventDefault();
                    this.finaliseTransform();
                } else if (ev.key === 'Escape') {
                    ev.preventDefault();
                    this.cancelTransform();
                    return;
                }
            }

            if (this.hasSelection) {
                if (ev.key === 'Enter') this.clearSelection();
            }
            
            if (ev.key === settings.charMapKey) {
                if (!ev.repeat) {
                    timer = window.setTimeout(() => {
                        this.toolManager.getCharmapInput(this.mostCommonChars, this.activeCell?.char.trim() ?? '(empty)').then((result) => {
                            if (result) {
                                this.charInputEl.dispatchEvent(new InputEvent('input', { 
                                    bubbles: true, 
                                    cancelable: true,
                                    inputType: 'insertText',
                                    data: result
                                }));
                            }
                        });
                    }, settings.longPressTime);
                }
            }
            if (ev.key === ' ') {
                if (this.toolManager.toolType === 'paint-style' && this.activeCell) {
                    // treat as click
                }
            } else if (ev.key === 'Escape') {
                if (this.selectedCellBuffer.size > 0) {
                    this.emptySelectionBuffer();
                    this.renderCellBorders();
                } else if (this.hasSelection) {
                    this.clearSelection();
                } else {
                    this.updateActiveCell(null);
                }
                this.render();
            } else if (ev.key === 'Insert') {
                ev.preventDefault();
                this.insertionMode = this.insertionMode === 'insert' ? 'overwrite' : 'insert';
                showText(`Insertion mode set to ${this.insertionMode}`);
                document.getElementById('current-insert-mode').innerText = this.insertionMode.toUpperCase();

                this.renderCellBorders();
            } else if (ev.key === 'Delete' || ev.key === 'Backspace') {
                if (this.hasSelection) {
                    let anythingToDelete = false;
                    this.modifyCells((c) => { if (c.hasChar) { c.char = null; anythingToDelete = true } }, this.selectedCells);
                    showText(`Cleared ${this.selectedCells.size} cell chars`);
                    if (!anythingToDelete) {
                        this.modifyCells((c) => { if (c.style.fgColor || c.style.bgColor) { c.reset(); anythingToDelete = true } }, this.selectedCells);
                        if (!anythingToDelete) {
                            showText('Nothing to delete, so clearing selection as well');
                            this.clearSelection();
                        }
                    }
                } else {
                    showText('Deleting contents of cell');
                    this.modifyActiveCell((c) => {
                        if (c.hasChar) c.char = null;
                        else if (this.insertionMode === 'insert') this.stepCell(-1, 0, false, false);
                    });
                }
            } else if (ev.key.startsWith('Arrow')) {
                ev.preventDefault();
                switch (ev.key) {
                    case 'ArrowUp':
                        this.stepCell(0, -1, ev.ctrlKey, ev.shiftKey);
                        break;
                    case 'ArrowDown':
                        this.stepCell(0, 1, ev.ctrlKey, ev.shiftKey);
                        break;
                    case 'ArrowLeft':
                        this.stepCell(-1, 0, ev.ctrlKey, ev.shiftKey);
                        break;
                    case 'ArrowRight':
                        this.stepCell(1, 0, ev.ctrlKey, ev.shiftKey);
                        break;
                    default:
                        console.error(`Unknown key: ${ev.key}`);
                        return;
                }
            } else if (ev.ctrlKey) {
                switch (ev.key.toLowerCase()) {
                    case 'd':
                        ev.preventDefault();
                        this.clearSelection();
                        break;
                    case 'a':
                        ev.preventDefault();
                        if (!ev.shiftKey) {
                            this.modifyCells((c) => this.selectedCells.add(c), this.allCells);
                            this.finaliseSelection();
                            showText('Selected all cells');
                        } else this.clearSelection();
                        break;
                    case 'z':
                        ev.preventDefault();
                        if (ev.shiftKey) this.redo();
                        else this.undo();
                        break;
                    case 'y':
                        ev.preventDefault();
                        this.redo();
                        break;
                    case 'v':
                        ev.preventDefault();
                        if (ev.shiftKey) getClipboardText().then(result => this.insertPlaintext(result, true));
                        else getClipboardText().then(result => this.insertPlaintext(result, false));

                        showText('Pasted via keydown event');
                        break;
                }
            }

            this.undoBtn.addEventListener('click', () =>  { this.undo() });
            this.redoBtn.addEventListener('click', () => { this.redo() });
        });

        let debouncedWheelEnd = () => {};

        this.canvasContainer.addEventListener('wheel', (ev: WheelEvent) => {
            ev.preventDefault();
            
            const rect = this.canvasContainer.getBoundingClientRect();
            const mouseX = ev.clientX - rect.left;
            const mouseY = ev.clientY - rect.top;

            const worldX = (mouseX - this.currentPanX) / this.currentZoom;
            const worldY = (mouseY - this.currentPanY) / this.currentZoom;

            const zoomSensitivity = 0.002;

            this.zoomByStep(ev.deltaY * -zoomSensitivity, true);

            debouncedWheelEnd = debounce(() => { this.zoomByStep(0, false) }, 150);
            debouncedWheelEnd();

            this.currentPanX = mouseX - worldX * this.currentZoom;
            this.currentPanY = mouseY - worldY * this.currentZoom;

            this.clampPan();

            this.render();
            this.renderCellBorders();
        })

        const exitEvents = ['mouseout', 'mouseleave'];
        exitEvents.forEach(evname => { this.cCanvas.addEventListener(evname, () => { 
                this.hoveredCell = null;
            }); 
        });

        this.charInputEl.addEventListener('blur', () => {
            if (this.activeCell) this.charInputEl.focus();
        });

        this.charInputEl.focus();

        this.charInputEl.addEventListener('input', (ev: InputEvent) => {
            ev.preventDefault();
            console.log(ev);
            switch (ev.inputType) {
                case 'insertText':
                    const newChar = ev.data;
                    this.modifyActiveCell((c) => c.char = newChar);
                    if (this.mostCommonChars.includes(newChar)) this.mostCommonChars.splice(this.mostCommonChars.indexOf(newChar));
                    const newLength = this.mostCommonChars.unshift(newChar);
                    if (newLength > settings.keepLastNChars) this.mostCommonChars.length = settings.keepLastNChars;
                    if (this.insertionMode === 'insert') this.stepCell(1, 0, false, false);
                    break;
                case 'insertFromPaste':
                    this.insertPlaintext(ev.data, false);
                    showText('Pasted via input event');
                    break;
            }
        });

        window.addEventListener('resize', () => { this.setCanvasSize(); this.render(this.allCells); this.renderCellBorders(); })
    }

    resolveClick(cell: Cell) {
        if (this.toolManager.selectionIsMask) if (!cell.isSelected) return;
        if (this.toolManager.skipBlankCells) if (!cell.hasChar) return;

        if (this.toolManager.currentTool === 'eyedropper') this.pickCellStyle(cell);
        if (this.toolManager.currentTool === 'paint') {
            this.imposeCellStyle(this.toolManager.currentStyledCell, [cell]);
            this.renderCellBorders();               
        }
    }

    zoomByStep(step: number, lazy: boolean = false): void {
        this.currentZoom = clampf(this.currentZoom + step, 0.05, 5);

        (document.getElementById('zoom-slider') as HTMLInputElement).value = `${Math.ceil(this.currentZoom * 20) * 5}`;
        (document.getElementById('zoom-number') as HTMLInputElement).value = `${this.currentZoom * 100}`;

        if (!lazy) {
            this.bCanvas.width = this.width * this.cellWidth * this.currentZoom;
            this.bCanvas.height = this.height * this.cellHeight * this.currentZoom;

            this.bCtx.setTransform(1, 0, 0, 1, 0, 0);
            this.bCtx.scale(this.currentZoom, this.currentZoom);
            
            this.clampPan();
            this.render(this.allCells);
            this.renderCellBorders();
        }
    }

    zoomTo(target: number): void {
        if (isNaN(target) || target < 0.05 || target > 5) return;
        if (Math.abs(this.currentZoom - target) > 0.1) {
            this.zoomByStep((target - this.currentZoom) * 0.5, true);    
            requestAnimationFrame(() => {
                this.zoomTo(target);
            });
        } else {
            this.zoomByStep((target - this.currentZoom));
        }
    }

    updateHistoryButtons() {
        this.undoBtn.disabled = this.undoStack.length <= 0;
        this.redoBtn.disabled = this.redoStack.length <= 0;
    }

    commit() {
        const snapshot = this.createSnapshot();
        // TODO: check if this snapshot is literally the same as the previous one
        this.undoStack.push(snapshot);
        
        if (this.undoStack.length >= settings.maxStackLength && this.undoStack.length > 0) {
            
            const now = snapshot.time;
            const previousSnapshot = this.undoStack[this.undoStack.length - 1];
            
            const locked = new Set([this.undoStack[0], previousSnapshot]); // these r protected from being edited
            const old = this.undoStack.filter((ss) => ((now - ss.time) > settings.recentUndoThreshold * 1000));
            
            const toRemove = this.selectEntryForPruning(old.filter(item => !locked.has(item)), now);
            if (toRemove) showText(`Removing entry made ${(now - toRemove.time) / 1000} seconds ago...`);
            if (toRemove) this.undoStack.splice(this.undoStack.indexOf(toRemove));
        }

        this.redoStack.length = 0;
        this.updateHistoryButtons();
        this.persistStorage();
    }

    selectEntryForPruning(entries: Snapshot[], latestTime: number) {
        if (entries.length === 0) return null;
        if (entries.length < 3) return entries[0];

        let shouldSort = false;
        for (let i = 0; i < entries.length - 1; i++) {
            if (entries[i].time > entries[i + 1].time) shouldSort = true;
        }   

        if (shouldSort) entries.sort((a, b) => a.time - b.time);

        let best = entries[1];
        let bestScore = Number.POSITIVE_INFINITY;

        for (let i = 1; i < entries.length - 1; i++) {
            const current = entries[i];

            const leftGap = current.time - entries[i - 1].time;
            const rightGap = entries[i + 1].time - current.time;

            const largerGap = Math.max(leftGap, rightGap);
            const smallerGap = Math.min(leftGap, rightGap);
            
            const age = Math.max(0, latestTime - current.time);
            const ageAllowance = 1 + Math.log1p(age / 1000);

            const imbalance = largerGap / Math.max(smallerGap, 1);
            const score = (0.8 * largerGap + 0.2 * smallerGap) * Math.pow(imbalance, 0.2) / ageAllowance;

            if (score < bestScore) {
                bestScore = score;
                best = current;
            }
        }

        return best;
    }

    undo() {
        if (this.undoStack.length === 0) return;
        this.redoStack.push(this.createSnapshot());
        const previousState = this.undoStack.pop();
        this.applySnapshot(previousState);
        this.updateHistoryButtons();
    }

    redo() {
        if (this.redoStack.length === 0) return;
        this.undoStack.push(this.createSnapshot());
        const nextState = this.redoStack.pop();
        this.applySnapshot(nextState);
        this.updateHistoryButtons();
    }

    clampPan() {
        const containerW = this.canvasContainer.clientWidth;
        const containerH = this.canvasContainer.clientHeight;
        const gridW = this.width * this.cellWidth * this.currentZoom;
        const gridH = this.height * this.cellHeight * this.currentZoom;

        const margin = Math.min(100, containerW / 2, containerH / 2);

        const minX = margin - gridW;
        const maxX = containerW - margin;

        const minY = margin - gridH;
        const maxY = containerH - margin;

        this.currentPanX = clampf(this.currentPanX, minX, maxX);
        this.currentPanY = clampf(this.currentPanY, minY, maxY);
    }

    private stampCell(ctx: CanvasRenderingContext2D, cell: Cell, forcePos?: Position) {
        const cellR = (forcePos ? forcePos.r : cell.pos.r);
        const cellC = (forcePos ? forcePos.c : cell.pos.c);

        const x = cellC * this.cellWidth;
        const y = cellR * this.cellHeight;

        const bgColor = this.toolManager.resolveBgColor(cell);
        ctx.fillStyle = bgColor;
        if (settings.checkerboard && !cell.style.bgColor && Math.floor(cellR + cellC) % 2 === 0 && cell.char !== null) {
            ctx.fillStyle = Color.add(new Color(bgColor).rgbVal, { r: 20, g: 20, b: 20  }).hexString;
        }
        ctx.fillRect(x | 0, y | 0, this.cellWidth + 1 | 0, this.cellHeight + 1 | 0);

        ctx.fillStyle = this.toolManager.resolveFgColor(cell);
        if (cell.char) {
            ctx.fillText(cell.char, x + this.cellWidth * 0.5, y + this.cellHeight * 0.5);
        }
    }

    private stampBlankAt(ctx: CanvasRenderingContext2D, pos: Position) {
        const x = pos.c * this.cellWidth;
        const y = pos.r * this.cellHeight;

        ctx.fillStyle = this.toolManager.bgDefault;
        ctx.fillRect(x | 0, y | 0, this.cellWidth + 1 | 0, this.cellHeight + 1 | 0);
    }

    private renderTransformPreview() {
        if (!this.activeTransform) return;
        this.sCtx.save();
        this.sCtx.font = `${settings.fontSize}px ${settings.fontFamily}`;
        this.sCtx.textAlign = 'center';
        this.sCtx.textBaseline = 'middle';

        for (const cell of this.selectedCells) {
            this.stampBlankAt(this.sCtx, cell.pos);
        }

        for (const cell of this.selectedCells) {
            const destPos = { r: cell.pos.r + this.activeTransform.r, c: cell.pos.c + this.activeTransform.c };
            if (this.isPosInBounds(destPos.r, destPos.c)) {
                this.stampCell(this.sCtx, cell, destPos);
            }
        }

        this.sCtx.restore();
    }

    clearGridAt(pos: Position) {
        this.bCtx.clearRect(pos.c * this.cellWidth, pos.r * this.cellHeight, this.cellWidth, this.cellHeight);
    }

    drawCell(cell: Cell) {
        let c = cell.pos.c;
        let r = cell.pos.r;
        this.clearGridAt({ r, c });
        this.stampCell(this.bCtx, cell);
    }

    render(dirtyCells?: Iterable<Cell>) {
        if (dirtyCells) {
            this.updatePreview();
            this.bCtx.save();
            this.bCtx.font = `${settings.fontSize}px ${settings.fontFamily}`;
            this.bCtx.textAlign = 'center';
            this.bCtx.textBaseline = 'middle';

            for (const cell of dirtyCells) {
                this.drawCell(cell);
            }
            this.bCtx.restore();
        }

        this.cCtx.clearRect(0, 0, this.cCanvas.width, this.cCanvas.height);
        
        this.cCtx.save();
        this.cCtx.translate(this.currentPanX, this.currentPanY);
        this.cCtx.scale(this.currentZoom, this.currentZoom);
        
        this.cCtx.drawImage(this.bCanvas, 0, 0, this.width * this.cellWidth, this.height * this.cellHeight);

        this.cCtx.restore();
    }

    stepCell(x: number, y: number, jump: boolean, select: boolean) {
        if (!this.activeCell || !this.toolManager.toolUsesActiveCell) return;
        let newPos = { r: this.activeCell.pos.r + y, c: this.activeCell.pos.c + x };
        if (select) {
            this.selectionStartCell = this.grid[this.activeCell.pos.r][this.activeCell.pos.c];
        }
        if (jump) {
            if (x === 0 && y === 0) return;
            showText(`Jump dir x:${x} y:${y}`);

            while (newPos.r >= 0 && newPos.r < this.height && newPos.c >= 0 && newPos.c < this.width) {
                if (select) this.selectedCellBuffer.add(this.grid[newPos.r][newPos.c]);
                if (this.grid[newPos.r][newPos.c].hasChar) break;
                newPos.r += y;
                newPos.c += x;
            }
        }

        newPos.r = clampi(newPos.r, 0, this.height - 1);
        newPos.c = clampi(newPos.c, 0, this.width - 1);

        if (newPos.r === this.activeCell.pos.r && newPos.c === this.activeCell.pos.c) return;
        
        this.updateActiveCell(this.grid[newPos.r][newPos.c]);
        if (select) {
            this.selectedCellBuffer.add(this.grid[newPos.r][newPos.c]);
            this.pushSelectionBuffer(SelectAdd);
            this.finaliseSelection();
        }
        this.renderCellBorders();
    }

    getCellsToBeSelected() {
        switch (this.selectionType) {
            case "add": return this.selectedCells.union(this.selectedCellBuffer);
            case "subtract": return this.selectedCells.difference(this.selectedCellBuffer);
            case "intersect": return this.selectedCells.symmetricDifference(this.selectedCellBuffer);
            case "replace": 
            default: return this.selectedCellBuffer;
        }
    }

    renderCellBorders() {
        this.sCtx.clearRect(0, 0, this.sCanvas.width, this.sCanvas.height);
        this.sCtx.save();
        this.sCtx.translate(this.currentPanX, this.currentPanY);
        this.sCtx.scale(this.currentZoom, this.currentZoom);

        if (settings.crosshairHighlighting && this.hoveredCell) {
            this.sCtx.fillStyle = "#77889920";
            this.sCtx.fillRect(this.hoveredCell.pos.c * this.cellWidth, 0, this.cellWidth, this.sCanvas.height);
            this.sCtx.fillRect(0, this.hoveredCell.pos.r * this.cellHeight, this.sCanvas.width, this.cellHeight);
        }

        let cellMasks = [this.selectedCells];
        if (this.selectionStartCell) {
            if (this.selectionType === 'replace') cellMasks = [this.selectedCellBuffer]
            // else if (this.selectionType === 'add') cellMasks = [this.selectedCells.union(this.selectedCellBuffer)]
            else cellMasks = [this.selectedCells, this.selectedCellBuffer]
        } else if (this.activeTransform) {
            cellMasks = [this.selectedCellBuffer];
        }

        const showSelectionMask = settings.selectionMaskColor != 'transparent' && ((settings.selectionMaskPersist == 'always' && (this.hasSelection || this.selectedCellBuffer.size > 1)) || (settings.selectionMaskPersist == 'whileActive' && this.selectedCellBuffer.size > 1));
        if (showSelectionMask) {
            showText('Rendering selection mask...');
            this.sCtx.fillStyle = settings.selectionMaskColor;
            this.sCtx.globalAlpha = settings.selectionMaskOpacity;
            this.sCtx.fillRect(0, 0, this.width * this.cellWidth, this.height * this.cellHeight);
            this.sCtx.globalAlpha = 1.0;
            let cellMask = this.getCellsToBeSelected();
            if (settings.selectionMaskPersist === 'always' && cellMask.size < 1) cellMask = this.selectedCells;
            for (const c of cellMask) {
                this.sCtx.clearRect(c.pos.c * this.cellWidth, c.pos.r * this.cellHeight, this.cellWidth, this.cellHeight);
            }
        }
        
        if (this.activeTransform) {
            this.renderTransformPreview();
        }

        for (const cellSet of cellMasks) {
            if (cellSet.size) {
                this.sCtx.save();
                this.sCtx.strokeStyle = '#e8e8e8';
                this.sCtx.lineWidth = 1;
                this.sCtx.setLineDash([4, 4]);
                this.sCtx.lineDashOffset = (this.frame * 0.1);
    
                this.sCtx.beginPath();
    
                for (const cell of cellSet) {
                    const { r, c } = cell.pos;
    
                    const x = c * this.cellWidth;
                    const y = r * this.cellHeight;
    
                    if (r === 0 || !cellSet.has(this.grid[r-1][c])) {
                        this.sCtx.moveTo(x, y);
                        this.sCtx.lineTo(x + this.cellWidth, y);
                    }
                    if (c === this.width - 1 || !cellSet.has(this.grid[r][c+1])) {
                        this.sCtx.moveTo(x + this.cellWidth, y);
                        this.sCtx.lineTo(x + this.cellWidth, y + this.cellHeight);
                    }
                    if (r === this.height - 1 || !cellSet.has(this.grid[r+1][c])) {
                        this.sCtx.moveTo(x + this.cellWidth, y + this.cellHeight);
                        this.sCtx.lineTo(x, y + this.cellHeight);
                    }
                    if (c === 0 || !cellSet.has(this.grid[r][c-1])) {
                        this.sCtx.moveTo(x, y + this.cellHeight);
                        this.sCtx.lineTo(x, y);
                    }
                }
                this.sCtx.stroke();
                this.sCtx.restore();
            }
        }

        if (this.toolManager.toolUsesActiveCell && this.activeCell) {
            const { r: row, c: col } = this.activeCell.pos;
            if (this.insertionMode === 'insert') {
                this.sCtx.strokeStyle = (this.activeCell === this.hoveredCell) ? 'white' : 'lightskyblue';
                this.sCtx.lineWidth = 1;
                const outlineOffset = 1;
                
                this.sCtx.strokeRect(col * this.cellWidth - outlineOffset | 0, row * this.cellHeight - outlineOffset | 0,
                     (this.cellWidth + outlineOffset + 1) | 0, (this.cellHeight + outlineOffset + 1) | 0);
            } else if (this.insertionMode === 'overwrite') {
                this.sCtx.fillStyle = (this.activeCell === this.hoveredCell) ? 'white' : '#87cefa40';
                
                this.sCtx.fillRect(col * this.cellWidth | 0, row * this.cellHeight | 0,
                     (this.cellWidth + 0.5) | 0, (this.cellHeight + 0.5) | 0);
                
                this.sCtx.fillStyle = (this.activeCell === this.hoveredCell) ? this.toolManager.bgDefault : '#ffff';
            }
        } if (this.hoveredCell && this.activeCell !== this.hoveredCell) {
            const { r: row, c: col } = this.hoveredCell.pos;
            
            this.sCtx.strokeStyle = 'white';
            this.sCtx.lineWidth = 1;
            
            this.sCtx.strokeRect(col * this.cellWidth | 0, row * this.cellHeight | 0, (this.cellWidth) | 0, (this.cellHeight) | 0);
            
            if (this.insertionMode === 'overwrite') {
                this.sCtx.fillStyle = '#fff2';
                this.sCtx.fillRect(col * this.cellWidth | 0, row * this.cellHeight | 0, (this.cellWidth) | 0, (this.cellHeight) | 0)
            }
        }
        this.sCtx.restore();
        this.stampCursor();
    }

    stampCursor() {
        if (settings.secondaryCursorType === 'none' || !this.lastMouseEv) return;
        this.sCtx.save();
        const { x: worldX, y: worldY } = this.getMousePos(this.lastMouseEv);

        const x = (worldX * this.currentZoom) + this.currentPanX;
        const y = (worldY * this.currentZoom) + this.currentPanY;
        
        const style = settings.secondaryCursorColour;
        const radius = (this.toolManager.currentBrushSize * this.cellWidth * 0.5 * this.currentZoom) || 8;
        switch (settings.secondaryCursorType) {
            case 'crosshair': {
                this.sCtx.strokeStyle = style;
                this.sCtx.lineWidth = 1;
                this.sCtx.beginPath();
                this.sCtx.moveTo(x - radius, y);
                this.sCtx.lineTo(x + radius, y);
                this.sCtx.stroke();

                this.sCtx.beginPath();
                this.sCtx.moveTo(x, y - radius);
                this.sCtx.lineTo(x, y + radius);
                this.sCtx.stroke();
                
                break;
            }
            case 'dot': {
                this.sCtx.strokeStyle = style;
                this.sCtx.lineWidth = 1;
                this.sCtx.beginPath();
                this.sCtx.arc(x, y, 0.5, 0, TWOPI);
                this.sCtx.stroke();
                break;
            }
            case 'ring': {
                this.sCtx.strokeStyle = style;
                this.sCtx.lineWidth = 1;
                this.sCtx.beginPath();
                this.sCtx.arc(x, y, radius/3, 0, TWOPI);
                this.sCtx.stroke();
                break;
            }
            default: break;
        }
        this.sCtx.restore();
    }

    updateActiveCell(cell: Cell|null) {
        if (this.activeCell) this.activeCell.isActive = false;
        this.activeCell = cell;
        if (cell) {
            this.activeCell.isActive = true;

            this.charInputEl.style.top = `${cell.pos.r * this.cellHeight}px`;
            this.charInputEl.style.left = `${cell.pos.c * this.cellWidth}px`;
            this.charInputEl.value = this.activeCell.char;
            this.charInputEl.focus();

            if (this.toolManager.currentTool === 'cursor') this.toolManager.setCurrentCellStyling(cell);
        }
    }

    isPosInBounds(row, col): boolean {
        if (col < 0) return false;
        if (col >= this.width) return false;
        if (row < 0) return false;
        if (row >= this.height) return false;
        return true;
    }

    updateCellHit(ev: MouseEvent, setActive: boolean = false) {
        const { x, y } = this.getMousePos(ev);

        const col = Math.floor(x / this.cellWidth);
        const row = Math.floor(y / this.cellHeight);

        if (!this.isPosInBounds(row, col)) {
            this.hoveredCell = null;
            return;
        }
        
        if (setActive || (this.toolManager.toolType === 'selection' && this.selectionStartCell && this.selectionStartCell !== this.grid[row][col])) {
            this.updateActiveCell(this.grid[row][col]);
        }

        if (this.selectionStartCell) {// && (this.toolManager.currentTool === 'select')) {
            this.hoveredCell = null;

            this.emptySelectionBuffer();
            const boundsRStart = Math.min(this.selectionStartCell.pos.r, row);
            const boundsREnd = Math.max(this.selectionStartCell.pos.r, row);
            const boundsCStart = Math.min(this.selectionStartCell.pos.c, col);
            const boundsCEnd = Math.max(this.selectionStartCell.pos.c, col);
            for (let c = boundsCStart; c <= boundsCEnd; c++) {
                for (let r = boundsRStart; r <= boundsREnd; r++) {
                    this.selectedCellBuffer.add(this.grid[r][c]);
                }
            }

        } else {
            this.hoveredCell = this.grid[row][col];
        }
    }

    wandSelection(ev: MouseEvent) {
        this.startSelection(ev);

        const { x, y } = this.getMousePos(ev);

        const col = Math.floor(x / this.cellWidth);
        const row = Math.floor(y / this.cellHeight);

        if (!this.isPosInBounds(row, col)) {
            this.hoveredCell = null;
            return;
        }

        const startCell = this.grid[row][col];

        const matchChar = (document.getElementById('match-character') as HTMLInputElement).checked;
        const matchFg = (document.getElementById('match-fg') as HTMLInputElement).checked;
        const matchBg = (document.getElementById('match-bg') as HTMLInputElement).checked;

        if (!(matchChar || matchFg || matchBg)) return;
        
        this.selectedCellBuffer = new Set(Array.from(this.allCells).filter((cell) => (
            ((matchChar && (!cell.hasChar && !startCell.hasChar || cell.char === startCell.char)) || !matchChar) &&
            ((matchFg && (!cell.style?.fgColor && !startCell.style?.fgColor || cell.style?.fgColor === startCell.style?.fgColor)) || !matchFg) &&
            ((matchBg && (!cell.style?.bgColor && !startCell.style?.bgColor || cell.style?.bgColor === startCell.style?.bgColor)) || !matchBg)
        )));

        this.selectedCellBuffer.add(startCell);
        if (this.selectionType === 'replace') this.pushSelectionBuffer(SelectAdd);
        if (this.selectionType === 'add') this.pushSelectionBuffer(SelectAdd);
        if (this.selectionType === 'intersect') this.pushSelectionBuffer(SelectFlip);
        if (this.selectionType === 'subtract') this.pushSelectionBuffer(SelectSubtract);
        
        this.finaliseSelection();
        this.renderCellBorders();
    }

    pickCellStyle(cell: Cell) {
        const getChar = (document.getElementById('pick-character') as HTMLInputElement).checked;
        const getFg = (document.getElementById('pick-fg') as HTMLInputElement).checked;
        const getBg = (document.getElementById('pick-bg') as HTMLInputElement).checked;

        if (!(getChar || getFg || getBg)) return;

        this.toolManager.setCurrentCellStyling({
            ...(getChar ? { char: cell.char} : {}),
            style: {
                ...(getFg && cell.style.fgColor !== undefined ? { fgColor: cell.style.fgColor } : {}),
                ...(getBg && cell.style.bgColor !== undefined ? { bgColor: cell.style.bgColor } : {}),
            }
        });
    }

    startSelection(ev: MouseEvent) {
        const isCtrl = ev.ctrlKey || ev.metaKey;
        const rules: [condition: boolean, mode: SelectionOperation][] = [
            [ev.shiftKey, "add"],
            [isCtrl, "intersect"],
            [ev.altKey, "subtract"],
        ];

        this.selectionType = rules.find(([active]) => active)?.[1] ?? "replace";
        showText(`Started selection in ${this.selectionType.toUpperCase()} mode`)
        if (this.selectionType === 'replace') {
            this.emptySelectedCells();
        }
    }

    startRectSelection(ev: MouseEvent) {
        this.commit();

        this.emptySelectionBuffer();
        document.body.style.userSelect = 'none';

        const { x, y } = this.getMousePos(ev);

        const col = Math.floor(x / this.cellWidth);
        const row = Math.floor(y / this.cellHeight);

        if (!this.isPosInBounds(row, col)) {
            this.hoveredCell = null;
            return;
        }

        this.hoveredCell = this.grid[row][col];
        this.updateActiveCell(this.grid[row][col]);

        this.selectionStartCell = this.grid[row][col];
        this.startSelection(ev);
    }

    redrawMarchingAnts(): boolean {
        if (this.hasSelection) {
            this.renderCellBorders();
            return true;
        }
        else {
            showText('Ended marching ants');
            return false;
        }
    }
    
    animateLoop() {
        this.animCallbacks.forEach((cb) => { const result = cb(); if (!result) this.animCallbacks.delete(cb); });
        this.frame++;
        
        requestAnimationFrame(() => { this.animateLoop(); });
    }

    getBoundingBox(cells: Set<Cell>) {
        if (cells.size === 0) return null;

        let minR = Infinity, maxR = -Infinity;
        let minC = Infinity, maxC = -Infinity;

        for (const { pos: { r, c } } of cells) {
            if (r < minR) minR = r;
            if (r > maxR) maxR = r;
            if (c < minC) minC = c;
            if (c > maxC) maxC = c;
        }

        return {
            topLeft: { r: minR, c: minC },
            bottomRight: { r: maxR, c: maxC },
        };
    }

    getSortedCells(cells: Iterable<Cell>, dir: Direction): Cell[] {
        const rowMult = dir.includes('w') ? -1 : 1;
        const colMult = dir.includes('n') ? -1 : 1;

        return Array.from(cells).sort((a, b) => {
            if (a.pos.r !== b.pos.r) {
            return (a.pos.r - b.pos.r) * rowMult;
            }
            return (a.pos.c - b.pos.c) * colMult;
        });
    }

    finaliseTransform() {
        if (!this.activeTransform || !this.hasSelection) return;

        const dR = this.activeTransform.r;
        const dC = this.activeTransform.c;

        const dir = getDirectionToOrigin({ r: dR, c: dC }, { r: 0, c: 0 });

        if (dir) {
            const sortedCells = this.getSortedCells(this.selectedCells, dir);
            const oldSelection = new Set<Cell>(Array.from(this.selectedCells));

            this.commit();
    
            for (const sourceCell of sortedCells) {
                const { r, c } = sourceCell.pos;
                const destCellPos = { r: r + dR, c: c + dC };
    
                if (this.isPosInBounds(destCellPos.r, destCellPos.c)) {
                    const targetCell = this.grid[destCellPos.r][destCellPos.c];
                    targetCell.replaceWith(sourceCell);
                }
    
                sourceCell.char = null;
                sourceCell.reset();
            }
            this.emptySelectedCells();
            this.pushSelectionBuffer(SelectAdd);
            this.finaliseSelection();
            this.render([...oldSelection]);
            
            showText('Finished transform',"info");
        }
        this.activeTransform = null;
        this.transformBase = { r: 0, c: 0 };
        this.render(this.selectedCells);
        this.renderCellBorders();
    }

    cancelTransform() {
        if (!this.activeTransform) return;

        this.activeTransform = null;
        this.transformBase = { r: 0, c: 0 };
        this.emptySelectionBuffer();
        showText('Cancelled pending transform');
        this.renderCellBorders();
    }

    endSelection(ev: MouseEvent) {
        const { x, y } = this.getMousePos(ev);

        let col = Math.floor(x / this.cellWidth);
        let row = Math.floor(y / this.cellHeight);

        if (!this.isPosInBounds(row, col)) {
            this.hoveredCell = null;
           col = clampi(col, 0, this.width - 1); 
           row = clampi(row, 0, this.height - 1); 
        }
        
        if (this.selectionType === 'replace') {
            if (this.selectionStartCell === this.grid[row][col]) {
                this.emptySelectedCells();
                this.pushSelectionBuffer(SelectAdd);
                this.clearSelection();
                showText('Cleared selection');
            } else {
                this.pushSelectionBuffer(SelectAdd);
            }
        } else {
            if (this.selectionStartCell === this.grid[row][col]) this.selectedCellBuffer.add(this.grid[row][col]);
            if (this.selectionType === 'add') this.pushSelectionBuffer(SelectAdd);
            if (this.selectionType === 'intersect') this.pushSelectionBuffer(SelectFlip);
            if (this.selectionType === 'subtract') this.pushSelectionBuffer(SelectSubtract);
        }
        this.updateCellHit(ev);

        this.finaliseSelection();
        
        showText(`Selected ${this.selectedCells.size} cells in ${this.selectionType.toUpperCase()} mode<br>`);
        document.body.style.userSelect = '';

    }

    finaliseSelection() {
        this.selectionStartCell = null;
        this.frame = 0;
        this.animCallbacks.add(() => this.redrawMarchingAnts());
        this.emptySelectionBuffer();
        this.renderCellBorders();
    }

    clearSelection() {
        if (this.hasSelection) this.commit();
        const prevSize = this.selectedCells.size;

        const modified = [ ...this.selectedCells ];
        this.selectionStartCell = null;
        this.emptySelectedCells();

        this.render(modified);
        this.renderCellBorders();

        showText(`Cleared selection (${prevSize} -> 0)`);
    }

    emptySelectedCells() {
        this.selectedCells.forEach(c => { c.isActive = false; c.isSelected = false; });
        this.selectedCells.clear();
    }

    emptySelectionBuffer() {
        this.selectedCellBuffer.clear();
    }
    
    pushSelectionBuffer(mode: (main: boolean) => boolean) {
        this.selectedCellBuffer.forEach((c: Cell) => { 
            const resolvedState = (mode(c.isSelected));
                if (resolvedState == true) {
                this.selectedCells.add(c);
                c.isSelected = true;
            } else {
                this.selectedCells.delete(c);
                c.isSelected = false;
            }
        });
        this.emptySelectionBuffer();
    }

    paintCell(styledCell: Partial<Cell>, target: Cell, nullErases: boolean = false) {
        if ((styledCell.char) || (nullErases && styledCell.char !== undefined)) {
            target.char = styledCell.char;
        }
        if (styledCell.style) {
            if (styledCell.style.fgColor) target.style.fgColor = styledCell.style.fgColor;
            if (styledCell.style.bgColor) target.style.bgColor = styledCell.style.bgColor;
        }
        this.updateActiveCell(target);
        this.render([target]);
    }
    
    imposeCellStyle(styledCell: Partial<Cell>, cells: Iterable<Cell>, nullErases: boolean = false) {
        // showText(`Imposing cell style: ${JSON.stringify(styledCell)}`);
        if (this.hasSelection || this.activeCell) {
            this.modifyCells((c: Cell) => {
                this.paintCell(styledCell, c, nullErases);
            }, cells);
        }
    }

    modifyActiveCell(action: (c: Cell) => any) {
        if (!this.activeCell) return;
        this.commit();
        
        action(this.activeCell);
        this.render([this.activeCell]);
    }
    
    modifyCellAt(action: (c: Cell) => any, pos: Position) {
        const target = this.grid[pos.r][pos.c];
        if (!target) return;
        this.commit();
        
        action(target);
        this.render([target]);
    }

    modifyCells(action: (c: Cell) => any, mask: Iterable<Cell>) {
        this.commit();

        for (const cell of mask) action(cell);
        
        this.render(mask);
    }

    // if `unformatted` is true, this will adopt the styling of whatever it is pasted into
    insertPlaintext(text: string, unformatted: boolean) {
        const startPos = this.activeCell?.pos || this.hoveredCell?.pos || null;
        if (!startPos) {
            showText('No active or hovered cell found; could not paste!');
        };

        this.commit();

        const modified: Cell[] = [];

        const rows = text.split('\n');
        rows.forEach((row, _r) => {
            row.split('').map((v: string, _c: number) => {
                const { r, c } = { r: _r + startPos.r, c: _c + startPos.c };

                if (r >= 0 && c >= 0 && r < this.height && c < this.width) {
                    this.grid[r][c].char = v;
                    if (!unformatted) this.grid[r][c].reset();
                    modified.push(this.grid[r][c]);
                }
            });
        });

        this.render(modified);
    }

    renderMouseoverDebug(ev: MouseEvent) {
        const { x: worldX, y: worldY } = this.getMousePos(ev);
        const col = Math.floor(worldX / this.cellWidth);
        const row = Math.floor(worldY / this.cellHeight);

        const screenX = (worldX * this.currentZoom) + this.currentPanX;
        const screenY = (worldY * this.currentZoom) + this.currentPanY;

        this.sCtx.save();
        this.sCtx.setTransform(1, 0, 0, 1, 0, 0);
        
        if (this.debugMode) {
            this.sCtx.fillStyle = "#0006";
            this.sCtx.fillRect(0,0,280,65);
            this.sCtx.fillStyle = 'palegreen';
            this.sCtx.font = '10px monospace';
            this.sCtx.textAlign = 'left';
            this.sCtx.fillText(`x:${(worldX).toFixed(0)},y:${(worldY).toFixed(0)}`, 5, 12);

            if (!this.isPosInBounds(row, col)) this.sCtx.fillStyle = 'crimson';
            this.sCtx.fillText(`c:${col},r:${row}`, 5, 26);

            if (this.hoveredCell) {
                this.sCtx.fillStyle = 'limegreen';
                this.sCtx.fillText(`hovered cell: row:${this.hoveredCell.pos.r},col:${this.hoveredCell.pos.c}   char: ${this.hoveredCell.char.trim() || '(none)'}`, 5, 42);
            }
            if (this.activeCell) {
                this.sCtx.fillStyle = 'skyblue';
                this.sCtx.fillText(`active cell: row:${this.activeCell.pos.r},col:${this.activeCell.pos.c}`, 5, 56);
            }

            this.sCtx.fillStyle = 'magenta';
            this.sCtx.fillRect(Math.floor(screenX) - 1, Math.floor(screenY) - 1, 3, 3);

            this.sCtx.restore();
        }
    }
}