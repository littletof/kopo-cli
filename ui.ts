import { renderMarkdown } from "https://deno.land/x/charmd@v0.0.1/renderer.ts";
import { Input } from "https://deno.land/x/cliffy@v0.19.1/prompt/input.ts";
import { Select, SelectValueOptions } from "https://deno.land/x/cliffy@v0.19.1/prompt/select.ts";
import { Theme } from "./theme.ts";
import { backspace, upInCL } from "./utils.ts";

export class UI {
    static listOptions = {
        back: UI.selectListOption({name: "Back", value: "kopo_back"}),
        separator: UI.selectListOption({name: "-".repeat(30), value: "kopo_separator", disabled: true})
    }

    static clearLine() {
        console.log(upInCL(1) + " ".repeat(70) + upInCL(1));
    }

    static async selectList(opts: {message: string, options: SelectValueOptions, default?: string, hint?: string}) {
        return await Select.prompt({
            message: `${backspace(5)}${opts.message}`,
            options: opts.options.map(opt => (opt as any)['_ui_'] ? opt : UI.selectListOption(opt as any)),
            listPointer: `${Theme.accent('>>')}\x1b[1m`,
            // search: true,
            // searchIcon: '?*',
            // searchLabel: 'Search',
            // transform: value => value+'!!', // selected value transform
            // transform: value => '',
            pointer: '>>', // after selected
            keys: {
                previous: ['w', '8', 'up'],
                next: ['s', '2', 'down'],
            },
            default: opts.default,
            maxRows: 20,
            hint: opts.hint
        });
    }

    static selectListOption(opts: string | {name: string, value?: string, disabled?: boolean, disabledName?: string}) {
        if(typeof opts === 'string') {
            opts = {name: opts};
        }

        const value = opts.value ?? opts.name;

        return {
            name: (opts.disabled ? `${Theme.colors.gray(opts.disabledName ?? opts.name)}` : opts.name) + "\x1b[39m\x1b[0m",
            value,
            disabled: opts.disabled,
            _ui_: true,
            is(option: string) {
                return option === value;
            }
        }
    }

    static listHint(hint: string) {
        return UI.selectListOption({name: backspace(5) + renderMarkdown(`*${hint}*`), disabled: true});
    }

    static async input(opts: {message: string, suggestions?: string[] | Promise<string[]>}) {
        return await Input.prompt({
            message: `${backspace(5)}${opts.message}`,
            suggestions: await opts.suggestions,
            pointer: ">>",
            // keys: {complete: ["enter", "right"]}
        });
    }
}