// Copyright 2020- Szalay Kristóf. All rights reserved. MIT license.
import { colors } from "../deps.ts";
import { getFlags, toEmojiList } from "../flag_parser.ts";
import { RegistryDef, WorkingMemory } from "../types.ts";
import {fetchJSON, fetchText, separator} from '../utils.ts';

interface NestWorkingMem extends WorkingMemory{
    nestModules: {name: string, description: string}[];
}

export const nest_land: RegistryDef<NestWorkingMem> = {
    name: "🥚 x.next.land",
    init: async (workingMem: NestWorkingMem) => {
        const response = await fetchJSON(`https://x.nest.land/api/packages`);
        workingMem.nestModules = response;
        workingMem.totalModules = response.length;
    },
    getModulesPage: (workingMem: NestWorkingMem, page: number, pageSize: number, query?: string) => {
        const filteredModules = query ? (workingMem.nestModules as any[]).filter(m => (m.name as string).indexOf(query) !== -1 || m.description.indexOf(query) !== -1) : (workingMem.nestModules as any[]);
        const modulesOnPage = (filteredModules as any[]).slice((page-1) * pageSize, Math.min(filteredModules.length, page * pageSize));
        return modulesOnPage.map(m => ({name: `${colors.green(m.name.padEnd(15))} - ${(m.description as string)?.slice(0, 50)}`, value: m.name}));
    },
    showInfoPage: async (workingMem: NestWorkingMem, module: string) => {
        const actions: any = [];
        workingMem.moduleInfoActions = {};
        
        console.log();
        const moduleInfo = await fetchJSON(`https://x.nest.land/api/package/${module}`);
        const latestVersion = moduleInfo.latestVersion.split('@')[1];

        const versionInfo = await fetchJSON(`https://x.nest.land/api/package/${module}/${latestVersion}`);
        
        let flags;
        if(latestVersion) {
            const readmes = Object.keys(versionInfo.files).filter(fp => fp.toLowerCase().indexOf('readme.md') !== -1);

            if(readmes.length > 0) {
                const readmeText = await fetchText(`https://x.nest.land/${moduleInfo.latestVersion}${readmes[0]}`);                

                workingMem.moduleInfoActions['readme'] = () => {
                    console.log();
                    console.log(readmeText);
                }
                actions.push({name: 'Show raw readme', value: 'readme'});

                flags = getFlags(readmeText);
            }
        } 

        console.log(`Module: ${colors.bold(colors.magenta(moduleInfo.name))}`);
        console.log(`Version: [${colors.yellow(latestVersion)}] (${moduleInfo.updatedAt})`);
        console.log(`Repo: ${colors.brightCyan(moduleInfo.repository)}`);
        console.log(`Description: ${moduleInfo.description}`);
        if(flags) {
            console.log(`Flags: ${toEmojiList(flags)}`);
        }
        
        console.log();
        console.log(separator());

        return actions;
    }
}

// https://x.nest.land/kopo@v0.0.2/README.md
// https://nest.land/api/readme?mod=kopo@v0.0.2

/*
// https://x.nest.land/api/package/kopo/v0.0.2
{
    "name":"kopo@v0.0.2",
    "package":{
        "name":"kopo",
        "owner":"littletof",
        "description":"A Deno registry browser in the terminal",
        "createdAt":"2020-10-25T13:35:01.706Z"},
        "entry":"/mod.ts",
        "version":"v0.0.2",
        "prefix":"https://arweave.net/jqzFB0x2I9H_iMkO4H5sIvY7vBW30l3gZG01drcyt44",
        "malicious":null,
        "files":{
            "/mod.ts":{"inManifest":"/mod.ts","txId":"LDGNa6bJJvL3iDc16nlR8Wx5Q_syn2tRN3JNphjtS3I"},
            "/docs/showcase.png":{"inManifest":"/docs/showcase.png","txId":"qBbSiUI5HtaxdeohRS267HCCFDdEfKGGD2Ilfr64L7o"},
            "/registries/deno_land.ts":{"inManifest":"/registries/deno_land.ts","txId":"R3KsC1mjixB60Kyw4CH4BKFnT5dbTP0jzHu3sqpsY8o"},
            "/registries/nest_land.ts":{"inManifest":"/registries/nest_land.ts","txId":"w-GxclQrt5uOqauN5WIEWB2FncKdQHuaqwf-j6GSaXk"},
            "/deps.ts":{"inManifest":"/deps.ts","txId":"Om_A7fMvvnFtPq3KsLVtF6CP5jrLkuiA5dZpevDWQUo"},
            "/flag_parser.ts":{"inManifest":"/flag_parser.ts","txId":"n9VbkgY-BHUgJRDOozBD4eVnsjPCmvzKBy8fjLqZyMU"},
            "/LICENSE":{"inManifest":"/LICENSE","txId":"J9gZTqqKo1iKEkDG_yb7BLOWUxDvaACUglZoLSTTNNg"},
            "/README.md":{"inManifest":"/README.md","txId":"riNTxojNuS08X-ijJ3TTYZgwI8deFSlA_Z02icfbMGo"},
            "/state_machine.ts":{"inManifest":"/state_machine.ts","txId":"w3ZpxY6Cg8-Hqym-GhyPp2iAo7HDS1nJETs-m49TcvQ"},
            "/types.ts":{"inManifest":"/types.ts","txId":"-Rbe-GnuasjFvWxImXmQTy-J6zq-14MQjOVIlcFvSaU"},
            "/utils.ts":{"inManifest":"/utils.ts","txId":"iimTAWWLbCTnuwQ-WBuMgEitDD5GFjt9Z2DcTW279jU"}
        },
        "createdAt":"2020-10-25T13:35:03.874Z"
    }

*/

/*
https://x.nest.land/api/package/kopo
{
    "name":"kopo",
    "normalizedName":"kopo",
    "owner":"littletof",
    "description":"A Deno registry browser in the terminal",
    "repository":"https://github.com/littletof/kopo-cli",
    "latestVersion":"kopo@v0.0.2",
    "latestStableVersion":null,
    "packageUploadNames":["kopo@v0.0.2"],
    "locked":null,
    "malicious":null,
    "unlisted":false,
    "updatedAt":"2020-10-25T13:35:03.883Z",
    "createdAt":"2020-10-25T13:35:01.706Z"
}

*/