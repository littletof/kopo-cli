import { Args } from "https://deno.land/std@0.97.0/flags/mod.ts";
import { UI } from "../ui.ts";
import { Settings } from "../settings.ts";
import { OptionsPage } from "./settings_page.ts";
import { RegistriesPage } from "./registries_page.ts";

export class HomePage {
    static async show(args: Args, options?: {}) {
        const option = await UI.selectList({
            message: "KOPO CLI", 
            options: [
                "browse",
                "search",
                "registries",
                UI.selectListOption({name: "settings", disabled: !Settings.isSettingsAvailable(), disabledName: "options (no localStorage)"}),
                "help",
                "exit"
            ],
            // default: "exit"
        });
    
        if(option === "settings") {
            UI.clearLine();
            await OptionsPage.show(args);
        }

        if(option === 'registries') {
            UI.clearLine();
            await RegistriesPage.show(args);
        }
    
        /* if(option === "search") {
            // TODO just a placeholder
            UI.clearLine();
            const s = await UI.input({
                message: 'Search module name'
            });
            await search({_: ['search', s ], exact: true});
            await search({_: ['search', s ], exact:true, readme: true});
        } */
    
        if(option !== 'exit') {
            UI.clearLine();
            // TODO remove
            await HomePage.show(args);
        }
    }
}