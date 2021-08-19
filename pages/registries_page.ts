import { Args, renderMarkdown } from "../deps.ts";
import { RegistryHandler } from "../registries/registry_handler.ts";
import { KopoOptions, Settings } from "../settings.ts";
import { Theme } from "../theme.ts";
import { UI } from "../ui.ts";
import { upInCL } from "../utils.ts";

export class RegistriesPage {
    static async show(args: Args, options?: {}): Promise<void> {

        const registriesSettings = await Settings.getKopoOption(KopoOptions.registries);

        const registriesOptions = (await RegistryHandler.getAllRegistries()).map(r => {
            const reg = r.getRegistryInfo();
           
            /* ${reg.icon || '🗂🧮'}  */
            return UI.selectListOption({
                name: `${r.addonUrl ? Theme.colors.yellow(`${r.fromSettings ? '*': '~'} `): ''}${reg.name}${registriesSettings?.[reg.key] === false ? Theme.colors.gray(' (disabled)'):''}`,
                value: reg.key
            });
        });

        const selectedOption = await UI.selectList({
            message: 'KOPO CLI - Registries',
            options: [
                ...registriesOptions,
                UI.listOptions.separator,
                UI.listOptions.back
            ]
        });

        if(UI.listOptions.back.is(selectedOption)) {
            return;
        }

        // console.log(upInCL(2));
        UI.clearLine();
        const registry = RegistryHandler.getRegistry(selectedOption);
        const info = registry.getRegistryInfo();

        const addonInfo = `${registry.addonUrl ? Theme.colors.yellow(`**Addon from ${(registry.fromSettings ? 'settings' : '*--registries* cli flag')}**\nPath: ${Theme.colors.cyan(registry.addonUrl)}`) : ''}`

        const details = renderMarkdown(`**KOPO CLI - Registries - ${info.icon ? info.icon + " ":""}${info.name}**\n${addonInfo}\n${info.description ? '> ' + info.description : ''}`)+`\nHome page: ${Theme.colors.cyan(info.url ? `${info.url}` : '')}`;
        const lines = details.split('\n').length;
        console.log(details);
        console.log();
        UI.clearLine();

        const disabled = registriesSettings?.[selectedOption] === false;
        const cliAddon = !!registry.addonUrl && !registry.fromSettings;

        const registryOptions = {
            enable: UI.selectListOption({name: 'Enable', disabled:  !disabled || cliAddon, value: 'enable'}),
            disable: UI.selectListOption({name: 'Disable', disabled:  disabled || cliAddon, value: 'disable'}),
        }

        const selected = await UI.selectList({
            message: '     ',
            options: [
                registryOptions.enable,
                registryOptions.disable,
                UI.listOptions.separator,
                UI.listOptions.back
            ]
        });
        
        UI.clearLine();
        console.log(upInCL(lines));

        if(registryOptions.enable.is(selected) || registryOptions.disable.is(selected)) {
            const newEnabled = selected === registryOptions.enable.value;

            await Settings.setOption(KopoOptions.registries.key, Object.assign(registriesSettings, {[selectedOption]:newEnabled}));
        }


        UI.cls();
        return await this.show(args, options);
    }
}