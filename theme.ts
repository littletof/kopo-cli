import { colors } from "./deps.ts";
import { KopoOptions, Settings } from "./settings.ts";
import { random } from "./utils.ts";

export class Theme {

    static colors = colors;

    static themes: {[key: string]: {fg: (str: string) => string, bg: (str: string) => string}} = {
        "blue": {fg : colors.blue, bg: colors.bgBlue},
        "cyan": {fg : colors.cyan, bg: colors.bgCyan},
        "gray": {fg : colors.gray, bg: colors.bgBrightBlack},
        "green": {fg : colors.green, bg: colors.bgGreen},
        "magenta": {fg : colors.magenta, bg: colors.bgMagenta},
        "red": {fg : colors.red, bg: colors.bgRed},
        "yellow": {fg : colors.yellow, bg: colors.bgYellow},
        "white": {fg : colors.white, bg: colors.bgWhite},
        "random": {fg : a => a, bg: a => a},
        // "heavy_random": a => a,
    };

    static accent = (str: string) => str;
    static accentBg = (str: string) => str;

    static async init() {
        this.setThemeColors(await Settings.getKopoOption(KopoOptions.theme));
    }

    static setThemeColors(theme: string) {
        this.accent = this.getColorForTheme(theme);
        this.accentBg = this.getBgColorForTheme(theme);
    }

    static getColorForTheme(theme: string) {
        if(theme === "random") {
            return this.themes[random(Object.keys(this.themes).filter(k => k !== 'heavy_random'))[0]].fg;
        } else if(theme === "heavy_random") {
            return (str: string) => this.themes[random(Object.keys(this.themes))[0]].fg(str);
        } else {
            return this.themes[theme].fg || colors.yellow;
        }
    }

    static getBgColorForTheme(theme: string) { // TODO refactor
        if(theme === "random") {
            return this.themes[random(Object.keys(this.themes).filter(k => k !== 'heavy_random'))[0]].bg;
        } else if(theme === "heavy_random") {
            return (str: string) => this.themes[random(Object.keys(this.themes))[0]].bg(str);
        } else {
            return this.themes[theme].bg || colors.yellow;
        }
    }
}