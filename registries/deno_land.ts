import { getFlags } from "../flag_parser.ts";
import { Registry,ModuleInfo } from "./registry.ts";

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
        const response = await this.fetch<DenoApiV2ModuleInfo[]>("https://apiland.deno.dev/v2/modules", {cache: true});
        if(!response) {
            return [];
        }

        return response.map(module => module.name).concat("std");
    }

    async getVersionsOfModule(moduleName: string) {
        const response = await this.fetch<DenoApiV2ModuleDetail>(`https://apiland.deno.dev/v2/modules/${moduleName}`, {cache: true});
        if(!response) {
            return [];
        }

        return response.versions;
    }

    async getModulesList(query?: string, page: number=1, pageSize: number = 20) {
        if(query) {
            const queried = await this.fetch<{items: string[], isIncomplete: boolean}>(
                `https://apiland.deno.dev/completions/items/${query}`, { cache: true }
            );
            const all = await Promise.all((queried?.items ?? []).map(async i => {
                return { name: i, description: (await this.fetch<{kind: string, value: string}>(
                    `https://apiland.deno.dev/completions/resolve/${i}`, { cache: true }
                ))!.value.split('\n\n')[1]}
            }));
            return {modules: all.slice((page-1)*pageSize, page*pageSize), page, pageSize, totalModules: all.length, totalPages: Math.ceil(all.length/pageSize), query};
        }


        const response = await this.fetch<DenoApiV2ModulesList>(
            `https://apiland.deno.dev/v2/modules?page=${page}&limit=${pageSize}`
        );
        if(!response) {
            return {modules: [], page, pageSize, totalModules: 0, totalPages: 0, query};
        }

        // Total count is no longer in API, so get it from module paginator from the page...
        const xPage = await this.fetch<string>('https://deno.land/x', { text: true, cache: true }) || '';
        const totalModulesMatch = /<span class="font-bold">\d+<\/span> to <span class="font-bold">\d+<\/span> of <span class="font-bold">(\d+)<\/span>/.exec(xPage);
        const totalModules = +(totalModulesMatch?.[1] || 8000);

        return {
            modules: (response.items || []).map(d => ({name: d.name, description: d.description, starCount: d.star_count})),
            query,
            page,
            pageSize,
            totalModules: totalModules,
            totalPages: Math.ceil(totalModules/pageSize),
        };
    }

    async getModuleInfo(moduleName: string, version?: string) {
        
        // https://cdn.deno.land/MODULE/meta/versions.json -> {latest, versions:[]} // https://deno.land/_vsc1/modules/MODULE
        // https://api.deno.land/modules/MODULE -> sima info desc, name, star_count
        // https://cdn.deno.land/MODULE/versions/v0.3.0/meta/meta.json -> {uploaded_at, upload_options: {type: github, repository: "denosaurs/cache", ref: "0.2.12"}, directory_listing: {path: "/cache.ts", size: 2240, type: "file/dir"}[]}
        // https://cdn.deno.land/MODULE/versions/v0.3.0/raw/README.md

        const moduleInfo = await this.fetch<DenoApiV2ModuleDetail>(`https://apiland.deno.dev/v2/modules/${moduleName}`);

        if(!moduleInfo) {
            return undefined;
        }

        const moduleData: Partial<ModuleInfo> = {origin: DenoRegistry.key};

        const versionInfo = await this.fetch<{latest: string, versions: string[]}>(`https://cdn.deno.land/${moduleName}/meta/versions.json`);

        version = version ?? (versionInfo?.latest || undefined);

        const invalidVersion = !!version && !versionInfo?.versions.includes(version);

        moduleData.info = {
            versions: versionInfo?.versions,
            latestVersion: versionInfo?.latest,
            name: moduleInfo.name,
            description: moduleInfo.description,
            start_count: moduleInfo.star_count,
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

interface DenoApiV2ModuleInfo {
    latest_version: string;
    versions: string[];
    name:string;
    description:string;
    star_count:number;
    tags:[{kind:"popularity",value:"top_1_percent"}],
    popularity_score:number;
}

interface DenoApiV2ModuleDetail {
    latest_version:string;
    versions: string[];
    name: string;
    description: string;
    star_count: number;
    popularity_score: number;
    tags: unknown[]; // TODO
    upload_options: { 
        /** version string */
        ref: string;
        type: "github";
        repository: string;
    };
}

interface DenoApiV2ModulesList {
    next?: `/modules?limit=${number}&page=${number}`,
    previous?: `/modules?limit=${number}&page=${number}`,
    items: DenoApiV2ModuleInfo[]
}