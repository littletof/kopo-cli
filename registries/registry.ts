import {paginateArray} from "../utils.ts";


export interface ModulesListPage {
    modules: any[];
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
    },
    invalidVersion?: boolean;
    currentVersion?: string,
    uploadedAt?: Date;
    flags?: any[];
    readme?: string;
}

export abstract class Registry {
    static cache = new Map<string, unknown>();

    abstract getWellKnownPath(): string;

    abstract getModulesList(query?: string, page?: number, pageSize?: number): Promise<ModulesListPage>;
    abstract getModuleInfo(moduleName: string): Promise<ModuleInfo | undefined>;

    abstract getAllModuleNames(): Promise<string[]>;
    abstract getVersionsOfModule(moduleName: string, version?: string): Promise<string[]>;

    async fetchJSON<T>(path: string, cache?: boolean): Promise<T|undefined> { // TODO cli flag to overwrite cache --no-cache
        const pathUrl = new URL(path);
        
        if((await Deno.permissions.request({name: "net", host: pathUrl.host})).state !== 'granted') {
            console.error('NO NET');
            return undefined;
        }

        if(cache && Registry.cache.has(path)) {
            return Registry.cache.get(path) as T;
        }

        try {
            const result = await ((await fetch(pathUrl)).json());
            if(cache) {
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
    results: {name: string, description?: string, start_count?: number}[]
}
export class DenoRegistry extends Registry {
    getWellKnownPath() {
        return "https://deno.land/.well-known/deno-import-intellisense.json";
    }

    async getAllModuleNames() {
        const response = await this.fetchJSON<string[]>("https://api.deno.land/modules?simple=1", true);
        if(!response) {
            return [];
        }

        return response.concat("std");
    }

    async getVersionsOfModule(moduleName: string) {
        const response = await this.fetchJSON<string[]>(`https://deno.land/_vsc1/modules/${moduleName}`, true);
        if(!response) {
            return [];
        }

        return response;
    }

    async getModulesList(query?: string, page: number=1, pageSize: number = 20) {
        const response = await this.fetchJSON<{success?: boolean; data: DenoModuleListDataType}>(
            `https://api.deno.land/modules?page=${page}&limit=${pageSize}${query? `&query=${query}`: ""}`
        );
        if(!response?.success) {
            return {modules: [], page, pageSize, totalModules: 0, totalPages: 0, query};
        }

        return {
            modules: response.data.results || [],
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

        const moduleInfo = await this.fetchJSON<{success: boolean, data: {name: string, description?: string, star_count?: number}}>(`https://api.deno.land/modules/${moduleName}`);

        if(!moduleInfo || !moduleInfo.success) {
            return undefined;
        }

        const moduleData: Partial<ModuleInfo> = {origin: "DENO"};

        const versionInfo = await this.fetchJSON<{latest: string, versions: string[]}>(`https://cdn.deno.land/${moduleName}/meta/versions.json`);

        version = version ?? (versionInfo?.latest || undefined);

        const invalidVersion = !!version && !versionInfo?.versions.includes(version);

        moduleData.info = {
            versions: versionInfo?.versions,
            latestVersion: versionInfo?.latest,
            name: moduleInfo.data.name,
            description: moduleInfo.data.description,
            start_count: moduleInfo.data.star_count,
        };
        moduleData.invalidVersion = invalidVersion;

        if(!invalidVersion) {
            moduleData.currentVersion = version;

            const metaInfo = await this.fetchJSON<
                {uploaded_at: string, upload_options: {type: string, repository: string, ref: string}, directory_listing: {path: string, size: number, type: "file" | "dir"}[]}
            >(`https://cdn.deno.land/${moduleName}/versions/${version}/meta/meta.json`);

            if(metaInfo) {
                moduleData.info.repository = metaInfo.upload_options?.repository;
                moduleData.uploadedAt = new Date(metaInfo.uploaded_at);

                const readme = this.guessReadmePath(metaInfo.directory_listing.filter(dl => dl.type === "file").map(f => f.path));
                moduleData.readme = readme;
                // TODO readme
            }

        }

        return moduleData;
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
    getWellKnownPath() {
        return "https://intellisense.nest.land/deno-import-intellisense.json";
    }

    async getAllModuleNames() {
        const response = await this.fetchJSON<string[]>("https://intellisense.nest.land/api/x", true);
        if(!response) {
            return [];
        }

        return response.concat("std");
    }

    async getVersionsOfModule(moduleName: string) {
        const response = await this.fetchJSON<string[]>(`https://intellisense.nest.land/api/x/${moduleName}`, true);
        if(!response) {
            return [];
        }

        return response;
    }

    async getModulesList(query?: string, page: number=1, pageSize: number = 20) {
        const response = await this.fetchJSON<NestModuleInfo[]>(`https://x.nest.land/api/packages`, true);

        if(!response) {
            return {modules: [], page, pageSize, totalModules: 0, totalPages: 0, query};
        }

        const filteredModules = query ? response.filter(m => (m.name as string)?.indexOf(query) !== -1 || m.description?.indexOf(query) !== -1)
                                        : response;
        const modulesOnPage = paginateArray(filteredModules, page, pageSize);

        return {
            modules: modulesOnPage || [],
            query,
            page,
            pageSize,
            totalModules: response.length,
            totalPages: Math.ceil(response.length/pageSize),
        };
    }
    async getModuleInfo(moduleName: string, version?: string) {
        const moduleInfo = await this.fetchJSON<NestModuleInfo>(`https://x.nest.land/api/package/${moduleName}`);
        // could use https://intellisense.nest.land/api/x/MODULE, but thats one extra ...

        if(!moduleInfo) {
            return undefined;
        }

        const moduleData: Partial<ModuleInfo> = {
            origin: "NEST",
            info: {
                name: moduleInfo.name,
                description: moduleInfo.description,
                versions: moduleInfo.packageUploadNames?.map(pn => pn.split("@")[1]),
                latestVersion: moduleInfo.latestVersion?.split("@")[1],
                repository: moduleInfo.repository
            }
        };

        version = version ?? (moduleData.info?.latestVersion || undefined);
        const invalidVersion = !!version && !moduleData.info?.versions?.includes(version);

        moduleData.invalidVersion = invalidVersion;

        if(!invalidVersion) {
            moduleData.currentVersion = version;

            const versionInfo = await this.fetchJSON<NestModuleVersionInfo>(`https://x.nest.land/api/package/${moduleName}/${version}`);
            
            if(versionInfo) {
                moduleData.uploadedAt = new Date(versionInfo.package.createdAt);
                moduleData.readme = this.guessReadmePath(Object.keys(versionInfo.files).map(k => versionInfo.files[k].inManifest));
            }
        }



        return moduleData;
    }
}

{
    const dr = new DenoRegistry();

    const d = await dr.getModuleInfo("kopo");
    console.log(d);

    const nr = new NestRegistry();

    const n = await nr.getModuleInfo("kopo");
    console.log(n);
}