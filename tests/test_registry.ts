import { Registry } from "../registries/registry.ts";

export class TestRegistry extends Registry {
    static key = 'test_registry';

    getWellKnownPath() {
        return "test_wellknown";
    }

    getRegistryInfo() {
        return {
            key: TestRegistry.key,
            name: 'Test registry',
            icon: '🐛',
            url: 'https://test.land',
            description: '`TEST ADDON REGISTRY`'
        }
    }

    async getAllModuleNames() {
        return ['test1', 'test2', 'test3', 'test4'];
    }

    async getVersionsOfModule(moduleName: string) {
        return ['v1', 'v2', 'v3']
    }

    async getModulesList(query?: string, page: number=1, pageSize: number = 20) {
        return {
            modules: [
                { name: 'test1', description: 'test1 description', starCount: 10, owner: 'me' },
                { name: 'test2', description: 'test2 description', starCount: 20, owner: 'me' },
                { name: 'test3', description: 'test3 description', starCount: 30, owner: 'me' },
                { name: 'test4', description: 'test4 description', starCount: 40, owner: 'me' },
            ],  
            page: 1,
            pageSize: 1,
            totalModules: 4,
            totalPages: 1,
        }
    }

    async getModuleInfo(moduleName: string, version?: string) {
        if(!['test1','test2','test3','test4'].includes(moduleName)) {
            return undefined;
        }

        return {
            origin: TestRegistry.key,
            info: {
                name: moduleName,
                description: moduleName + " descrition",
                start_count: 5,
                versions: ['v1', 'v2', 'v3'],
                latestVersion: 'v3',

                repository: 'https://test.repo',
                moduleRoute: 'https://x/test.repo',
                // importRoute: 'testt',
                flags: {
                    required: [{flag: "--unstable", description: "needed"}],
                    optional: [{flag: "--location", description: "optional"}],
                }
            },
            invalidVersion: false,
            currentVersion: 'testt',
            uploadedAt: new Date(2021,7,27,12,34),
            readmePath: 'testt',
            readmeText: 'testt',
        }
    }

    private getRepositoryPath(upload_options?: {type: string, repository: string, ref: string}, version?: string): string | undefined {
        return 'none';
    }
}

export function getAddonRegistry() {
    return new TestRegistry();
}