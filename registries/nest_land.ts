import { getFlags } from "../flag_parser.ts";
import { paginateArray } from "../utils.ts";
import { ModuleInfo, Registry } from "./registry.ts";

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
            origin: NestRegistry.key,
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
                // TODO https://nest.land/api/readme?mod=kopo@v0.1.0
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