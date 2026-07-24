import { CharGrid } from "./char_grid";

const outputEl = document.getElementById('console');
const canvasContainer = document.getElementById('canvas-container') as HTMLDivElement;

let textStack = 0;
let queuedText:string|null = null;

const originalConsoleError: typeof console.error = console.error;

export function showText(text: string, type?: 'error'|'warn'|'info') {
	if (!type) {
		const datedText = `[${new Date().toLocaleTimeString()}]  ` + text;
		if (queuedText == text) {
			textStack++;
		} else {
			outputEl.innerHTML += '<br>' + `(×${textStack})` + `[${new Date().toLocaleTimeString()}]  ` + queuedText;
			queuedText = text;
			textStack = 0;
			outputEl.innerHTML += '<br>' + datedText;
			console.log(text);
		}
	} else {
		if (type === 'error') { 
			originalConsoleError(text);
			outputEl.innerHTML += "<pre style='color: crimson; margin: 8px 0px'>"+ `[${new Date().toLocaleTimeString()}]  ` + text + '</pre>';
		} else if (type === 'warn') { 
			console.warn(text);
			outputEl.innerHTML += "<pre style='color: coral; margin: 6px 0px'>"+ `[${new Date().toLocaleTimeString()}]  ` + text + '</pre>';
		} else if (type === 'info') {
			console.info(text);
			outputEl.innerHTML += "<pre style='color: cornflowerblue; margin: 4px 0px'>"+ `[${new Date().toLocaleTimeString()}]  ` + text + '</pre>';
		}
	}
	outputEl.scrollTo({ top: outputEl.scrollHeight, behavior: 'smooth' });
}

console.error = (...args: any[]): void => {
  showText(String(...args)+"</pre>");
  originalConsoleError.apply(console, args);
};

window.addEventListener('error', (event: ErrorEvent) => {
  showText(event.message, 'error');
});

window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  showText(event.reason, 'error');
});

export let _charGrid: CharGrid|null = null;

function generateCells() {
	
	if (_charGrid) { confirm('This will destroy your existing canvas. Proceed?') }
	_charGrid = new CharGrid(64, 28, canvasContainer, document.getElementById('status-bar') as HTMLDivElement);

	showText(`Canvas dimensions: ${canvasContainer.clientWidth} x ${canvasContainer.clientHeight}`);
}

document.getElementById('clear-storage').addEventListener('click', () => {
    const dialog = document.getElementById('clear-storage-selection') as HTMLDialogElement;
    const formDiv = document.getElementById('clear-form-contents') as HTMLDivElement;
    formDiv.innerHTML = '';

    const tree = buildTreeFromStorage();
    const treeDOM = renderTree(tree);
    formDiv.appendChild(treeDOM);
    setupCheckboxCascading(formDiv);
    dialog.querySelectorAll('input[type="checkbox"].icon-btn').forEach((inp: HTMLInputElement) => {
        const updateBg = () => {
            inp.style.backgroundImage = `url('/${inp.dataset.icon}-${inp.checked ? 'checked' : 'unchecked'}.png')`;
        };
        updateBg();
        inp.addEventListener('change', updateBg);
    });

	document.getElementById('clear-storage-form').addEventListener('submit', () => {
		deleteSelectedStorage(formDiv);
	});

    dialog.showModal();
});

/**
 * Recursively converts primitive values in a JSON object to the actual fullKey string
 */
function replaceLeavesWithKey(obj: any, fullKey: string): any {
    if (typeof obj !== 'object' || obj === null) {
        return fullKey;
    }
    const result: Record<string, any> = {};
    for (const k of Object.keys(obj)) {
        result[k] = replaceLeavesWithKey(obj[k], fullKey);
    }
    return result;
}

function buildTreeFromStorage(): Record<string, any> {
    const root: Record<string, any> = {};

    for (let i = 0; i < localStorage.length; i++) {
        const fullKey = localStorage.key(i);
        if (!fullKey) continue;

        const val = localStorage.getItem(fullKey);
        let parsedVal: any = null;

        try {
            parsedVal = JSON.parse(val || '');
        } catch {
            parsedVal = null;
        }

        const leafStructure = (parsedVal && typeof parsedVal === 'object' && parsedVal !== null)
            ? replaceLeavesWithKey(parsedVal, fullKey)
            : fullKey;

        const pathSegments = fullKey.split(/[:\/.]/);
        let current = root;

        pathSegments.forEach((segment, idx) => {
            const isLastSegment = idx === pathSegments.length - 1;

            if (isLastSegment) {
                if (typeof current[segment] === 'object' && current[segment] !== null) {
                    current[segment]['__value__'] = leafStructure;
                } else {
                    current[segment] = leafStructure;
                }
            } else {
                if (typeof current[segment] !== 'object' || current[segment] === null) {
                    const existingVal = current[segment];
                    current[segment] = {};
                    if (existingVal) {
                        current[segment]['__value__'] = existingVal;
                    }
                }
                current = current[segment];
            }
        });
    }

    return root;
}

/**
 * Creates nested <details> elements representing the tree.
 * Automatically expands levels 1-2 and collapses level 3+.
 */
