import { Theme } from "./theme.ts";

export interface ISettings {
    isSettingsAvailable(): boolean;
    getOption<T = any>(key: OptionType, def?: T): Promise<T>;
    setOption<T>(key: OptionType, value: T): Promise<void>;
    removeOption(key: OptionType): Promise<void>;
    getAllSetOptions(): Promise<{key: OptionType, value: Object}[] | []>;
    clearAllOptions(): Promise<void>;
}

export class LocalStorageSettings implements ISettings{
    isSettingsAvailable() {
        return this.hasLocationFlag();
    }

    hasLocationFlag() {
        try {
            const a = location.href;
            return true;
        } catch {
            return false;
        }
    }

    async getOption<T = any>(key: OptionType, def?: T) {
        if(!this.isSettingsAvailable()) {
            return def;
        }

        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : def;
    }

    async setOption<T>(key: OptionType, value: T) {
        if(!this.isSettingsAvailable()) {
            return;
        }

        localStorage.setItem(key, JSON.stringify(value));
    }

    async removeOption(key: OptionType) {
        if(!this.isSettingsAvailable()) {
            return;
        }

        localStorage.removeItem(key);
    }

    async getAllSetOptions() {
        if(!this.isSettingsAvailable()) {
            return [];
        }

        return await Promise.all(new Array(localStorage.length).fill(0).map((_, i) => localStorage.key(i)!).map(async k => ({key: k, value: await this.getOption(k)})));
    }

    async clearAllOptions() {
        if(!this.isSettingsAvailable()) {
            return;
        }

        localStorage.clear();
    }
}

export interface OptionConf {
    name: string;
    key:string;
    help?: string;
    /** To hide in settings page  */
    hidden?: boolean;
    def?: any;
    /** value transformer  */
    valueTf?: (v: any) => string;
    valueSet?: any[];
    onChange?: (nv: any) => Promise<void>;
}

export type OptionType = Extract<keyof typeof KopoOptions, string>;

export function booleanOption(options: OptionConf & {valueSet?: never, valueTf?: never}): OptionConf {
    return {...options, valueSet: [true, false], valueTf: v => v ? Theme.colors.green('true') : Theme.colors.gray('false')}
}

export const KopoOptions: {[key: string]: OptionConf} = {
    "theme": {key: "theme", name: "Theme", def: "blue", valueTf: (v:string) => Theme.getColorForTheme(v)(v), valueSet: Object.keys(Theme.themes), onChange: async v => await Theme.init()},
    "cls": booleanOption({key: "cls", name: "Cls on start", def: true, help: "When set to `true`, the console is cleared on start.\nSame as a `cls` command."}),
    "rawreadme": booleanOption({key: "rawreadme", name: "Print raw readme", def: false}),
    "pagesize": {key: "pagesize", name: "Page size", def: 10, valueSet: [5, 10, 25, 50, 100], help: "This defines, how many modules should appear on one page, when\nbrowsing or searching modules.\nOnly change this, if you have enough vertical terminal space."},

    "registries": {key: "registries", name: "Registries", hidden: true, def: {}},
    "registry_addons": {key: "registry_addons", name: "Registry addons", def: [], valueSet: [], valueTf: v => v?.length ? `${v?.length} addons`: 'No addons'},

    // UNSTABLE

    "winprint": booleanOption({key: "winprint", name: "Windows print", def: false, hidden: true, help: "unstable. Changes stdout to console log, so special charactes print correctly on windows"}),
}

export class Settings {
    static settingsStrategy = new LocalStorageSettings();

    static isSettingsAvailable() {
        return this.settingsStrategy.isSettingsAvailable();
    }

    // TODO vet
    static async getKopoOption(opt: OptionConf) {
        return await Settings.getOption(opt.key, opt.def);
    }

    static async getOption<T = any>(key: OptionType, def?: T) {
        return await this.settingsStrategy.getOption(key, def);
    }

    static async setOption<T>(key: OptionType, value: T) {
        await this.settingsStrategy.setOption(key, value);
    }

    static async removeOption(key: OptionType) {
        await this.settingsStrategy.removeOption(key);
    }

    static async getAllSetOptions() {
        return await this.settingsStrategy.getAllSetOptions();
    }

    static async clearAllOptions() {
        return await this.settingsStrategy.clearAllOptions();
    }
}