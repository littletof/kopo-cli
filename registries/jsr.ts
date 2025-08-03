import { ModuleInfo, Registry } from "./registry.ts";
import { getFlags } from "../flag_parser.ts";

export class JSRRegistry extends Registry {
    static key = 'jsr';

    override getWellKnownPath(): string {
      return 'https://api.jsr.io/.well-known/openapi'; // https://jsr.io/docs/api-reference
    }

    override getRegistryInfo() {
        return {
            key: JSRRegistry.key,
            name: 'JSR',
            icon: '🟨',
            url: 'https://jsr.io/',
            description: 'The open-source package registry for modern **JavaScript** and **TypeScript**'
        }
    }

    // TODO caching

    override async getModulesList(query?: string, page: number=1, pageSize: number = 20) {
        const response = await this.fetch<JSRModuleListDataType>(
            `https://api.jsr.io/packages?page=${page}&limit=${pageSize}${query? `&query=${query}`: ""}`
        );
        if(!response) {
            return {modules: [], page, pageSize, totalModules: 0, totalPages: 0, query};
        }

        if(query) {
            response.total = response.items.length;
        }

        // TODO what name to use. name is alphabetically ordered, but adding scope messes it up
        return {
            modules: (response.items || []).map(d => ({name: this.getModuleName(d), description: d.description/* , starCount: d.star_count */})),
            query,
            page,
            pageSize,
            totalModules: response.total,
            totalPages: Math.ceil(response.total/pageSize),
        };
    }

    override async getModuleInfo(moduleName: string, version?: string): Promise<ModuleInfo | undefined>{
        // https://api.jsr.io/scopes/denoland/packages/fmt
        const [scope, name] = await this.resolveModuleName(moduleName);

        const moduleInfo = await this.fetch<JSRModuleListDataType['items'][0]>(`https://api.jsr.io/scopes/${scope}/packages/${name}`);

        if(!moduleInfo) {
            return undefined;
        }

        const moduleData: Partial<ModuleInfo> = {origin: JSRRegistry.key};

        const versionInfo = await this.fetch<JSRModuleVersion[] | { code: string, message: string }>(`https://api.jsr.io/scopes/${scope}/packages/${name}/versions`);
        if(!Array.isArray(versionInfo)) {
            return undefined;
        }

        version = version ?? moduleInfo.latestVersion;

        const selectedVersion = versionInfo.find(vi => vi.version == version);

        const invalidVersion = !!version && !versionInfo?.some(vi => vi.version == version);

        moduleData.info = {
            versions: versionInfo?.map(vi => vi.version),
            latestVersion: moduleInfo.latestVersion,
            name: this.getModuleName(moduleInfo),
            description: moduleInfo.description,
            // TODO start_count: -0,// moduleInfo.star_count,
            moduleRoute: `https://jsr.io/@${scope}/${name}${version !== moduleInfo.latestVersion ? `@${version}`: ""}`,
        };
        moduleData.invalidVersion = invalidVersion || (selectedVersion?.yanked ?? false);

        if(!invalidVersion) {
            moduleData.currentVersion = version;

            moduleData.info.repository = `https://github.com/${moduleInfo.githubRepository?.owner}/${moduleInfo.githubRepository?.name}`; // TODO versioned branch as denoland?
            moduleData.uploadedAt = new Date(selectedVersion!.updatedAt);
            moduleData.readmePath = selectedVersion?.readmePath ? `${moduleData.info.moduleRoute}/${selectedVersion.version}${selectedVersion?.readmePath}` : undefined;
            
            if(moduleData.readmePath) {
                const readmeText = await this.fetch<string>(moduleData.readmePath, {text: true, cache: true});
                moduleData.readmeText = readmeText;
                moduleData.flags = getFlags(readmeText || "");
            }

        }

        return moduleData;

    }

    override async getVersionsOfModule(moduleName: string, version?: string): Promise<string[]>{
        const [scope, name] = await this.resolveModuleName(moduleName);
        
        const versionInfo = await this.fetch<JSRModuleVersion[] | { code: string, message: string }>(`https://api.jsr.io/scopes/${scope}/packages/${name}/versions`, { cache: true });
        if(!Array.isArray(versionInfo)) {
            return [];
        }

        return versionInfo.map(vi => vi.version);
    }

