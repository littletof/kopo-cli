import { Args } from "https://deno.land/std@0.97.0/flags/mod.ts";
import { UI } from "../ui.ts";
import { Settings } from "../settings.ts";
import { OptionsPage } from "./settings_page.ts";
import { RegistriesPage } from "./registries_page.ts";
import { BrowsePage } from "./browse_page.ts";
import { SearchPage } from "./search_page.ts";

export class HomePage {
    static async show(args: Args, options?: {}) {

        const homeOptions = {
            browse: UI.selectListOption({name: 'browse'}),
            search: UI.selectListOption({name: 'search'}),
            registries: UI.selectListOption({name: 'registries'}),
            settings: UI.selectListOption({name: "settings", disabled: !Settings.isSettingsAvailable(), disabledName: "settings (no localStorage)"}),
            help: UI.selectListOption({name: 'help'}),
            exit: UI.selectListOption({name: 'exit'}),
        }

        const selected = await UI.selectList({
            message: "KOPO CLI", 
            options: [
                homeOptions.browse,
                homeOptions.search,
                homeOptions.registries,
                homeOptions.settings,
                homeOptions.help,
                homeOptions.exit,
            ],
            // default: "exit"
        });

        if(homeOptions.browse.is(selected)) {
            UI.cls();
            await BrowsePage.show(args);
        }

        if(homeOptions.search.is(selected)) {
            UI.cls();
            await SearchPage.show(args);
        }
    
        if(homeOptions.registries.is(selected)) {
            UI.cls();
            await RegistriesPage.show(args);
        }

        if(homeOptions.settings.is(selected)) {
            UI.cls();
            await OptionsPage.show(args);
        }
    
        /* if(option === "search") {
            // TODO just a placeholder
            UI.cls();
            const s = await UI.input({
                message: 'Search module name'
            });
            await search({_: ['search', s ], exact: true});
            await search({_: ['search', s ], exact:true, readme: true});
        } */
    
        if(selected !== 'exit') { // TODO remove
            UI.cls();
            await HomePage.show(args);
        }
    }
}