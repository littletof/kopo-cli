import { Args, renderMarkdown } from "../deps.ts";
import { Registry } from "../registries/registry.ts";
import { RegistryHandler } from "../registries/registry_handler.ts";
import { KopoOptions, Settings } from "../settings.ts";
import { Theme } from "../theme.ts";
import { UI } from "../ui.ts";
import { ModulePage } from "./module_page.ts";
import { SearchPage } from "./search_page.ts";

export class BrowsePage {
    static async show(args: Args, options?: {}) {
        const registry = await RegistryHandler.getRegistryWithSelector();
        if(!registry) {
            return; // TODO error msg
        }

        return await this.showBrowsePage(registry, args, options);
    }

    static async showBrowsePage(registry: Registry, args: Args, options?: {page?: number, last?: string, query?: string}): Promise<void> {
        const info = registry.getRegistryInfo();
        const title = renderMarkdown(`**KOPO CLI - ${options?.query ? 'Searching' : 'Browsing'} - ${info.icon ? info.icon + " ":""}${info.name}${options?.query? ` - ${Theme.accent(options.query)}` : ''}**`);
        console.log(title);

        UI.clearLine();

        options = Object.assign({page: 1}, options); // default options

        const moduleList = await registry.getModulesList(options.query, options.page, await Settings.getKopoOption(KopoOptions.pagesize));
        const separatorWithInfo = Object.assign({}, UI.listOptions.separator, {name: `---------- ${Theme.colors.bold(`${moduleList.page}`)} ${Theme.colors.reset(Theme.accent('/'))} ${moduleList.totalPages} ${Theme.colors.gray(`(${moduleList.totalModules})`)} ----------`})

        UI.upInCL(1);

        const browseOptions = {
            next: UI.selectListOption({name: 'Next page', value:'kopo_next', disabled: moduleList.totalPages === 0 || moduleList.page === moduleList.totalPages}),
            prev: UI.selectListOption({name: 'Previous page', value:'kopo_prev', disabled: moduleList.totalPages === 0 || moduleList.page === 1}),
            search: UI.selectListOption({name: 'Search', value:'kopo_search'}),
        }

        const emojiStar = Deno.build.os !== "windows" || await Settings.getKopoOption(KopoOptions.winprint);
        const star = emojiStar ? '⭐' : Theme.colors.yellow('*');
        const starPad = emojiStar ? 16 : 26;

        const selected = await UI.selectList({
            message: '                         ',
            options: [
                ...moduleList.modules.map(m => UI.selectListOption({
                    name: `${m.name.padEnd(28)}${isNaN(m.starCount as number) ? '' : `${Theme.colors.italic(`${m.starCount}`)} ${star}`.padStart(starPad)} - ${Theme.colors.gray(m.description?.slice(0, 50) + (m.description && m.description.length > 50 ? "...": ""))}`, 
                    value: `kopomodule#${m.name}`
                })),
                ...(moduleList.modules.length === 0 ? [UI.listOptions.disabled('No modules found...')] : []),

                UI.listOptions.empty,
                separatorWithInfo,
                ...(options.query ? []: [browseOptions.search]),
                browseOptions.next,
                browseOptions.prev,
                UI.listOptions.back
            ],
            default: options.last,
            maxRows: await Settings.getKopoOption(KopoOptions.pagesize) + 10
        });

        if(browseOptions.search.is(selected)) {
            UI.cls();
            await SearchPage.show(args, {registries: [registry]});
            UI.cls();
            return this.showBrowsePage(registry, args, options);
        }

        if(browseOptions.next.is(selected)) {
            UI.cls();
            await this.showBrowsePage(registry, args, {page: moduleList.page+1, last: moduleList.page+1 !== moduleList.totalPages ? browseOptions.next.value : undefined});
        }
        if(browseOptions.prev.is(selected)) {
            UI.cls();
            await this.showBrowsePage(registry, args, {page: moduleList.page-1, last: moduleList.page-1 !== 1 ? browseOptions.prev.value : undefined});
        }

        if(selected.startsWith('kopomodule#')) {
            UI.cls();
            await ModulePage.show(args, {module: selected.split('#')[1], registry, showTitle: true});
            options.last = selected;
            return await BrowsePage.showBrowsePage(registry, args, options);
        }

        UI.clearLine();
    }
}