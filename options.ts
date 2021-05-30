export class LocalStorageOptions {
    static isOptionsAvailable() {
        return this.hasLocationFlag();
    }

    static hasLocationFlag() {
        try {
            const a = location.href;
            return true;
        } catch {
            return false;
        }
    }

    static async getOption<T = any>(key: string, def?: T) {
        if(!this.isOptionsAvailable()) {
            return def;
        }

        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : def;
    }

    static async setOption<T>(key: string, value: T) {
        if(!this.isOptionsAvailable()) {
            return;
        }

        localStorage.setItem(key, JSON.stringify(value));
    }

    static async removeOption(key: string) {
        if(!this.isOptionsAvailable()) {
            return;
        }

        localStorage.removeItem(key);
    }

    static async getAllSetOptions() {
        if(!this.isOptionsAvailable()) {
            return [];
        }

        return new Array(localStorage.length).fill(0).map((_, i) => localStorage.key(i)!).map(k => ({key: k, value: localStorage.getItem(k)}));
    }

    static async clearAllOptions() {
        if(!this.isOptionsAvailable()) {
            return [];
        }

        localStorage.clear();
    }
}

export class Options {
    static optionsStrategy = LocalStorageOptions;


    static isOptionsAvailable() {
        return this.optionsStrategy.isOptionsAvailable();
    }

    static async getOption<T = any>(key: string, def?: T) {
        return await this.optionsStrategy.getOption(key, def);
    }

    static async setOption<T>(key: string, value: T) {
        await this.optionsStrategy.setOption(key, value);
    }

    static async removeOption(key: string) {
        await this.optionsStrategy.removeOption(key);
    }

    static async getAllSetOptions() {
        return await this.optionsStrategy.getAllSetOptions();
    }

    static async clearAllOptions() {
        return await this.optionsStrategy.clearAllOptions();
    }
}