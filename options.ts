import { Theme, UI } from "./index.ts";

export interface IOptions {
    isOptionsAvailable(): boolean;
    getOption<T = any>(key: OptionType, def?: T): Promise<T>;
    setOption<T>(key: OptionType, value: T): Promise<void>;
    removeOption(key: OptionType): Promise<void>;
    getAllSetOptions(): Promise<{key: OptionType, value: Object}[] | []>;
    clearAllOptions(): Promise<void>;
}

export class LocalStorageOptions implements IOptions{
    isOptionsAvailable() {
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
        if(!this.isOptionsAvailable()) {
            return def;
        }

        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : def;
    }

    async setOption<T>(key: OptionType, value: T) {
        if(!this.isOptionsAvailable()) {
            return;
        }

        localStorage.setItem(key, JSON.stringify(value));
    }

    async removeOption(key: OptionType) {
        if(!this.isOptionsAvailable()) {
            return;
        }

        localStorage.removeItem(key);
    }

    async getAllSetOptions() {
        if(!this.isOptionsAvailable()) {
            return [];
        }

        return new Array(localStorage.length).fill(0).map((_, i) => localStorage.key(i)!).map(k => ({key: k, value: this.getOption(k)}));
    }

    async clearAllOptions() {
        if(!this.isOptionsAvailable()) {
            return;
        }

        localStorage.clear();
    }
}

export type OptionType = Extract<keyof typeof KopoOptions, string>;

export const KopoOptions: {[key: string]: {name: string, key:string, help?: string, hidden?: boolean, def?: any, valueTf?: (v: any) => string}} = {
    "theme": {key: "theme", name: "Theme", valueTf: (v:string) => Theme.getColorForTheme(v)(v)},
    "cls": {key: "cls", name: "Cls on start"}
}

export class Options {
    static optionsStrategy = new LocalStorageOptions();

    static isOptionsAvailable() {
        return this.optionsStrategy.isOptionsAvailable();
    }

    static async getOption<T = any>(key: OptionType, def?: T) {
        return await this.optionsStrategy.getOption(key, def);
    }

    static async setOption<T>(key: OptionType, value: T) {
        await this.optionsStrategy.setOption(key, value);
    }

    static async removeOption(key: OptionType) {
        await this.optionsStrategy.removeOption(key);
    }

    static async getAllSetOptions() {
        return await this.optionsStrategy.getAllSetOptions();
    }

    static async clearAllOptions() {
        return await this.optionsStrategy.clearAllOptions();
    }
}