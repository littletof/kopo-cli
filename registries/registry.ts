import {paginateArray} from "../utils.ts";
import {getFlags} from "../flag_parser.ts";
import type {Flags} from "../flag_parser.ts";


export interface ModulesListPage {
    modules: {
        name: string;
        description?: string;
        starCount?: number;
        owner?: string;
    }[];
    page: number;
    pageSize: number;
    totalModules: number;
    totalPages: number;
    query?: string;
}
export interface ModuleInfo {
    origin?: string;
    info?: {
        name: string;
        description?: string;
        start_count?: number;
        versions?: string[];
        latestVersion?: string;

        repository?: string;
        moduleRoute?: string;
    },
    invalidVersion?: boolean;
    currentVersion?: string,
    uploadedAt?: Date;
    flags?: Flags;
    readmePath?: string;
    readmeText?: string;
}

export abstract class Registry {
    addonUrl?: string;
    fromSettings?: boolean;

    static cache = new Map<string, unknown>();

    abstract getRegistryInfo(): {name: string, key: string, icon?: string, description?: string, url?: string};
    abstract getWellKnownPath(): string;

    abstract getModulesList(query?: string, page?: number, pageSize?: number): Promise<ModulesListPage>;
    abstract getModuleInfo(moduleName: string, version?: string): Promise<ModuleInfo | undefined>;

    abstract getAllModuleNames(): Promise<string[]>;
    abstract getVersionsOfModule(moduleName: string, version?: string): Promise<string[]>;

    async fetch<T>(path: string, opts?: {cache?: boolean, text?: boolean}): Promise<T|undefined> { // TODO cli flag to overwrite cache --no-cache
        const pathUrl = new URL(path);
        
        if((await Deno.permissions.request({name: "net", host: pathUrl.host})).state !== 'granted') {
            console.error('NO NET');
            return undefined;
        }

        if(opts?.cache && Registry.cache.has(path)) {
            return Registry.cache.get(path) as T;
        }

        try {
            const fetched = await fetch(pathUrl)
            const result = await (opts?.text ? fetched.text() : fetched.json());
            if(opts?.cache) {
                Registry.cache.set(pathUrl.toString(), result);
            }
            return result;
        } catch (e){
            return undefined;
        }
    }

    guessReadmePath(paths: string[]) {
        return paths.map(p => ({original: p, lower: p.toLowerCase()})).sort().find(p => p.lower.includes("readme.md"))?.original;
    }
}