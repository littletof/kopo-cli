import { colors } from "../deps.ts";
import { Registry } from "../registries/registry.ts";

export class TestRegistry extends Registry {
    static key = 'test';

    getWellKnownPath() {
        return "random";
    }

    getRegistryInfo() {
        return {
            key: TestRegistry.key,
            name: colors.magenta('TEST/x'),
            icon: '🐛',
            url: 'https://test.land',
            description: '`TEST ADDON REGISTRY`'
        }
    }

    async getAllModuleNames() {
        return ['test1', 'test2'];
    }

    async getVersionsOfModule(moduleName: string) {
        return ['1', '2', '3']
    }

    async getModulesList(query?: string, page: number=1, pageSize: number = 20) {
        return {
            modules: [
                {
                    name: 'testmodule',
                    description: 'nincs',
                    starCount: 5,
                    owner: 'me',
                }
            ],  
            page: 1,
            pageSize: 1,
            totalModules: 1,
            totalPages: 1,
        }
    }

    async getModuleInfo(moduleName: string, version?: string) {
        return {
            origin: "TEST" as any,
            info: {
                name: 'testt',
                description: 'testt',
                start_count: 5,
                versions: ['testt'],
                latestVersion: 'testt',

                repository: 'testt',
                moduleRoute: 'testt',
                // importRoute: 'testt',
            },
            invalidVersion: false,
            currentVersion: 'testt',
            uploadedAt: new Date(),
            readmePath: 'testt',
            readmeText: 'testt',
        }
    }

    private getRepositoryPath(upload_options?: {type: string, repository: string, ref: string}, version?: string): string | undefined {
        return 'semmi';
    }
}

export function getAddonRegistry() {
    return new TestRegistry();
}