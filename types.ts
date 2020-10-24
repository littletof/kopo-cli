// Copyright 2020- Szalay Kristóf. All rights reserved. MIT license.
import type { SelectValueOptions } from './deps.ts';

export interface RegistryDef<T extends WorkingMemory = WorkingMemory> {
    name: string;
    init: (workingMem: T) => Promise<void> | void | undefined;
    getModulesPage: (workingMem: T, page: number, pageSize: number, query?: string) => RegistryListItem[] | Promise<RegistryListItem[]>;
    showInfoPage: (workingMem: T, module: string) => void | Promise<void> | SelectValueOptions | Promise<SelectValueOptions>;
}

export interface RegistryListItem {
    name: string;
    value: string;
}

export type StateAction = (workingMem: WorkingMemory, selectedMenu: string) => void | Promise<void>;

export enum State {
    select_registry = 'select_registry',
    registry_home = 'registry_home',
    search_module = 'search_module',
    search_module_input = 'search_module_input',
    module_info = 'module_info',
    exit = 'exit'
}

export enum MenuItem {
    exit = 'exit_x',
    back = 'back_x',
    next_page = 'next_page_x',
    prev_page = 'prev_page_x',
    search_module = 'search_module_x'
}

export interface WorkingMemory {
    state: State;
    registries: {[key: string]: RegistryDef<any>};
    registry?: string;
    page?: number;
    pageSize?: number;
    query?: string;
    selectedModule?: string;
    moduleInfoActions?: {[key: string]: () => unknown}
    totalModules?: number;
}