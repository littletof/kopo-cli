import { Args, renderMarkdown } from "../deps.ts";
import { printReadme } from "../common.ts";
import { flagToEmoji, toEmojiList } from "../flag_parser.ts";
import { ModuleInfo, Registry } from "../registries/registry.ts";
import { RegistryHandler } from "../registries/registry_handler.ts";
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
            flags: UI.selectListOption({name: 'Show flags info', value: 'flags'}),
            diff_version: UI.selectListOption({name: 'Select a different version', value: 'diff_ver'}),
            other_registries: UI.selectListOption({name: 'Check other registries', value: 'other_regs'}),
        }
        const moduleOptions = [];

        if(module.readmeText) {
            moduleOptions.push(moduleOptionsCandidates.readme);
        }

        if(module.flags) {
            moduleOptions.push(moduleOptionsCandidates.flags);
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

        if(moduleOptionsCandidates.flags.is(selected)) {
            UI.cls();

            const regInfo = options.registry.getRegistryInfo();
            const title = renderMarkdown(`**KOPO CLI - ${regInfo.icon ? regInfo.icon + " ":""}${regInfo.name} - Module - ${Theme.accent(options.module)} @ ${module.currentVersion} - Flags 🚩**`);
            console.log(title);

            this.renderFlagsInfo(module);

            await UI.selectList({
                message: '        ',
                options: [
                    UI.listOptions.back
                ],
            });

            UI.cls();
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
            UI.cls();
            await SearchPage.showSearchResult(args, {searchTerm: module.info?.name!, exact: true});
            UI.cls();
            return await this.show(args, options);
        }
    }

    static async renderModuleInfo(module: ModuleInfo) {
        let moduleInfoText = "";

        const latest = module.info?.latestVersion === module.currentVersion;
        moduleInfoText += Theme.colors.bold(`${Theme.accent(module.info?.name!)}${module.invalidVersion ? '' : ` @ ${module.currentVersion}${latest ? Theme.colors.gray(' (latest)') : ''}`}\n`);
        

        const description = renderMarkdown(`> ${module.info?.description}`)+"\n";
        moduleInfoText += description;


        if(!isNaN(module.info?.start_count as any)) {
            moduleInfoText += `**Stars:** ${Theme.colors.italic(`${module.info!.start_count}`)}⭐\n`;
        }
        if(module.flags) {
            moduleInfoText += `**Flags:** ${toEmojiList(module.flags)}\n`;
        }
        if(module.uploadedAt) {
            moduleInfoText += `**Uploaded at:** ${Intl.DateTimeFormat(undefined, {dateStyle: "short", timeStyle: "short"}).format(module.uploadedAt)}\n`;
        }
        if(!latest && module.info?.latestVersion) {
            moduleInfoText += `**Latest version:** ${module.info?.latestVersion}\n`;
        }
        moduleInfoText += '\n';
        moduleInfoText += ` 📍 ${Theme.colors.cyan(module.info?.repository || '-')}\n`;
        moduleInfoText += `📦 ${Theme.colors.cyan(module.info?.moduleRoute || '-')}\n`; // 🔗

        console.log(renderMarkdown(moduleInfoText));

        return moduleInfoText.split('\n').length;
    }

    static async renderFlagsInfo(module: ModuleInfo) {
        let text = '';

        if(!module.flags?.required && !module.flags?.optional) {
            console.log(Theme.colors.gray('No flag definition found for this module.'));
        }
        
        if(module.flags?.required.length) {
            text+='|Required|Description|\n|:--|:--|\n'
            module.flags?.required.forEach(f => text+= `|${flagToEmoji(f.flag)} \`${f.flag}\`|${f.description}|\n`);
        }

        if(module.flags?.optional.length) {
            text+=`| ${Theme.colors.blue(Theme.colors.bold(`Optional`))} | ${Theme.colors.blue(Theme.colors.bold(`Description`))} |\n${text.length ? '' : '|:--|:--|\n'}`;
            module.flags?.optional.forEach(f => text+= `|${flagToEmoji(f.flag)} \`${f.flag}\`|${f.description}|\n`);
        }

        console.log(renderMarkdown(text));
    }
}