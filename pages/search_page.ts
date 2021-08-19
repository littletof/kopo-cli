import { Args } from "../deps.ts";
import { Registry } from "../registries/registry.ts";
import { RegistryHandler } from "../registries/registry_handler.ts";
import { Theme } from "../theme.ts";
import { UI } from "../ui.ts";
import { backspace } from "../utils.ts";
import { BrowsePage } from "./browse_page.ts";
import { ModulePage } from "./module_page.ts";

export class SearchPage {
    static async show(args: Args, options?: {searchTerm?: string, exact?: boolean, registries?: Registry[], version?: string}): Promise<void> {
        options = Object.assign({}, options);

        if(!options.searchTerm) {
            options.searchTerm = await UI.input({
                message: 'KOPO CLI - Search - Enter search term'
            });

            if(!options.searchTerm) {
                return;
            }

            options.version = options.searchTerm.split("@")?.[1];
            options.searchTerm = options.searchTerm.split("@")?.[0];
        }

        UI.cls();
        const searchIndicator = `Searching for [${Theme.accent(options.searchTerm)}${options.version? ` @ ${options.version}`: ''}]...`;
        console.log( searchIndicator + backspace(searchIndicator.length) + `\x1B[${1}A`);

        await this.showSearchResult(args, options as any);
    }

    static async showSearchResult(args: Args, options: {searchTerm: string, exact?: boolean, registries?: Registry[], version?: string}): Promise<void> {
        const registries = options.registries ?? await RegistryHandler.getRegistries();

        const exactMatches = (await Promise.all(registries.map(async registry => {
            const moduleInfo = await registry.getModuleInfo(options.searchTerm, options.version);
            if(!moduleInfo) {
                return undefined;
            }

            return {
                registry,
                result: moduleInfo
            }
        }))).filter(res => !!res);

        
        // one registry and no exact match -> browse
        if(exactMatches.length === 0 && registries.length === 1) {
            return await BrowsePage.showBrowsePage(registries[0], args, {query: options.searchTerm});
        }

        const exactOpts = exactMatches.map(r => ({result: r, ...UI.selectListOption({
            name: `${r?.registry.getRegistryInfo().name} - ${r?.result.info?.name}${` @ ${r!.result.invalidVersion ? r?.result.info?.latestVersion : r?.result.currentVersion}`}`,
            value: r?.registry.getRegistryInfo().key,
        })}))
        .filter(r => !r.result?.result.invalidVersion); // when searching with version, only show exact version matches. TODO rework, show module, with not exact version

        const browseRegistryOptions = registries.map(r => ({registry: r, ...UI.selectListOption({name: r.getRegistryInfo().name, value: `kopo_browse_${r.getRegistryInfo().key}`})}));

        const finalOptions = [];
        if(!options.exact) {
            finalOptions.push(
                UI.listOptions.disabled(Theme.colors.white(Theme.colors.bold(backspace(2) + 'Exact matches:'))),
                ...(exactOpts.length > 0 ? exactOpts : [UI.listOptions.disabled('No exact matches...')]),

                UI.listOptions.empty,
                UI.listOptions.disabled(Theme.colors.white(Theme.colors.bold(backspace(2) + 'Search similar modules in:'))),
                ...browseRegistryOptions,
            );
        } else {
            // only exact matches, without headers
            finalOptions.push(...(exactOpts.length > 0 ? exactOpts : [UI.listOptions.disabled('No exact matches...')]));
        }

        const selected = await UI.selectList({
            message: `KOPO CLI - ${registries.length === 1? `${registries[0].getRegistryInfo().name} - ` : ''}Search for: ${Theme.accent(options.searchTerm)}${options.version? ` @ ${options.version}`: ''}`,
            options: [
                UI.listOptions.empty,
                ...finalOptions,

                UI.listOptions.empty,
                UI.listOptions.separator,
                UI.listOptions.back
            ],
        });

        const selectedExact = exactOpts.find(eo => eo.is(selected));
        if(selectedExact) {
            UI.cls();
            await ModulePage.show(args, {module: selectedExact.result?.result.info?.name!, registry: selectedExact.result?.registry!, showTitle: true, version: options.version});
            UI.cls();
            return await this.showSearchResult(args, options);
        }

        const selectedBrowseRegistry = browseRegistryOptions.find(ro => ro.is(selected));
        if(selectedBrowseRegistry) {
            UI.cls();
            await BrowsePage.showBrowsePage(selectedBrowseRegistry.registry, args, {query: options.searchTerm});
            UI.cls();
            return await this.showSearchResult(args, options);
        }
    }
}