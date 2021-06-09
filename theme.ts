import { colors } from "./deps.ts";
import { KopoOptions, Settings } from "./settings.ts";
import { random } from "./utils.ts";

export class Theme {

    static colors = colors;

    static themes: {[key: string]: (str: string) => string} = {
        "blue": colors.blue,
        "cyan": colors.cyan,
        "gray": colors.gray,
        "green": colors.green,
        "magenta": colors.magenta,
        "red": colors.red,
        "yellow": colors.yellow,
        "white": colors.white,
        "random": a => a
    };

    static accent = (str: string) => str;

    static async init() {
        this.setThemeColors(await Settings.getKopoOption(KopoOptions.theme));
    }

    static setThemeColors(theme: string) {
        this.accent = this.getColorForTheme(theme);
    }

    static getColorForTheme(theme: string) {
        if(theme === "random") {
            return this.themes[random(Object.keys(this.themes))[0]];
        } else {
            return this.themes[theme] || colors.yellow;
        }
    }
}