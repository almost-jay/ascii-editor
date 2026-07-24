import Notifier from "ui-cues-ts";

export interface GlyphIndexEntry {
    codepoint: number;
    width: number;
    height: number;
    bitmap: Uint32Array; // 32 rows, one uint32 per row
}

export class FontIndexer {
    private static readonly SOURCE_SIZE = 64;
    private static readonly TARGET_SIZE = 32;
    private static readonly ALPHA_THRESHOLD = 20;


    static async build(fontFamily: string): Promise<GlyphIndexEntry[]> {
        return Notifier.withProgress(async (onProgress) => {

            const glyphs: GlyphIndexEntry[] = [];

            const src = document.createElement("canvas");
            src.width = this.SOURCE_SIZE;
            src.height = this.SOURCE_SIZE;

            const dst = document.createElement("canvas");
            dst.width = this.TARGET_SIZE;
            dst.height = this.TARGET_SIZE;

            const srcCtx = src.getContext("2d", { willReadFrequently: true })!;

            const dstCtx = dst.getContext("2d", { willReadFrequently: true })!;

            srcCtx.font = `48px "${fontFamily}"`;
            srcCtx.textAlign = "center";
            srcCtx.textBaseline = "middle";
            srcCtx.fillStyle = "black";

            // TODO, expand ranges
            const ranges = [
                [0x0020, 0x007E], 
                [0x00A0, 0x00FF], 
                [0x2500, 0x257F], 
                [0x2580, 0x259F], 
                [0x2800, 0x28FF]
            ];

            const total = ranges.reduce((n, [a, b]) => n + (b - a + 1),0);

            let completed = 0;

            for (const [start, end] of ranges) {
                for (let cp = start; cp <= end; cp++) {
                    const glyph = String.fromCodePoint(cp);

                    const entry = this.renderGlyph(glyph, cp, src, srcCtx, dst, dstCtx);

                    if (entry) glyphs.push(entry);

                    completed++;

                    if ((completed & 31) === 0) {
                        onProgress(completed / total * 100, `Indexing "${fontFamily}" (${completed}/${total})`);
                        await new Promise(requestAnimationFrame);
                    }
                }
            }

            return glyphs;

        }, {
            initialMessage: `Building index for "${fontFamily}"...`, completionMessage: `Indexed "${fontFamily}".`
        });

    }

    private static renderGlyph(glyph: string, codepoint: number, src: HTMLCanvasElement, srcCtx: CanvasRenderingContext2D, dst: HTMLCanvasElement, dstCtx: CanvasRenderingContext2D): GlyphIndexEntry | null {

        srcCtx.clearRect(0, 0, src.width, src.height);

        srcCtx.fillText(glyph, src.width / 2, src.height / 2);

        const image = srcCtx.getImageData(0, 0, src.width, src.height);
        const bounds = this.findBounds(image);

        if (!bounds)
            return null;

        dstCtx.clearRect(0, 0, dst.width, dst.height);

        dstCtx.drawImage(src, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, this.TARGET_SIZE, this.TARGET_SIZE);

        const normalized = dstCtx.getImageData(0, 0, this.TARGET_SIZE, this.TARGET_SIZE);

        return { codepoint, width: bounds.width, height: bounds.height, bitmap: this.packBitmap(normalized) };
    }

    private static findBounds(image: ImageData) {
        const { width, height, data } = image;

        let minX = width;
        let minY = height;
        let maxX = -1;
        let maxY = -1;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const alpha = data[(y * width + x) * 4 + 3];
                if (alpha <= this.ALPHA_THRESHOLD) continue;

                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }

        if (maxX < minX) return null;

        return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
    }

    private static packBitmap(image: ImageData): Uint32Array {
        const bits = new Uint32Array(this.TARGET_SIZE);
        const { width, data } = image;

        for (let y = 0; y < this.TARGET_SIZE; y++) {
            let row = 0;
            for (let x = 0; x < this.TARGET_SIZE; x++) {
                const alpha = data[(y * width + x) * 4 + 3];
                if (alpha > this.ALPHA_THRESHOLD) row |= (1 << (31 - x));
            }

            bits[y] = row >>> 0;
        }

        return bits;
    }

}