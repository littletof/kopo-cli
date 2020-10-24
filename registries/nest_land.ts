// Copyright 2020- Szalay Kristóf. All rights reserved. MIT license.
import { colors } from "../deps.ts";
import { RegistryDef, WorkingMemory } from "../types.ts";

interface NestWorkingMem extends WorkingMemory{
    nestModules: {name: string, description: string}[];
}

export const nest_land: RegistryDef<NestWorkingMem> = {
    name: "🥚 x.next.land",
    init: async (workingMem: NestWorkingMem) => {
        const response = await ((await fetch(`https://x.nest.land/api/packages`)).json());
        workingMem.nestModules = response;
        workingMem.totalModules = response.length;
    },
    getModulesPage: (workingMem: NestWorkingMem, page: number, pageSize: number, query?: string) => {
        const filteredModules = query ? (workingMem.nestModules as any[]).filter(m => (m.name as string).indexOf(query) !== -1 || m.description.indexOf(query) !== -1) : (workingMem.nestModules as any[]);
        const modulesOnPage = (filteredModules as any[]).slice((page-1) * pageSize, Math.min(filteredModules.length, page * pageSize));
        return modulesOnPage.map(m => ({name: `${colors.green(m.name.padEnd(15))} - ${(m.description as string)?.slice(0, 50)}`, value: m.name}));
    },
    showInfoPage: async (workingMem: NestWorkingMem, module: string) => {
        console.log();
        const moduleInfo = await ((await fetch(`https://x.nest.land/api/package/${module}`)).json());
        console.log(`Module: ${colors.bold(colors.magenta(module))}`);
        console.log(`Version: [${colors.yellow(moduleInfo.latestVersion)}] (${moduleInfo.updatedAt})`);
        console.log(`Repo: ${colors.brightCyan(moduleInfo.repository)}`);
        console.log(`Description: ${moduleInfo.description}`);
        console.log('-'.repeat(20));
        return [];
    }
}