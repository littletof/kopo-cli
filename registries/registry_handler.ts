import { Args, parse } from "../deps.ts";
import { KopoOptions, Settings } from "../settings.ts";
import { UI } from "../ui.ts";
import { DenoRegistry } from "./deno_land.ts";
import { NestRegistry } from "./nest_land.ts";
import { Registry } from "./registry.ts";

export class RegistryHandler {
    static readonly registries: {[key: string]: Registry} = {
        [DenoRegistry.key]: new DenoRegistry(),
        [NestRegistry.key]: new NestRegistry()
    }

    static async initRegistries(args: Args) {
        const registryAddonsFromSettings = await Settings.getKopoOption(KopoOptions.registry_addons);
        const loadedRegistryAddons = (await RegistryHandler.loadRegistriesFromUrl(registryAddonsFromSettings)).map(la => {la.fromSettings = true; return la});

        const cliRegistries = this.getRegistriesListFromArgs(Deno.args) || {addons:[]};
        const loadedCliRegistries = await RegistryHandler.loadRegistriesFromUrl(cliRegistries.addons);

        [...loadedRegistryAddons, ...loadedCliRegistries].forEach(addon => this.registries[addon.getRegistryInfo().key] = addon);
    }

    static getRegistry(key: string): Registry {
        return (this.registries as any)[key];
    }

    static async getAllRegistries() {
        return Object.values(RegistryHandler.registries);
    }

    static async getRegistries() {
        const allRegistries = await this.getAllRegistries();

        const registriesInSettings = await Settings.getKopoOption(KopoOptions.registries);
        const registryIsNonDisabled = (registry: Registry) => {
            return registriesInSettings[registry.getRegistryInfo().key] !== false;
        }
        
        const cliRegisties = this.getRegistriesListFromArgs(Deno.args);
        const registryAddedFromCli = (registry: Registry) => {
            return cliRegisties?.keys.includes(registry.getRegistryInfo().key) 
                || (registry.addonUrl && cliRegisties?.addons.includes(registry.addonUrl));
        }

        return allRegistries.filter(r => cliRegisties ? registryAddedFromCli(r) : registryIsNonDisabled(r));
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

    private static async loadRegistriesFromUrl(urls: string[]) {
        const addons: Registry[] = (await Promise.all(urls.map(async (raUrl: string, i: number) => {
            try {
                const addon = await import(raUrl);
                return Object.assign(addon.getAddonRegistry(),{addonUrl: raUrl});
            } catch(e) {
                console.log(e, `Cant import addon from: ${raUrl}`);
            }
        })) as Registry[]).filter((addon: Registry) => !!addon);

        return addons;
    }

    private static getRegistriesListFromArgs(args: string[]): {addons: string[]; keys: string[]} | undefined {
        const parsedArgs = parse(args, {alias: {r: "registries"}});
        if(parsedArgs.registries) {
            return this.getRegistriesListFromFlag(parsedArgs.registries);
        }
        return undefined;
    }

    private static getRegistriesListFromFlag(regs: string | string[] | true): {addons: string[]; keys: string[]} {
        const groupedRegistries: {addons: string[]; keys: string[]} = {addons: [], keys: []};

        if(typeof regs === 'boolean') {
            throw new Error('Needs registry keys or addon paths, when providing --registries flag');
        }
        const cliRegs = Array.isArray(regs) ? regs : regs.split(',');

        cliRegs.forEach(reg => {
            try {
                new URL(reg);
                groupedRegistries.addons.push(reg);
            } catch {
                groupedRegistries.keys.push(reg);
            }
        })

        return groupedRegistries;
    }
}