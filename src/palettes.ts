import type { Palette } from "./tool_manager";

export const DEFAULT_COLOUR_PALETTES: Record<string, Palette> = {
    Standard: {
        foreground: "#aaaaaa", background: "#000000", 
        brForeground: "#ffffff", brBackground: "#7f7f7f",
        dimForeground: "#555555", dimBackground: "#000000",

        black: "#000000", red: "#cd0000", green: "#00cd00", yellow: "#cdcd00",
        blue: "#0000ee", magenta: "#cd00cd", cyan: "#00cdcd", white: "#e5e5e5",

        brBlack: "#7f7f7f", brRed: "#ff0000", brGreen: "#00ff00", brYellow: "#ffff00",
        brBlue: "#5c5cff", brMagenta: "#ff00ff", brCyan: "#00ffff", brWhite: "#ffffff",

        dimBlack: "#000000", dimRed: "#8b0000", dimGreen: "#006400", dimYellow: "#8b8b00",
        dimBlue: "#00008b", dimMagenta: "#8b008b", dimCyan: "#008b8b", dimWhite: "#999999"
    },
    DarkPastels: {
        foreground: "#dcdccc", background: "#2c2c2c", 
        brForeground: "#dcdccc", brBackground: "#2c2c2c",
        dimForeground: "#dcdccc", dimBackground: "#2c2c2c",

        black: "#3f3f3f", red: "#705050", green: "#60b48a", yellow: "#dfaf8f",
        blue: "#9ab8d7", magenta: "#dc8cc3", cyan: "#8cd0d3", white: "#dcdccc",

        brBlack: "#709080", brRed: "#dca3a3", brGreen: "#72d5a3", brYellow: "#f0dfaf",
        brBlue: "#94bff3", brMagenta: "#ec93d3", brCyan: "#93e0e3", brWhite: "#ffffff",

        dimBlack: "#343434", dimRed: "#664848", dimGreen: "#57a37c", dimYellow: "#aa856f",
        dimBlue: "#758da1", dimMagenta: "#9a6289", dimCyan: "#6b9fa1", dimWhite: "#95958b"
    },
    SolarizedLight: {
        foreground: "#657b83", background: "#fdf6e3", 
        brForeground: "#586e75", brBackground: "#eee8d5",
        dimForeground: "#8dacb6", dimBackground: "#fdf6e3",

        black: "#073642", red: "#dc322f", green: "#859900", yellow: "#b58900",
        blue: "#268bd2", magenta: "#d33682", cyan: "#2aa198", white: "#eee8d5",

        brBlack: "#002b36", brRed: "#cb4b16", brGreen: "#586e75", brYellow: "#657b83",
        brBlue: "#839496", brMagenta: "#6c71c4", brCyan: "#93a1a1", brWhite: "#fdf6e3",

        dimBlack: "#084150", dimRed: "#de5151", dimGreen: "#99a827", dimYellow: "#d5aa31",
        dimBlue: "#50ade2", dimMagenta: "#df5c9e", dimCyan: "#4ed3c8", dimWhite: "#eee8d5"
    },
    GreenOnBlack: {
        foreground: "#18f018", background: "#000000", 
        brForeground: "#18f018", brBackground: "#000000",
        dimForeground: "#12c812", dimBackground: "#000000",

        black: "#000000", red: "#fa4b4b", green: "#18b218", yellow: "#b26818",
        blue: "#1818b2", magenta: "#e11ee1", cyan: "#18b2b2", white: "#b2b2b2",

        brBlack: "#686868", brRed: "#ff5454", brGreen: "#54ff54", brYellow: "#ffff54",
        brBlue: "#5454ff", brMagenta: "#ff54ff", brCyan: "#54ffff", brWhite: "#ffffff",

        dimBlack: "#181818", dimRed: "#651919", dimGreen: "#006500", dimYellow: "#654a00",
        dimBlue: "#000065", dimMagenta: "#5f055f", dimCyan: "#006565", dimWhite: "#656565"
    },
    Breeze: {
        foreground: "#fcfcfc", background: "#232627", 
        brForeground: "#ffffff", brBackground: "#000000",
        dimForeground: "#eff0f1", dimBackground: "#31363b",

        black: "#232627", red: "#ed1515", green: "#11d116", yellow: "#f67400",
        blue: "#1d99f3", magenta: "#9b59b6", cyan: "#1abc9c", white: "#fcfcfc",

        brBlack: "#7f8c8d", brRed: "#c0392b", brGreen: "#1cdc9a", brYellow: "#fdbc4b",
        brBlue: "#3daee9", brMagenta: "#8e44ad", brCyan: "#16a085", brWhite: "#ffffff",

        dimBlack: "#31363b", dimRed: "#783228", dimGreen: "#17a262", dimYellow: "#b65619",
        dimBlue: "#1b668f", dimMagenta: "#614a73", dimCyan: "#186c60", dimWhite: "#63686d"
    },
    BlackOnLightYellow: {
        foreground: "#000000", background: "#ffffdd", 
        brForeground: "#000000", brBackground: "#ffffdd",
        dimForeground: "#000000", dimBackground: "#ffffdd",

        black: "#000000", red: "#b21818", green: "#18b218", yellow: "#b26818",
        blue: "#1818b2", magenta: "#b218b2", cyan: "#18b2b2", white: "#b2b2b2",

        brBlack: "#686868", brRed: "#ff5454", brGreen: "#54ff54", brYellow: "#ffff54",
        brBlue: "#5454ff", brMagenta: "#ff54ff", brCyan: "#54ffff", brWhite: "#ffffff",

        dimBlack: "#c0c0c0", dimRed: "#e08e8e", dimGreen: "#8ee08e", dimYellow: "#e0e08e",
        dimBlue: "#8e8ee0", dimMagenta: "#e08ee0", dimCyan: "#8ee0e0", dimWhite: "#8e8e8e"
    },
    BlackOnRandomLight: {
        foreground: "#000000", background: "#f7f7d6", 
        brForeground: "#000000", brBackground: "#ffffdd",
        dimForeground: "#000000", dimBackground: "#f7f7d6",

        black: "#000000", red: "#b21818", green: "#18b218", yellow: "#b26818",
        blue: "#1818b2", magenta: "#b218b2", cyan: "#18b2b2", white: "#b2b2b2",

        brBlack: "#686868", brRed: "#ff5454", brGreen: "#54ff54", brYellow: "#ffff54",
        brBlue: "#5454ff", brMagenta: "#ff54ff", brCyan: "#54ffff", brWhite: "#ffffff",

        dimBlack: "#c0c0c0", dimRed: "#e08e8e", dimGreen: "#8ee08e", dimYellow: "#e0e08e",
        dimBlue: "#8e8ee0", dimMagenta: "#e08ee0", dimCyan: "#8ee0e0", dimWhite: "#8e8e8e"
    },
    BlueOnBlack: {
        foreground: "#0077ff", background: "#000000", 
        brForeground: "#174af0", brBackground: "#000000",
        dimForeground: "#005ac3", dimBackground: "#000000",

        black: "#000000", red: "#fa0000", green: "#18b218", yellow: "#b26818",
        blue: "#7d9823", magenta: "#e11ee1", cyan: "#0086df", white: "#ffffff",

        brBlack: "#686868", brRed: "#4b5dff", brGreen: "#54ff54", brYellow: "#ffff54",
        brBlue: "#5454ff", brMagenta: "#ff54ff", brCyan: "#0044ff", brWhite: "#323232",

        dimBlack: "#c0c0c0", dimRed: "#fa0000", dimGreen: "#8ee08e", dimYellow: "#e0e08e",
        dimBlue: "#7d9823", dimMagenta: "#af1daf", dimCyan: "#0062ad", dimWhite: "#c8c8c8"
    },
    WhiteOnBlack: {
        foreground: "#ffffff", background: "#000000", 
        brForeground: "#ffffff", brBackground: "#000000",
        dimForeground: "#ffffff", dimBackground: "#000000",

        black: "#000000", red: "#b21818", green: "#18b218", yellow: "#b26818",
        blue: "#1818b2", magenta: "#b218b2", cyan: "#18b2b2", white: "#b2b2b2",

        brBlack: "#686868", brRed: "#ff5454", brGreen: "#54ff54", brYellow: "#ffff54",
        brBlue: "#5454ff", brMagenta: "#ff54ff", brCyan: "#54ffff", brWhite: "#ffffff",

        dimBlack: "#181818", dimRed: "#650000", dimGreen: "#006500", dimYellow: "#654a00",
        dimBlue: "#000065", dimMagenta: "#5f055f", dimCyan: "#18b2b2", dimWhite: "#656565"
    },
    RedOnBlack: {
        foreground: "#ff0000", background: "#000000", 
        brForeground: "#18f018", brBackground: "#000000",
        dimForeground: "#cd0000", dimBackground: "#000000",

        black: "#000000", red: "#fa8e08", green: "#18b218", yellow: "#b26818",
        blue: "#1e4798", magenta: "#e11ee1", cyan: "#0086df", white: "#ffffff",

        brBlack: "#686868", brRed: "#ff5454", brGreen: "#54ff54", brYellow: "#ffff54",
        brBlue: "#5454ff", brMagenta: "#ff54ff", brCyan: "#ff0004", brWhite: "#323232",

        dimBlack: "#181818", dimRed: "#651900", dimGreen: "#006500", dimYellow: "#654a00",
        dimBlue: "#001866", dimMagenta: "#5f055f", dimCyan: "#005ea3", dimWhite: "#656565"
    },
    Solarized: {
        foreground: "#839496", background: "#002b36", 
        brForeground: "#93a1a1", brBackground: "#073642",
        dimForeground: "#6a7779", dimBackground: "#002b36",

        black: "#073642", red: "#dc322f", green: "#859900", yellow: "#b58900",
        blue: "#268bd2", magenta: "#d33682", cyan: "#2aa198", white: "#eee8d5",

        brBlack: "#002b36", brRed: "#cb4b16", brGreen: "#586e75", brYellow: "#657b83",
        brBlue: "#839496", brMagenta: "#6c71c4", brCyan: "#93a1a1", brWhite: "#fdf6e3",

        dimBlack: "#06303b", dimRed: "#93211f", dimGreen: "#5e6a00", dimYellow: "#8a6700",
        dimBlue: "#144d73", dimMagenta: "#781e4b", dimCyan: "#185e58", dimWhite: "#aba79a"
    },
    BlackOnWhite: {
        foreground: "#000000", background: "#ffffff", 
        brForeground: "#000000", brBackground: "#ffffff",
        dimForeground: "#000000", dimBackground: "#ffffff",

        black: "#000000", red: "#b21818", green: "#18b218", yellow: "#b26818",
        blue: "#1818b2", magenta: "#b218b2", cyan: "#18b2b2", white: "#b2b2b2",

        brBlack: "#686868", brRed: "#ff5454", brGreen: "#54ff54", brYellow: "#ffff54",
        brBlue: "#5454ff", brMagenta: "#ff54ff", brCyan: "#54ffff", brWhite: "#ffffff",

        dimBlack: "#c0c0c0", dimRed: "#e08e8e", dimGreen: "#8ee08e", dimYellow: "#e0e08e",
        dimBlue: "#8e8ee0", dimMagenta: "#e08ee0", dimCyan: "#8ee0e0", dimWhite: "#8e8e8e"
    },
    Linux: {
        foreground: "#b2b2b2", background: "#000000", 
        brForeground: "#ffffff", brBackground: "#686868",
        dimForeground: "#656565", dimBackground: "#000000",

        black: "#000000", red: "#b21818", green: "#18b218", yellow: "#b26818",
        blue: "#1818b2", magenta: "#b218b2", cyan: "#18b2b2", white: "#b2b2b2",

        brBlack: "#686868", brRed: "#ff5454", brGreen: "#54ff54", brYellow: "#ffff54",
        brBlue: "#5454ff", brMagenta: "#ff54ff", brCyan: "#54ffff", brWhite: "#ffffff",

        dimBlack: "#181818", dimRed: "#650000", dimGreen: "#006500", dimYellow: "#655e00",
        dimBlue: "#000065", dimMagenta: "#650065", dimCyan: "#006565", dimWhite: "#656565"
    }
};