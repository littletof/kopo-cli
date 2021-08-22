import { Args, parse, renderMarkdown } from "./deps.ts";
import { toEmojiList } from "./flag_parser.ts";
import {KopoOptions, Settings} from "./settings.ts";

import {DenoRegistry, NestRegistry} from "./registries/registry.ts";

import { Theme } from "./theme.ts";
import { HomePage } from "./pages/home_page.ts";
import { UI } from "./ui.ts";
import { settingsCLI } from "./cli/settings_cli.ts";
import { RegistryHandler } from "./registries/registry_handler.ts";
import { ModulePage } from "./pages/module_page.ts";
import { SearchPage } from "./pages/search_page.ts";

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
// deno run --allow-net --no-check --unstable --location https://kopo.land --allow-write --allow-read index.ts settings import ./test.json --yes

async function search(args: Args) {

    if(args._.length>1) {
        const searchTerm = `${args._[1]}`;
        const registry = (await RegistryHandler.getRegistries())[0];

        if(args.exact) {
            const module = await registry.getModuleInfo(searchTerm, args.version);
            
            if(!module) {
                console.error("Module not found. If you want to search for a term don't use the \"--exact\" or \"-e\" flag.\n");
                return;
            }

            if(module?.invalidVersion) {
                console.error(`Error: ${module.info!.name} doesn't seem to have a version [${args.version}].`);
                module.info?.versions ? console.error(`Latest version is: [${module.info.latestVersion}]\nOther possible versions: [${module.info?.versions.join(", ")}]` ) : {};
                return;
            }

            if(args.flags) {
                if(args.json) {
                    console.log(JSON.stringify(module.flags, undefined, 4));
                    return;
                }

                const latest = module.info?.latestVersion === module.currentVersion;
                const title = Theme.colors.bold(`${Theme.accent(module.info?.name!)}${module.invalidVersion ? '' : ` @ ${module.currentVersion}${latest ? Theme.colors.gray(' (latest)') : ''}`}\n`);
                console.log(title);
                await ModulePage.renderFlagsInfo(module);
                return;
            }

            if(args.json) {
                console.log(JSON.stringify(Object.assign(module, {readmeText: undefined}), undefined, 4));
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

            await ModulePage.renderModuleInfo(module);
            return;
        }

        const moduleList = await registry.getModulesList(searchTerm);
        if(moduleList.modules.length) {

            if(args.readme) {
                console.log("readme without -e?!")
            }

            if(args.json) {
                const registryResult = await (await RegistryHandler.getRegistries()).reduce(async (prev, r) => Object.assign(await prev, {[r.getRegistryInfo().key]: (await r.getModulesList(searchTerm)).modules}), Promise.resolve({}));
                console.log(JSON.stringify(registryResult, undefined, 4));
                return;
            } else {
                console.log(`Found modules: `);
                moduleList.modules.forEach(m => console.log(`   - ${`${m.name}:`.padEnd(20)} ${m.description?.slice(0, 70) + (!m.description || m.description?.length > 70 ? "…": "")}`))
            }

            
        } else {
            console.log("Module not found");
        }
    } else {
        if(await Settings.getKopoOption(KopoOptions.cls)) {
            UI.cls();
        }
        await SearchPage.show(args);
        UI.cls();
        return await HomePage.show(args);
    }
}

async function startUI(args: Args) {
    if(await Settings.getKopoOption(KopoOptions.cls)) {
        UI.cls();
    }

    console.log(); // so upInCL+clear doesnt jump
    // await Settings.setOption(KopoOptions.theme.key, "random");

    await HomePage.show(args);
}

async function run() {
    const parsedArgs = parse(Deno.args, {
        boolean: ['json', 'readme', 'readme-raw', 'exact', 'yes', 'flags'], 
        alias: {e: "exact", v: "version", y: "yes"}
    });
    // console.log(parsedArgs);
    
    await Theme.init();
    await RegistryHandler.initRegistries(parsedArgs);
    
    if(parsedArgs._?.length) {
        const cmd = parsedArgs._[0];
    
        switch(cmd) {
            case "search":
                await search(parsedArgs);
                break;
            case "ui":
                await startUI(parsedArgs);
                break;
    
            case "settings": {
                await settingsCLI(parsedArgs);
                break;
            }
        }
    } else {
        await startUI(parsedArgs);
    }
}

await run();