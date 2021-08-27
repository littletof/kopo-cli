import { Args,renderMarkdown } from "../deps.ts";
import { HomePage } from "../pages/home_page.ts";
import { ModulePage } from "../pages/module_page.ts";
import { SearchPage } from "../pages/search_page.ts";
import { ModulesListPage } from "../registries/registry.ts";
import { RegistryHandler } from "../registries/registry_handler.ts";
import { Settings,KopoOptions } from "../settings.ts";
import { Theme } from "../theme.ts";
import { UI } from "../ui.ts";

export async function search(args: Args) {

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
        } else { // not exact

            // const moduleList = await registry.getModulesList(searchTerm);
            const registryResult: {[key: string]: ModulesListPage['modules']} = await (await RegistryHandler.getRegistries()).reduce(async (prev, r) => Object.assign(await prev, {[r.getRegistryInfo().key]: (await r.getModulesList(searchTerm)).modules}), Promise.resolve({}));
            if(args.json) {
                console.log(JSON.stringify(registryResult, undefined, 4));
                return;
            }
            if(Object.keys(registryResult).length && Object.values(registryResult).some((r: ModulesListPage['modules']) => !!r?.length)) {

                if(args.readme) {
                    // console.log("readme without -e?!")
                    return;
                }

                
                console.log(`Search result in registries: `);

                Object.keys(registryResult).forEach(key => {
                    if(registryResult[key].length) {
                        console.log(`\t${key}:`);
                        registryResult[key].forEach(m => console.log(`\t\t- ${`${m.name}:`.padEnd(20)} ${m.description?.slice(0, 70) + (!m.description || m.description?.length > 70 ? "…": "")}`))
                    } else {
                        console.log(`\t${key}: Not found`);
                    }
                });              

                
            } else {
                console.log("No module found");
            }
        }

        
    } else {
        if(await Settings.getKopoOption(KopoOptions.cls)) {
            UI.cls();
        }
        
        return await SearchPage.show(args);
        /* UI.cls();
        return await HomePage.show(args); */
    }
}