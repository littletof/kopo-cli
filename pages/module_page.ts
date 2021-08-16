import { Args } from "https://deno.land/std@0.97.0/flags/mod.ts";
import { renderMarkdown } from "https://deno.land/x/charmd@v0.0.1/mod.ts";
import { printReadme } from "../common.ts";
import { toEmojiList } from "../flag_parser.ts";
import { ModuleInfo, Registry } from "../registries/registry.ts";
import { RegistryHandler } from "../registries/registry_handler.ts";
import { Settings } from "../settings.ts";
import { Theme } from "../theme.ts";
import { UI } from "../ui.ts";
import { SearchPage } from "./search_page.ts";

export class ModulePage {
    static async show(args: Args, options: {module: string, registry: Registry, version?: string, showTitle?: boolean}): Promise<void> {
        if(options.showTitle) {
            const regInfo = options.registry.getRegistryInfo();
            const title = renderMarkdown(`**KOPO CLI - ${regInfo.icon ? regInfo.icon + " ":""}${regInfo.name} - Module - ${Theme.accent(options.module)}${options.version ? ` @ ${options.version}` : ''}**`);
            console.log(title);
        }
        const module = await options.registry.getModuleInfo(options.module, options.version);
        // console.log(module);
        if(!module) {
            return; // TODO errormsg
        }

        const lines = await this.renderModuleInfo(module);

        const moduleOptionsCandidates = {
            readme: UI.selectListOption({name: 'Show README', value: 'readme'}),
            diff_version: UI.selectListOption({name: 'Select a different version', value: 'diff_ver'}),
            other_registries: UI.selectListOption({name: 'Check other registries', value: 'other_regs'}),
        }
        const moduleOptions = [];

        if(module.readmeText) {
            moduleOptions.push(moduleOptionsCandidates.readme);
        }

        if(module.info?.versions?.length! > 1) {
            moduleOptions.push(moduleOptionsCandidates.diff_version);
        }

        if((await RegistryHandler.getRegistries()).length > 1){
            moduleOptions.push(moduleOptionsCandidates.other_registries);
        }

        const selected = await UI.selectList({
            message: '         ',
            options: [
                UI.listOptions.separator,
                ...moduleOptions,
                UI.listOptions.back
            ]
        });

        UI.upInCL(lines+3);

        if(UI.listOptions.back.is(selected)) {
            UI.cls();
            return;
        }

        if(moduleOptionsCandidates.readme.is(selected)) {
            UI.cls();
            console.log(Theme.colors.bgRed(Theme.colors.white((`------------ Start of README for ${module.info?.name} ------------\n`))));
            await printReadme(module.readmeText || '');
            console.log(Theme.colors.gray((`------------ End of README for (${module.info?.name})------------\n`)));

            return await this.show(args, options);
        }

        if(moduleOptionsCandidates.diff_version.is(selected)) {
            // options.registry.getVersionsOfModule()
            UI.cls();
            const version = await UI.selectList({ // TODO allow search???
                message: `KOPO CLI - Module - ${options.module} - Select version`,
                options: [
                    UI.listOptions.back,
                    UI.listOptions.separator,
                    UI.listOptions.empty,
                    ...(module.info?.versions?.map(v => UI.selectListOption({name: v})) || []),
                    UI.listOptions.empty,
                    UI.listOptions.separator,
                    UI.listOptions.back
                ],
                
                default: module.currentVersion,
                maxRows: 10
            });
            if(UI.listOptions.back.is(version)) {
                UI.clearLine();
                return await this.show(args, options);
            }
            const newVersion: any = {};
            Object.assign(newVersion, options, {version});
            
            UI.cls();
            return await this.show(args, newVersion);
        }

        if(moduleOptionsCandidates.other_registries.is(selected)) {
            /* const others = (await Promise.all((await RegistryHandler.getRegistries()).map(async reg => {
                const moduleSearch = await reg.getModuleInfo(module.info?.name!);
                if(!moduleSearch) {
                    return undefined;
                }
                return {reg: reg.getRegistryInfo().key, result: `${moduleSearch?.info?.name}@${moduleSearch?.currentVersion}`}
            }))).filter(res => !!res).map(res => `${res!.reg} - ${res!.result}`);
            console.log(others.join('\n'));

            // TODO SHOW searchPage */
            UI.cls();
            await SearchPage.showSearchResult(args, {searchTerm: module.info?.name!, exact: true});
            UI.cls();
            return await this.show(args, options);
        }
    }

    static async renderModuleInfo(module: ModuleInfo) {
        const latest = module.info?.latestVersion === module.currentVersion;
        console.log(Theme.colors.bold(`${Theme.accent(module.info?.name!)} @ ${module.currentVersion}${latest ? Theme.colors.gray(' (latest)') : ''}`));
        let lines = 1;

        const description = renderMarkdown(">"+module.info?.description);
        console.log(description);
        lines += description.split('\n').length;

        if(!isNaN(module.info?.start_count as any)) {
            console.log(`Stars: ${module.info?.start_count}⭐`);
            lines++;
        }
        if(!latest) {
            console.log(`Latest version: ${module.info?.latestVersion}`);
            lines++;
        }
        console.log(` 📍 ${Theme.colors.cyan(module.info?.repository || '')}`);
        console.log("📦  " + Theme.colors.cyan(module.info?.moduleRoute || '')); // 🔗
        lines +=2;

        if(module.flags) {
            lines++;
            console.log(`Flags: ${toEmojiList(module.flags)}`); // TODO fix
        }
        return lines;
    }
}