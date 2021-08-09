import { Args } from "https://deno.land/std@0.97.0/flags/mod.ts";
import { renderMarkdown } from "https://deno.land/x/charmd@v0.0.1/mod.ts";
import { toEmojiList } from "../flag_parser.ts";
import { ModuleInfo, Registry } from "../registries/registry.ts";
import { RegistryHandler } from "../registries/registry_handler.ts";
import { Theme } from "../theme.ts";
import { UI } from "../ui.ts";

export class ModulePage {
    static async show(args: Args, options: {module: string, registry: Registry, version?: string}): Promise<void> {
        const module = await options.registry.getModuleInfo(options.module, options.version);
        // console.log(module);
        if(!module) {
            return; // TODO errormsg
        }

        const lines = await this.renderModuleInfo(module);

        const selected = await UI.selectList({
            message: '         ',
            options: [
                UI.selectListOption({name: 'Select a different version', value: 'diff_ver'}),
                UI.selectListOption({name: 'Check other registries', value: 'other_regs'}),
                UI.listOptions.back
            ]
        });

        if(UI.listOptions.back.is(selected)) {
            UI.clearLine();
            // TODO upInCLI by lines
            return;
        }

        if(selected === 'diff_ver') {
            // options.registry.getVersionsOfModule()
            const version = await UI.selectList({
                message: 'select version',
                options: [
                    ...(module.info?.versions?.map(v => UI.selectListOption({name: v})) || []),
                    UI.listOptions.empty,
                    UI.listOptions.separator,
                    UI.listOptions.back
                ],
            });
            if(UI.listOptions.back.is(version)) {
                UI.clearLine();
                return await this.show(args, options);
            }
            const newVersion: any = {};
            Object.assign(newVersion, options, {version});
            
            UI.clearLine();
            return await this.show(args, newVersion);
        }

        if(selected === 'other_regs') {
            const others = (await Promise.all((await RegistryHandler.getRegistries()).map(async reg => {
                const moduleSearch = await reg.getModuleInfo(module.info?.name!);
                if(!moduleSearch) {
                    return undefined;
                }
                return {reg: reg.getRegistryInfo().key, result: `${moduleSearch?.info?.name}@${moduleSearch?.currentVersion}`}
            }))).filter(res => !!res).map(res => `${res!.reg} - ${res!.result}`);
            console.log(others.join('\n'));

            // TODO SHOW searchPage
        }
    }

    static async renderModuleInfo(module: ModuleInfo) {
        console.log(`${Theme.accent(module.info?.name!)} @ ${module.currentVersion}`);
        console.log(renderMarkdown(">"+module.info?.description));
        if(!isNaN(module.info?.start_count as any)) {
            console.log(`Stars: ${module.info?.start_count}⭐`);
        }
        console.log(`Latest version: ${module.info?.latestVersion}`);
        console.log(` 📍 ${Theme.colors.cyan(module.info?.repository || '')}`);
        console.log("📦  " + Theme.colors.cyan(module.info?.moduleRoute || '')); // 🔗
        
        if(module.flags) {
            console.log(`Flags: ${toEmojiList(module.flags)}`); // TODO fix
        }
    }
}