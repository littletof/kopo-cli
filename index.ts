import { Args, parse } from "https://deno.land/std@0.97.0/flags/mod.ts";
import {renderMarkdown} from "https://deno.land/x/charmd@v0.0.1/mod.ts";
import { toEmojiList } from "./flag_parser.ts";

import {DenoRegistry, NestRegistry} from "./registries/registry.ts";

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
    }
}