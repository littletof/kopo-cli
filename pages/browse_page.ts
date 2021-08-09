import { Args } from "https://deno.land/std@0.97.0/flags/mod.ts";
import { renderMarkdown } from "https://deno.land/x/charmd@v0.0.1/mod.ts";
import { Registry } from "../registries/registry.ts";
import { RegistryHandler } from "../registries/registry_handler.ts";
import { Theme } from "../theme.ts";
import { UI } from "../ui.ts";
import { ModulePage } from "./module_page.ts";

export class BrowsePage {
    static async show(args: Args, options?: {}) {
        const registry = await RegistryHandler.getRegistryWithSelector();
        if(!registry) {
            return; // TODO error msg
        }

        return await this.showBrowsePage(registry, args, options);
    }

    static async showBrowsePage(registry: Registry, args: Args, options?: {page?: number, last?: string}): Promise<void> {
        const info = registry.getRegistryInfo();
        const title = renderMarkdown(`**KOPO CLI - Browsing - ${info.icon ? info.icon + " ":""}${info.name}**`);
        console.log(title);

        UI.clearLine();

        options = Object.assign({page: 1}, options); // default options

        const moduleList = await registry.getModulesList(undefined, options.page, 10); // TODO pageSize to Settings
        const separatorWithInfo = Object.assign({}, UI.listOptions.separator, {name: `------ ${moduleList.page}/${moduleList.totalPages} (${moduleList.totalModules}) ------`})

        UI.upInCL(1);

        const browseOptions = {
            next: UI.selectListOption({name: 'Next page', value:'kopo_next', disabled: moduleList.page === moduleList.totalPages}),
            prev: UI.selectListOption({name: 'Previous page', value:'kopo_prev', disabled: moduleList.page === 1})
        }

        const selected = await UI.selectList({
            message: '                         ',
            options: [
                ...moduleList.modules.map(m => UI.selectListOption({
                    name: `${m.name.padEnd(28)}${isNaN(m.starCount as number) ? '' : `${m.starCount} ${Theme.colors.yellow('*')}`.padStart(18)} - ${Theme.colors.gray(m.description?.slice(0, 50) || '')}`, // ⁕※⁎×* 
                    value: `kopomodule#${m.name}`
                })),

                UI.listOptions.empty,
                separatorWithInfo,
                browseOptions.next,
                browseOptions.prev,
                UI.listOptions.back
            ],
            default: options.last
        });

        if(browseOptions.next.is(selected)) {
            UI.upInCL(2);
            UI.clearLine();
            await this.showBrowsePage(registry, args, {page: moduleList.page+1, last: moduleList.page+1 !== moduleList.totalPages ? browseOptions.next.value : undefined});
        }
        if(browseOptions.prev.is(selected)) {
            UI.upInCL(2);
            UI.clearLine();
            await this.showBrowsePage(registry, args, {page: moduleList.page-1, last: moduleList.page-1 !== 1 ? browseOptions.prev.value : undefined});
        }

        if(selected.startsWith('kopomodule#')) {
            await ModulePage.show(args, {module: selected.split('#')[1], registry});
            options.last = selected;
            return await BrowsePage.showBrowsePage(registry, args, options);
        }

        UI.clearLine();
    }
}