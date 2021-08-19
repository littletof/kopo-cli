import { Args, SelectValueOptions } from "../deps.ts";
import { UI } from "../ui.ts";
import { KopoOptions,OptionConf,Settings } from "../settings.ts";
import {backspace, upInCL} from '../utils.ts';
import { Theme } from "../theme.ts";

export class OptionsPage {
    static async show(args: Args, state?: {selected?: string}): Promise<any> {
        const options: SelectValueOptions = (await Promise.all(Object.values(KopoOptions).map(async opt => {
            if(opt.hidden) {
                return;
            }


            let setValue = await Settings.getOption(opt.key, typeof opt.def !== "undefined" ? opt.def : "default");
            if(opt.valueTf) {
                setValue = opt.valueTf!(setValue);
            }
            
            return ({
                name: `${`${opt.name}:`.padEnd(20)} ${setValue}`,
                value: opt.key
            })
        }))).filter(o => !!o) as SelectValueOptions;

        const listOptions = {
            clear: UI.selectListOption({name: 'Clear all settings', value: 'kopo_clear'}),
            allOptions: UI.selectListOption({name: 'List set options', value: 'kopo_all'}),
            exportSettings: UI.selectListOption({name: `Export settings ${Theme.colors.green('>>')}`, value: 'kopo_export_settings'}),
            importSettings: UI.selectListOption({name: `Import settings ${Theme.accent('<<')}`,value: 'kopo_import_settings', disabled: true}),
        }

        const selectedOption = await UI.selectList({
            message: "KOPO CLI - Settings", 
            options: [
                ...options,
                UI.listOptions.separator,
                // listOptions.allOptions,
                listOptions.exportSettings,
                // TODO listOptions.importSettings,
                listOptions.clear,
                UI.listOptions.separator,
                UI.listOptions.back
            ],
        });

        if(Object.keys(KopoOptions).map(k => KopoOptions[k].key).includes(selectedOption)) {
            UI.clearLine()
            await this.showSubOptions(args, {optionKey: selectedOption});
            UI.clearLine()
            return await this.show(args, state);
        }

        if(listOptions.allOptions.is(selectedOption)) {
            console.log(upInCL(2), await Settings.getAllSetOptions())
            // console.log(await Settings.getAllSetOptions());
            console.log();
        }
        if(listOptions.clear.is(selectedOption)) {
            if(await UI.confirm({message: 'Are you sure, you want to delete all your settings?'})) {
                await Settings.clearAllOptions();
                console.log("Cleared");

                // TODO reload settings properly
                await Theme.init();
            }

            UI.cls();
            return await this.show(args, state);
        }
        if(listOptions.exportSettings.is(selectedOption)) {
            const exportPath = `./kopo_cli_settings_${Intl.DateTimeFormat('hu').format(new Date()).replaceAll(/\.\s/g, '_').replaceAll(/\./g, '')}.json`;
            // TODO move to cli command, so can use path autocomplete for different path. // kopo settings export path
            if(await UI.confirm({message: 'Exporting settings will need write permissions. Do you want to continue?'})) {
                const perm_to_export = await Deno.permissions.request({name: 'write', path: exportPath});
                Deno.writeTextFileSync(exportPath, JSON.stringify(await Settings.getAllSetOptions(),undefined, 4));
            }

            return await this.show(args, state);
        }

        if(listOptions.importSettings.is(selectedOption)){
            // TODO
        }
    }

    static listHint(option: OptionConf) {
        return (option.help ? [UI.listHint(option.help)] : []);
    }

    static async showSubOptions(args: Args, state: {optionKey: string}) {
        const option = KopoOptions[state.optionKey];
        
        const listOptions = {
            sub_reset: UI.selectListOption({name: "Reset to default", value: "reset"})
        }

        if(option.valueSet) {
            const defaultValue = option.valueSet.indexOf(await Settings.getOption(option.key, option.def));

            const selectedOption = await UI.selectList({
                message: `KOPO CLI - Settings - ${option.name}`, 
                options: [
                    ...OptionsPage.listHint(option),
                    ...option.valueSet.map((k, i) => ({name: option.valueTf ? option.valueTf(k) : k, value: `${i}`})), //value by index, because other is not allowed
                    UI.listOptions.separator,
                    listOptions.sub_reset,
                    UI.listOptions.back
                ],
                default:  defaultValue !== -1 ? defaultValue.toString() : undefined, // get index of default value
                // hint: option.help ? UI.listHint(option.help).name : undefined
                // hint: option.help
            });

            if(option.valueSet.includes(option.valueSet[+selectedOption])) {
                await Settings.setOption(option.key, option.valueSet[+selectedOption]);
                if(option.onChange) {
                    await option.onChange(option.valueSet[+selectedOption]);
                }
                return;
            }

            if(listOptions.sub_reset.is(selectedOption)) {
                await Settings.removeOption(option.key);
                if(option.onChange) {
                    await option.onChange(option.valueSet[+selectedOption]);
                }
                return;
            }
        }
    }
}