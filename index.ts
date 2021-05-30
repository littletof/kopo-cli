import { Args, parse } from "https://deno.land/std@0.97.0/flags/mod.ts";
import {renderMarkdown} from "https://deno.land/x/charmd@v0.0.1/mod.ts";
import { Select } from "https://deno.land/x/cliffy@v0.19.0/prompt/select.ts";
import type {SelectValueOptions} from "https://deno.land/x/cliffy@v0.19.0/prompt/select.ts";
import { toEmojiList } from "./flag_parser.ts";
import {KopoOptions, LocalStorageOptions, Options} from "./options.ts";

import {DenoRegistry, NestRegistry} from "./registries/registry.ts";
import { backspace, upInCL } from "./utils.ts";
import { Input } from "https://deno.land/x/cliffy@v0.19.0/prompt/input.ts";

import  * as colors from 'https://deno.land/std@0.97.0/fmt/colors.ts';
import {random} from './utils.ts';
import { OptionsPage } from "./pages/options_page.ts";
import { Theme } from "./theme.ts";

// TODO rename file to cli.ts

// deno run --allow-net --no-check index.ts search pretty
// deno run --allow-net --no-check index.ts search pretty --json
// deno run --allow-net --no-check index.ts search pretty_benching -e
// deno run --allow-net --no-check index.ts search pretty_benching -e --version v0.0.3
// deno run --allow-net --no-check index.ts search pretty_benching -e --json
// deno run --allow-net --no-check index.ts search pretty_benching -e --readme
// deno run --allow-net --no-check index.ts search pretty_benching -e --readme-raw

// ---------
// --no-prompt
//      if no registry is defined (-d / -n) in a --readme search eg., select deno, or next in line.
//      otherwise, if found in multiple registries give a prompt for the user to select from. but they should be the same...
// -e --detailed
//      gives all versions, others from json output + readme by default?!
// search from an import route
//      kopo find?? https://deno.land/x/kopo@v0.0.2/parse_flags.ts -> kopo search kopo -e -v v0.0.2


// TODO test with module husky

// deno run --allow-net --no-check --unstable --location https://kopo.land index.ts ui

async function search(args: Args) {

    if(args._.length>1) {
        const searchTerm = `${args._[1]}`;
        const dr = new DenoRegistry();

        if(args.exact) {
            const module = await dr.getModuleInfo(searchTerm, args.version);
            
            if(!module) {
                console.error("Module not found. If you want to search for a term don't use \"--exact\" or \"-e\" flag");
                return;
            }

            if(module?.invalidVersion) {
                console.error(`Error: ${module.info!.name} doesn't seem to have a version [${args.version}].`);
                module.info?.versions ? console.error(`Latest version is: [${module.info.latestVersion}]\nOther possible versions: [${module.info?.versions.join(", ")}]` ) : {};
                return;
            }

            if(args.json) {
                console.log(module);
                return;
            }

            if(args.readme && module?.readmeText) {
                console.log(renderMarkdown(module.readmeText));
                return;
            }

            if(args["readme-raw"] && module?.readmeText) {
                console.log(module.readmeText);
                return;
            }

            console.log(`%c${module.info?.name} %c@ %c${module.currentVersion}`,"color: #ff00ff; font-weight: bold", "", "color: #00ff55");
            console.log(module.info?.description);
            console.log(`Latest version: ${module.info?.latestVersion}`);
            console.log(`📍 ${module.info?.repository}`);
            console.log("📦 " + module.info?.moduleRoute); // 🔗
            // console.log("📦 " + module.info?.importRoute); // TODO remove, 
            console.log(`Flags: ${toEmojiList(module.flags)}`); // TODO fix
            return;
        }

        const moduleList = await dr.getModulesList(searchTerm);
        if(moduleList.modules.length) {

            if(args.readme) {
                console.log("readme without -e?!")
            }

            if(args.json) {
                console.log({deno: moduleList.modules});
                return;
            } else {
                console.log(`Found modules: `);
                moduleList.modules.forEach(m => console.log(`   - ${`${m.name}:`.padEnd(20)} ${m.description?.slice(0, 70) + (!m.description || m.description?.length > 70 ? "…": "")}`))
            }

            
        } else {
            console.log("Module not found");
        }
    } else {
        // TODO UI
        console.log("%cTODO Open UI on search page", "color: #ff5522");
    }
}

export class UI {
    static ListOptions = {
        back: {name: "Back", value: "kopo_back"}
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
        return {
            name: (opts.disabled ? `${colors.gray(opts.disabledName ?? opts.name)}` : opts.name) + "\x1b[39m\x1b[0m",
            value: opts.value ?? opts.name,
            disabled: opts.disabled,
            _ui_: true
        }
    }

    /* static async input(opts: {message: string, suggestions?: string[] | Promise<string[]>}) {
        return await Input.prompt({
            message: `${backspace(5)}${opts.message}`,
            suggestions: await opts.suggestions,
            pointer: ">>",
            keys: {complete: ["d", "right"]}
        });
    } */
}

async function ui(args: Args) {
    const option = await UI.selectList({
        message: "KOPO CLI", 
        options: [
            "browse",
            "search",
            "registries",
            UI.selectListOption({name: "options", disabled: !Options.isOptionsAvailable(), disabledName: "options (no localStorage)"}),
            "help",
            "exit"
        ],
        // default: "exit"
    });

    if(option === "options") {
        UI.clearLine()
        await OptionsPage.show();
    }

    // await UI.input({message: "Search", suggestions: new DenoRegistry().getAllModuleNames()});
}

const parsedArgs = parse(Deno.args, {
    boolean: ['json', 'readme', 'readme-raw', 'exact'], 
    alias: {e: "exact", v: "version", r: 'readme', w: "readme-raw"}
});
// console.log(parsedArgs);
if(parsedArgs._?.length) {
    const cmd = parsedArgs._[0];

    switch(cmd) {
        case "search":
            await search(parsedArgs);
            break;
        case "ui":
            if(await Options.getOption(KopoOptions.cls.key, false)) {
                console.log('\x1Bc');
            }

            console.log(); // so upInCL+clear doesnt jump
            // await Options.setOption(KopoOptions.theme.key, "random");
            await Theme.init();
            await ui(parsedArgs);
            break;
    }
}