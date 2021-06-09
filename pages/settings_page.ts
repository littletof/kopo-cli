import { Args } from "https://deno.land/std@0.97.0/flags/mod.ts";
import { UI } from "../ui.ts";
import { KopoOptions,OptionConf,Settings } from "../settings.ts";
import {backspace, upInCL} from '../utils.ts';
import { renderMarkdown } from "https://deno.land/x/charmd@v0.0.1/renderer.ts";
import { SelectValueOptions } from "https://deno.land/x/cliffy@v0.19.1/prompt/select.ts";

export class OptionsPage {

    static readonly listOptions = {
        clear: UI.selectListOption({name: 'Clear all settings', value: 'kopo_clear'}),
        allOptions: UI.selectListOption({name: 'List set options', value: 'kopo_all'}),
        sub_reset: UI.selectListOption({name: "Reset to default", value: "reset"})
    }

    static async show(args: Args, state?: {selected?: string}): Promise<any> {
        const options: SelectValueOptions = (await Promise.all(Object.values(KopoOptions).map(async opt => {
            if(opt.hidden) {
                return "hidden";
            }


            let setValue = await Settings.getOption(opt.key, typeof opt.def !== "undefined" ? opt.def : "default");
            if(opt.valueTf) {
                setValue = opt.valueTf!(setValue);
            }
            
            return ({
                name: `${`${opt.name}:`.padEnd(20)} ${setValue}`,
                value: opt.key
            })
        }))).filter(o => o!== 'hidden');

        const selectedOption = await UI.selectList({
            message: "KOPO CLI - Settings", 
            options: [
                ...options,
                UI.listOptions.separator,
                OptionsPage.listOptions.allOptions,
                OptionsPage.listOptions.clear,
                UI.listOptions.back
            ],
            // default: "exit"
        });

        if(Object.keys(KopoOptions).map(k => KopoOptions[k].key).includes(selectedOption)) {
            UI.clearLine()
            await this.showSubOptions(args, {optionKey: selectedOption});
            UI.clearLine()
            return await this.show(args, state);
        }

        if(OptionsPage.listOptions.allOptions.is(selectedOption)) {
            console.log(upInCL(2), await Settings.getAllSetOptions())
            // console.log(await Settings.getAllSetOptions());
            console.log();
        }
        if(OptionsPage.listOptions.clear.is(selectedOption)) {
            await Settings.clearAllOptions();
            console.log("Cleared");
        }
    }

    static listHint(option: OptionConf) {
        return (option.help ? [UI.listHint(option.help)] : []);
    }

    static async showSubOptions(args: Args, state: {optionKey: string}) {
        const option = KopoOptions[state.optionKey];
        
        if(option.valueSet) {
            const defaultValue = option.valueSet.indexOf(await Settings.getOption(option.key, option.def));

            const selectedOption = await UI.selectList({
                message: `KOPO CLI - Settings - ${option.name}`, 
                options: [
                    ...OptionsPage.listHint(option),
                    ...option.valueSet.map((k, i) => ({name: option.valueTf ? option.valueTf(k) : k, value: `${i}`})), //value by index, because other is not allowed
                    UI.listOptions.separator,
                    OptionsPage.listOptions.sub_reset,
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

            if(OptionsPage.listOptions.sub_reset.is(selectedOption)) {
                await Settings.removeOption(option.key);
                if(option.onChange) {
                    await option.onChange(option.valueSet[+selectedOption]);
                }
                return;
            }
        }
    }
}