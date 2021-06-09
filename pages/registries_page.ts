import { Args } from "https://deno.land/std@0.97.0/flags/mod.ts";
import { renderMarkdown } from "https://deno.land/x/charmd@v0.0.1/renderer.ts";
import { RegistryHandler } from "../registries/registry_handler.ts";
import { Theme } from "../theme.ts";
import { UI } from "../ui.ts";
import { upInCL } from "../utils.ts";

export class RegistriesPage {
    static async show(args: Args, options?: {}) {

        const registiresOptions = RegistryHandler.getAllRegistries().map(r => {
            const reg = r.getRegistryInfo();
           
            /* ${reg.icon || '🗂🧮'}  */
            return UI.selectListOption({name: `${reg.name}`, value: reg.key});
        });

        const selectedOption = await UI.selectList({
            message: 'KOPO CLI - Registries',
            options: [
                ...registiresOptions,
                UI.listOptions.separator,
                UI.listOptions.back
            ]
        });

        if(UI.listOptions.back.is(selectedOption)) {
            return;
        }

        // console.log(upInCL(2));
        UI.clearLine();
        const info = RegistryHandler.getRegistry(selectedOption).getRegistryInfo();
        const details = renderMarkdown(`**KOPO CLI - Registries - ${info.icon ? info.icon + " ":""}${info.name}**\n\n${info.description ? '> ' + info.description : ''}`)+`\nHome page: ${Theme.colors.cyan(info.url ? `${info.url}` : '')}`;
        const lines = details.split('\n').length;
        console.log(details);
        console.log();
        UI.clearLine();
        await UI.selectList({
            message: '     ',
            options: [
                "Enable",
                "Disable",
                UI.listOptions.separator,
                UI.listOptions.back
            ]
        });
        UI.clearLine();
        console.log(upInCL(lines));
    }
}