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
    origin?: "DENO" | "NEST";
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

export interface DenoModuleListDataType {
    total_count: number;
    options: {limit?: number, page?: number, sort?: string};
    results: {name: string, description?: string, star_count?: number, search_score?: number}[]
}
export class DenoRegistry extends Registry {
    static key = 'deno';

    getWellKnownPath() {
        return "https://deno.land/.well-known/deno-import-intellisense.json";
    }

    getRegistryInfo() {
        return {
            key: DenoRegistry.key,
            name: 'deno.land/x',
            icon: '🦕',
            url: 'https://deno.land/x',
            description: '`deno.land/x` is a hosting service for Deno scripts.\nIt caches releases of open source modules stored on `GitHub` and serves them at one easy to remember domain.'
        }
    }

    async getAllModuleNames() {
        const response = await this.fetch<string[]>("https://api.deno.land/modules?simple=1", {cache: true});
        if(!response) {
            return [];
        }

        return response.concat("std");
    }

    async getVersionsOfModule(moduleName: string) {
        const response = await this.fetch<string[]>(`https://deno.land/_vsc1/modules/${moduleName}`, {cache: true});
        if(!response) {
            return [];
        }

        return response;
    }

    async getModulesList(query?: string, page: number=1, pageSize: number = 20) {
        const response = await this.fetch<{success?: boolean; data: DenoModuleListDataType}>(
            `https://api.deno.land/modules?page=${page}&limit=${pageSize}${query? `&query=${query}`: ""}`
        );
        if(!response?.success) {
            return {modules: [], page, pageSize, totalModules: 0, totalPages: 0, query};
        }

        if(query) {
            response.data.total_count = response.data.results.length;
        }

        return {
            modules: (response.data.results || []).map(d => ({name: d.name, description: d.description, starCount: d.star_count})),
            query,
            page,
            pageSize,
            totalModules: response.data.total_count,
            totalPages: Math.ceil(response.data.total_count/pageSize),
        };
    }

    async getModuleInfo(moduleName: string, version?: string) {
        
        // https://cdn.deno.land/MODULE/meta/versions.json -> {latest, versions:[]} // https://deno.land/_vsc1/modules/MODULE
        // https://api.deno.land/modules/MODULE -> sima info desc, name, star_count
        // https://cdn.deno.land/MODULE/versions/v0.3.0/meta/meta.json -> {uploaded_at, upload_options: {type: github, repository: "denosaurs/cache", ref: "0.2.12"}, directory_listing: {path: "/cache.ts", size: 2240, type: "file/dir"}[]}
        // https://cdn.deno.land/MODULE/versions/v0.3.0/raw/README.md

        const moduleInfo = await this.fetch<{success: boolean, data: {name: string, description?: string, star_count?: number}}>(`https://api.deno.land/modules/${moduleName}`);

        if(!moduleInfo || !moduleInfo.success) {
            return undefined;
        }

        const moduleData: Partial<ModuleInfo> = {origin: "DENO"};

        const versionInfo = await this.fetch<{latest: string, versions: string[]}>(`https://cdn.deno.land/${moduleName}/meta/versions.json`);

        version = version ?? (versionInfo?.latest || undefined);

        const invalidVersion = !!version && !versionInfo?.versions.includes(version);

        moduleData.info = {
            versions: versionInfo?.versions,
            latestVersion: versionInfo?.latest,
            name: moduleInfo.data.name,
            description: moduleInfo.data.description,
            start_count: moduleInfo.data.star_count,
            moduleRoute: `https://deno.land/x/${moduleName}${version!== versionInfo?.latest ? `@${version}`: ""}`,
        };
        moduleData.invalidVersion = invalidVersion;

        if(!invalidVersion) {
            moduleData.currentVersion = version;

            const metaInfo = await this.fetch<
                {uploaded_at: string, upload_options: {type: string, repository: string, ref: string}, directory_listing: {path: string, size: number, type: "file" | "dir"}[]}
            >(`https://cdn.deno.land/${moduleName}/versions/${version}/meta/meta.json`);

            if(metaInfo) {
                moduleData.info.repository = this.getRepositoryPath(metaInfo.upload_options, version !== versionInfo?.latest ? version : undefined);
                moduleData.uploadedAt = new Date(metaInfo.uploaded_at);

                const readmePath = this.guessReadmePath(metaInfo.directory_listing.filter(dl => dl.type === "file").map(f => f.path));
                if(readmePath) {
                    moduleData.readmePath = readmePath;
    
                    const readmeText = await this.fetch<string>(`https://cdn.deno.land/${moduleName}/versions/${version}/raw${readmePath}`, {text: true, cache: true});
                    moduleData.readmeText = readmeText;
                    moduleData.flags = getFlags(readmeText || "");
                }
            }

        }

        return moduleData;
    }