    override async getAllModuleNames(): Promise<string[]>{
        throw new Error('TODO: Not implemented yet');
    }

    private async resolveModuleName(moduleName: string) {
        if(!moduleName.includes('@')) {
            const module = await this.getModulesList(moduleName, 0, 1);
            if(module.totalModules) {
                moduleName = module.modules[0].name;
            }
        }
        const [scope, name] = moduleName.replace('@', '').split('/');

        return [scope, name];
    }

    private getModuleName(m: JSRModuleInfo) {
        return `@${m.scope}/${m.name}`
    }

}

interface JSRModuleInfo {
    scope: string;
    name: string;
    description: string;
    /** 2024-04-25T08:16:58.970577Z */
    createdAt: string;
    updatedAt: string;
    runtimeCompat?: {
        browser?: boolean;
        deno?: boolean;
        node?: boolean;
        workerd?: boolean;
        bun?: boolean;
    };
    githubRepository?: {
        id: number;
        owner: string;
        name: string;
        updatedAt: string;
        createdAt: string;
    }
    score?: number;

    versionCount: number;
    dependencyCount: number;
    dependentCount: number;

    latestVersion: string; // without @
    whenFeatured: null;
    isArchived: boolean;
    readmeSource: "jsdoc"; // TODO
}

interface JSRModuleListDataType {
    items: JSRModuleInfo[];
    total: number;
}

interface JSRModuleVersion {
    scope: string;
    package: string;
    version: string;
    user: {
      id: string;
      name: string;
      githubId: 32012862;
      avatarUrl: `https://avatars.githubusercontent.com/u/${number/* githubId */}?v=4`;
      /** "2024-12-07T22:17:37.656563Z" */
      createdAt: string;
      updatedAt: string;
    };
    yanked: boolean;
    usesNpm: boolean;
    newerVersionsCount: number;
    lifetimeDownloadCount: number;
    rekorLogId: null;
    readmePath: `/${string}`;
    /** "2024-12-07T22:17:37.656563Z" */
    createdAt: string;
    updatedAt: string;
}

/* 

{
  "schema": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "scope": {
              "type": "string",
              "pattern": "/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/",
              "description": "The name of a scope. This must not be @ prefixed.",
              "example": "denoland"
            },
            "name": {
              "type": "string",
              "pattern": "/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/",
              "description": "The name of a package.",
              "example": "fmt"
            },
            "description": {
              "type": "string",
              "description": "The description of the package.",
              "example": "A module for formatting strings."
            },
            "runtimeCompat": {
              "type": "object",
              "properties": {
                "browser": {
                  "type": "boolean",
                  "nullable": true,
                  "description": "Whether the package is compatible with web browsers."
                },
                "deno": {
                  "type": "boolean",
                  "nullable": true,
                  "description": "Whether the package is compatible with Deno."
                },
                "node": {
                  "type": "boolean",
                  "nullable": true,
                  "description": "Whether the package is compatible with Node.js."
                },
                "workerd": {
                  "type": "boolean",
                  "nullable": true,
                  "description": "Whether the package is compatible with workerd."
                },
                "bun": {
                  "type": "boolean",
                  "nullable": true,
                  "description": "Whether the package is compatible with Bun."
                }
              }
            },
            "createdAt": {
              "type": "string",
              "format": "date-time",
              "description": "The date and time when the package was created."
            },
            "updatedAt": {
              "type": "string",
              "format": "date-time",
              "description": "The date and time when the package was last updated."
            },
            "githubRepository": {
              "type": "object",
              "properties": {
                "owner": {
                  "type": "string",
                  "description": "The GitHub user / organization of the repository.",
                  "example": "denoland"
                },
                "name": {
                  "type": "string",
                  "description": "The GitHub repository name.",
                  "example": "deno"
                }
              }
            },
            "score": {
              "type": "number"
            }
          },
          "required": [
            "scope",
            "name",
            "description",
            "createdAt",
            "updatedAt"
          ]
        }
      },
      "total": {
        "type": "integer"
      }
    }
  }
}

*/