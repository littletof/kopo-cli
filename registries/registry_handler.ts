import { KopoOptions, Settings } from "../settings.ts";
import { DenoRegistry, NestRegistry, Registry } from "./registry.ts";

export class RegistryHandler {
    static readonly registries = {
        [DenoRegistry.key]: new DenoRegistry(),
        [NestRegistry.key]: new NestRegistry()
    }

    static getRegistry(key: string): Registry {
        return (this.registries as any)[key];
    }

    static getAllRegistries() {
        // TODO handle Deno.args + {disabled}
        return Object.values(RegistryHandler.registries);
    }

    static async getRegistries() {
        // TODO handle Deno.args
        const selectedRegistries = await Settings.getKopoOption(KopoOptions.registries);

        Object.keys(selectedRegistries).filter(r => selectedRegistries[r]).map(r => (RegistryHandler.registries as any)[r]);
    }
}