import {colors} from '../deps.ts';
import {fetchJSON, fetchText, separator} from '../utils.ts';
import type { RegistryDef, WorkingMemory } from '../types.ts';

const modulesApiUrl = 'https://api.deno.land/modules';
const cdnUrl = 'https://cdn.deno.land';

export const deno_land: RegistryDef = {
    name: "🦕 deno.land/x",
    init: (workingMem: WorkingMemory) => {},
    getModulesPage: async (workingMem: WorkingMemory, page: number, pageSize: number, query?: string) => {
        const response = await fetchJSON(`${modulesApiUrl}?page=${page}&limit=${pageSize}${query? `&query=${query}`: ""}`);

        workingMem.totalModules = response.data.total_count;
        return (response.data.results  as any[]).map(m => moduleToSelectOption(m));
    },
    showInfoPage: async (workingMem: WorkingMemory, module: string) => {
        const actions: any = [];
        workingMem.moduleInfoActions = {};

        console.log('\n');
        // https://cdn.deno.land/MODULE/meta/versions.json
        // https://api.deno.land/modules/MODULE
        // https://cdn.deno.land/MODULE/versions/v0.3.0/meta/meta.json
        // https://cdn.deno.land/MODULE/versions/v0.3.0/raw/README.md

        const versionInfo = await fetchJSON(`${cdnUrl}/${module}/meta/versions.json`);
        const latestVersion = versionInfo.latest;

        const moduleInfo = await fetchJSON(`${cdnUrl}/${module}/versions/${latestVersion}/meta/meta.json`);
        const uploadedAt = moduleInfo.uploaded_at;

        const apiModule = await fetchJSON(`${modulesApiUrl}/${module}`);

        let repo = '-';
        if(latestVersion) {
            repo =  moduleInfo.upload_options?.type === 'github' ? `https://github.com/${moduleInfo.upload_options.repository}`: `${moduleInfo.upload_options.type} - ${moduleInfo.upload_options.repository}`;
            const readmes = findReadmes(moduleInfo.directory_listing);

            if(readmes.length > 0) {
                workingMem.moduleInfoActions['readme'] = async () => {
                    const readmeText = await fetchText(`${cdnUrl}/${module}/versions/${latestVersion}/raw${readmes[0].path.replace('../', '/')}`);
                    console.log();
                    console.log(readmeText);
                }
                actions.push({name: 'Show raw readme', value: 'readme'});
            }
        }            

        console.log(`Module: ${colors.bold(colors.magenta(module))}`);
        console.log(`Stars: ${JSON.stringify(apiModule.data.star_count)}${colors.yellow('⭐')}`);
        console.log(`Version: ${latestVersion ? `[${colors.yellow(latestVersion)}] (${uploadedAt})` : colors.red(`No uploaded version`)}`);
        console.log(`Repo: ${colors.brightCyan(repo)}`);
        console.log(`Description: ${apiModule.data.description}`);
        console.log();
        console.log(separator()); 
        
        return actions;
    }
};

function moduleToSelectOption(module: {name: string, star_count: number, description: string}) {
    return {
        name: `${colors.green(module.name.padEnd(18))} ${module.star_count ? `${colors.white(module.star_count.toString())}${colors.yellow("⭐")}`.padStart(26) : ''.padStart(7)} - ${(module.description as string)?.slice(0, 50)}`,
        value: module.name
    };
}

function findReadmes(directory_listing: {path: string}[]) {
    return directory_listing.filter(l => l.path.toLowerCase().indexOf('readme.md') !== -1);
}