    private getRepositoryPath(upload_options?: {type: string, repository: string, ref: string}, version?: string): string | undefined {
        if(!upload_options) {
            return;
        }

        switch(upload_options.type) {
            case "github": return `https://github.com/${upload_options.repository}${version ? `/tree/${version}` : ''}`
            default: return `${upload_options.type} - ${upload_options.repository}`;
        }
    }
}
export interface NestModuleInfo {
    name: string,
    normalizedName: string,
    owner: string,
    description?: string,
    repository?: string,
    latestVersion?: string,
    latestStableVersion?: string,
    packageUploadNames?: string[],
    locked?: boolean,
    malicious?: boolean,
    unlisted: boolean,
    updatedAt: string,
    createdAt: string
}
export interface NestModuleVersionInfo {
    name: string;
    package: {
        name: string;
        owner: string;
        description: string;
        createdAt: string;

    };
    entry: string;
    version: string;
    prefix: string;
    malicious: unknown;
    files: {[key: string]: {inManifest: string, txId: string}};
}
export class NestRegistry extends Registry {
    static key = 'nest';

    getWellKnownPath() {
        return "https://intellisense.nest.land/deno-import-intellisense.json";
    }

    getRegistryInfo() {
        return {
            key: NestRegistry.key,
            name: 'x.nest.land',
            icon: '🥚',
            url: 'https://nest.land',
            description: `Nest.land combines \`Deno\` with the \`Arweave\`.\nHere you can publish your Deno modules to the permaweb, where they can never be deleted.\nThis avoids a major pitfall for web-based module imports while allowing developers to leverage Deno's import design!`
        }
    }

    async getAllModuleNames() {
        const response = await this.fetch<string[]>("https://intellisense.nest.land/api/x", {cache: true});
        if(!response) {
            return [];
        }

        return response.concat("std");
    }

    async getVersionsOfModule(moduleName: string) {
        const response = await this.fetch<string[]>(`https://intellisense.nest.land/api/x/${moduleName}`, {cache: true});
        if(!response) {
            return [];
        }

        return response;
    }

    async getModulesList(query?: string, page: number=1, pageSize: number = 20) {
        const allNestModules = await this.fetch<NestModuleInfo[]>(`https://x.nest.land/api/packages`, {cache: true});

        if(!allNestModules) {
            return {modules: [], page, pageSize, totalModules: 0, totalPages: 0, query};
        }

        const filteredModules = query ? allNestModules.filter(m => m.name?.includes(query) || m.description?.includes(query))
                                        : allNestModules;
        const modulesOnPage = paginateArray(filteredModules, page, pageSize);

        const count = query ? modulesOnPage.length : allNestModules.length;

        return {
            modules: (modulesOnPage || []).map(d => ({name: d.name, description: d.description, owner: d.owner})),
            query,
            page,
            pageSize,
            totalModules: count,
            totalPages: Math.ceil(count/pageSize),
        };
    }
    async getModuleInfo(moduleName: string, version?: string) {
        const moduleInfo = await this.fetch<NestModuleInfo>(`https://x.nest.land/api/package/${moduleName}`);
        // could use https://intellisense.nest.land/api/x/MODULE, but thats one extra ...

        if(!moduleInfo) {
            return undefined;
        }

        const latestVersion = moduleInfo.latestVersion?.split("@")[1];
        version = version ?? (latestVersion || undefined);

        const moduleData: Partial<ModuleInfo> = {
            origin: "NEST",
            info: {
                name: moduleInfo.name,
                description: moduleInfo.description,
                versions: moduleInfo.packageUploadNames?.map(pn => pn.split("@")[1]),
                latestVersion: latestVersion,
                repository: moduleInfo.repository,
                moduleRoute: `https://nest.land/package/${moduleName}`
            }
        };

        const invalidVersion = !!version && !moduleData.info?.versions?.includes(version);

        moduleData.invalidVersion = invalidVersion;

        if(!invalidVersion) {
            moduleData.currentVersion = version;

            const versionInfo = await this.fetch<NestModuleVersionInfo>(`https://x.nest.land/api/package/${moduleName}/${version}`);
            
            if(versionInfo) {
                moduleData.uploadedAt = new Date(versionInfo.package.createdAt);
                moduleData.readmePath = this.guessReadmePath(Object.keys(versionInfo.files).map(k => versionInfo.files[k].inManifest));
                // TODO https://nest.land/api/readme?mod=kopo@v0.0.3
                if(moduleData.readmePath) {
                    const readmeText = await this.fetch<string>(`https://x.nest.land/${moduleName}@${version}${moduleData.readmePath}`, {text: true, cache: true});
                    moduleData.readmeText = readmeText;
                    moduleData.flags = getFlags(readmeText || "");
                }
            }
        }



        return moduleData;
    }
}

/* {
    const dr = new DenoRegistry();

    const d = await dr.getModulesList("kopo");
    console.log(d);

    const nr = new NestRegistry();

    const n = await nr.getModulesList("kopo");
    console.log(n);
} */