function renderTree(node: Record<string, any>, currentDepth = 1): HTMLElement {
    const container = document.createElement('div');
    container.className = 'tree-group';

    for (const key of Object.keys(node)) {
        const val = node[key];
        const isLeaf = typeof val === 'string';
        const isBottommostFolder = !isLeaf && typeof val === 'object' && val !== null && isTerminalNode(val);

        // If it's a leaf node, render a simple label item
        if (isLeaf) {
            const leafDiv = document.createElement('div');
            leafDiv.className = 'tree-leaf';

            const label = document.createElement('label');
            label.className = 'clear-label';

            const input = createCheckbox();
            input.dataset.storageKey = val;
			input.name = "clear-storage";

            label.appendChild(input);
            label.appendChild(document.createTextNode(` ${key}`));
            leafDiv.appendChild(label);
            container.appendChild(leafDiv);
            continue;
        }

        // Folder node (<details> / <summary>)
        const details = document.createElement('details');
        details.className = 'tree-folder';
        
        // Auto-expand the first two levels only
        if (currentDepth <= 2) {
            details.open = true;
        }

        const summary = document.createElement('summary');
        summary.className = 'tree-summary';

        const label = document.createElement('label');
        label.className = 'clear-label';
        
        // Prevent clicking the checkbox from toggling the <details> collapse state
        label.addEventListener('click', (e) => e.stopPropagation());

        const input = createCheckbox();

        if (isBottommostFolder) {
            const keysInFolder = getLeafKeys(val);
            input.dataset.storageKeys = JSON.stringify(keysInFolder);

            label.appendChild(input);

            const leafCount = Object.keys(val).length;
            label.appendChild(document.createTextNode(` ${key} `));

            const countBadge = document.createElement('span');
            countBadge.className = 'item-count';
            countBadge.textContent = `(${leafCount} ${leafCount === 1 ? 'item' : 'items'})`;
            label.appendChild(countBadge);

            summary.appendChild(label);
            details.appendChild(summary);
        } else {
			input.dataset.storageKeys = JSON.stringify(getLeafKeys(val));

            label.appendChild(input);
            label.appendChild(document.createTextNode(` ${key}`));
            summary.appendChild(label);
            details.appendChild(summary);

            // Recursively build children and pass incremented depth
            const childGroup = renderTree(val, currentDepth + 1);
            details.appendChild(childGroup);
        }

        container.appendChild(details);
    }

    return container;
}

/**
 * Helper to build standard checkbox elements
 */
function createCheckbox(): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'icon-btn';
    input.dataset.icon = 'checkbox';
    return input;
}

/**
 * Updates setupCheckboxCascading to work with <details> structures
 */
function setupCheckboxCascading(container: HTMLElement): void {
    container.addEventListener('change', (e: Event) => {
        const target = e.target as HTMLInputElement;
        if (!target || target.type !== 'checkbox') return;

        // 1. Cascade downwards inside current details block
        const parentFolder = target.closest('details, .tree-leaf');
        if (parentFolder) {
            const childCheckboxes = parentFolder.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
            childCheckboxes.forEach(child => {
                if (child !== target) {
                    child.checked = target.checked;
                    child.indeterminate = false;
                    child.dispatchEvent(new Event('change', { bubbles: false }));
                }
            });
        }

        // 2. Cascade upwards through parent <details> trees
        let currentDetails = target.closest('details')?.parentElement?.closest('details');
        while (currentDetails) {
            const parentCheckbox = currentDetails.querySelector<HTMLInputElement>(':scope > summary > label > input[type="checkbox"]');
            const siblingCheckboxes = Array.from(
                currentDetails.querySelectorAll<HTMLInputElement>(':scope > .tree-group > details > summary > label > input[type="checkbox"], :scope > .tree-group > .tree-leaf > label > input[type="checkbox"]')
            );

            if (parentCheckbox && siblingCheckboxes.length > 0) {
                const allChecked = siblingCheckboxes.every(c => c.checked);
                const someChecked = siblingCheckboxes.some(c => c.checked || c.indeterminate);

                parentCheckbox.checked = allChecked;
                parentCheckbox.indeterminate = !allChecked && someChecked;
                parentCheckbox.dispatchEvent(new Event('change', { bubbles: false }));
            }

            currentDetails = currentDetails.parentElement?.closest('details');
        }
    });
}

function isTerminalNode(obj: Record<string, any>): boolean {
    return Object.values(obj).every(val => typeof val === 'string');
}

function getLeafKeys(node: Record<string, any>): string[] {
    let keys: string[] = [];
    for (const val of Object.values(node)) {
        if (typeof val === 'string') {
            keys.push(val);
        } else if (typeof val === 'object' && val !== null) {
            keys = keys.concat(getLeafKeys(val));
        }
    }
    return keys;
}


function deleteSelectedStorage(formDiv: HTMLElement): void {
    const selectedInputs = formDiv.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked');
	const keysToDelete = new Set<string>();

    selectedInputs.forEach(input => {
        if (input.dataset.storageKey) {
            keysToDelete.add(input.dataset.storageKey);
        }
        
        if (input.dataset.storageKeys) {
            try {
                const keys: string[] = JSON.parse(input.dataset.storageKeys);
                keys.forEach(k => keysToDelete.add(k));
            } catch (err) {
                showText(err as string, 'warn');
            }
        }
    });

	const removed = [];
	const failed = [];
    keysToDelete.forEach(key => {
        if (localStorage.getItem(key) === null) {
            showText(`No item with key "${key}" was found.`, "warn");
			failed.push(key);
        } else {
			localStorage.removeItem(key);
	
			if (localStorage.getItem(key) === null) {
				removed.push(key);
			} else {
				failed.push(key);
			}
		}
        
    });

	let outputText = `(${removed.length}) successfully removed, (${failed.length}) failed`; 
	if (removed.length) outputText += `; deleted successfully : ${removed.join(", ")}`;
	if (failed.length) outputText += `; failed: ${failed.join(", ")}`;
	showText(outputText, "info");
}

generateCells();