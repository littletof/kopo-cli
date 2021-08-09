import { KopoOptions, Settings } from "../settings.ts";
import { UI } from "../ui.ts";
import { DenoRegistry, NestRegistry, Registry } from "./registry.ts";

export class RegistryHandler {
    static readonly registries: {[key: string]: Registry} = {
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

        return Object.keys(selectedRegistries).filter(r => selectedRegistries[r]).map(r => (RegistryHandler.registries)[r]);
    }

    static async getRegistryWithSelector(): Promise<Registry | undefined> {
        const availableRegistries = await RegistryHandler.getRegistries();

        if(!availableRegistries.length) {
            console.log('NO registries available. Check your registry settings!'); // TODO or flags
        }

        let selectedRegistry;
        if(availableRegistries.length > 1) {
            const selected: string = await UI.selectList({
                message:'Select a registry to browse',
                options: [
                    ...availableRegistries.map((r, i) => {
                        const reg = r.getRegistryInfo();
                        return UI.selectListOption({name: `${reg.name}`, value: `${i}`});
                    }),
                    UI.listOptions.separator,
                    UI.listOptions.back
                ]
            });
            UI.clearLine();

            if(!UI.listOptions.back.is(selected)) {
                selectedRegistry = availableRegistries[selected as any];
            }
        } else {
            selectedRegistry = availableRegistries[0];
        }

        return selectedRegistry;
    }
}