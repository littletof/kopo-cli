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

        const moduleData: Partial<ModuleInfo> = {origin: DenoRegistry.key};

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