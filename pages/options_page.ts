import { UI } from "../index.ts";
import { KopoOptions,Options } from "../options.ts";
import { upInCL } from "../utils.ts";

export class OptionsPage {
    static async show(state?: {selected?: string}): Promise<any> {
        const options = await Promise.all(Object.keys(KopoOptions).map(async k => {

            let setValue = await Options.getOption(k, KopoOptions[k].def ? KopoOptions[k].def : "default");
            if(KopoOptions[k].valueTf) {
                setValue = KopoOptions[k].valueTf!(setValue);
            }
            
            return ({
                name: `${`${KopoOptions[k].name}:`.padEnd(20)} ${setValue}`,
                value: k
            })
        }));

        const selectedOption = await UI.selectList({
            message: "KOPO CLI - Options", 
            options: [
                ...options,
                {name: "list set options", value: "all"},
                "clear",
                UI.ListOptions.back
            ],
            // default: "exit"
        });

        if(Object.keys(KopoOptions).map(k => KopoOptions[k].key).includes(selectedOption)) {
            UI.clearLine()
            await this.showSubOptions({optionKey: selectedOption});
            UI.clearLine()
            return await this.show(state);
        }

        if(selectedOption === "all") {
            console.log(await Options.getAllSetOptions());
        }
        if(selectedOption === "clear") {
            await Options.clearAllOptions();
            console.log("Cleared");
        }
    }

    static async showSubOptions(state: {optionKey: string}) {
        const option = KopoOptions[state.optionKey];
        
        if(option.valueSet) {
            const defaultValue = option.valueSet.indexOf(await Options.getOption(option.key, option.def));

            const selectedOption = await UI.selectList({
                message: `KOPO CLI - Options - ${option.name}`, 
                options: [
                    ...option.valueSet.map((k, i) => ({name: option.valueTf ? option.valueTf(k) : k, value: `${i}`})), //value by index, because other is not allowed
                    {disabled: true, name: "--------------", value: "sep"},
                    {name: "Reset to default", value: "reset"},
                    UI.ListOptions.back
                ],
                default:  defaultValue !== -1 ? defaultValue.toString() : undefined// get index of default value
            });

            if(option.valueSet.includes(option.valueSet[+selectedOption])) {
                await Options.setOption(option.key, option.valueSet[+selectedOption]);
                if(option.onChange) {
                    await option.onChange(option.valueSet[+selectedOption]);
                }
            }

            if(selectedOption === "reset") {
                await Options.removeOption(option.key);
                return;
            }
        }
    }
}