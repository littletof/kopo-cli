import { Input, Select } from "./deps.ts";
import { MenuItem, State, StateAction, WorkingMemory } from "./types.ts";
import { backspace, menuState, separator } from "./utils.ts";

export const stateMachine: {[key: string]: StateAction} = {
    [State.select_registry]: async (workingMem: WorkingMemory, selectedMenu: string) => {
        workingMem.registry = selectedMenu;
        workingMem.page = 1;
        workingMem.pageSize = 10;
        workingMem.state = State.registry_home;
        if(selectedMenu === MenuItem.exit) {
            Deno.exit();
        }

        await workingMem.registries[selectedMenu].init(workingMem);
    },
    [State.registry_home]: async (workingMem: WorkingMemory, selectedMenu: string) => {
        switch (selectedMenu) {
            case MenuItem.next_page: workingMem.page!++; break;
            case MenuItem.prev_page: workingMem.page!--; break;
            case MenuItem.back: workingMem.state = State.select_registry; break;
            case MenuItem.search_module: workingMem.state = State.search_module_input; break;
            default: workingMem.state = State.module_info; workingMem.selectedModule = selectedMenu; break;
        }
    },
    [State.search_module_input]: (workingMem: WorkingMemory) => {workingMem.state = State.search_module},
    [State.search_module]: async (workingMem: WorkingMemory, selectedMenu: string) => {
        switch (selectedMenu) {
            case MenuItem.back: workingMem.query = undefined; workingMem.state = State.registry_home; break;
            default: workingMem.state = State.module_info; workingMem.selectedModule = selectedMenu; break;
        }
    },
    [State.module_info]: async (workingMem: WorkingMemory, selectedMenu: string) => {
        switch (selectedMenu) {
            case MenuItem.back: workingMem.state = workingMem.query ? State.search_module : State.registry_home; break;
            default: await workingMem.moduleInfoActions![selectedMenu](); break;
        }
    },
    [State.exit]: () => {}
};

export async function getMenu(workingMem: WorkingMemory) {
    switch(workingMem.state) {
        case State.select_registry:
            return {
                title: 'Select registry', 
                options: [
                    Select.separator(""),
                    ...Object.keys(workingMem.registries).map(r => ({name: workingMem.registries[r].name, value: r})),
                    Select.separator(""),
                    Select.separator(separator()),
                    {name: 'Exit', value: MenuItem.exit}
                ]};
        case State.registry_home:
            const rMenu = await workingMem.registries[workingMem.registry!].getModulesPage(workingMem, workingMem.page!, workingMem.pageSize!);
            const totalPages = Math.ceil(workingMem.totalModules! / workingMem.pageSize!);
            return {
                title: workingMem.registry,
                default: workingMem.page !== totalPages ? menuState("Next page", workingMem.page === totalPages): menuState("Previous page", workingMem.page === 1),
                options: [
                    Select.separator(""),
                    ...rMenu,
                    Select.separator(""),
                    Select.separator(`---- ${workingMem.page} / ${totalPages} (${workingMem.totalModules} modules)----`),
                    { name: menuState("Next page", workingMem.page === totalPages), value: MenuItem.next_page, disabled: workingMem.page === totalPages },
                    { name: menuState("Previous page", workingMem.page === 1), value: MenuItem.prev_page, disabled: workingMem.page === 1 },
                    { name: "Search Module", value: MenuItem.search_module},
                    { name: "Back", value: MenuItem.back},
                ],
            };
        case State.search_module_input:
            workingMem.query = await Input.prompt(`${backspace(5)}Searching for module: `);
            workingMem.page = 1;
            return;
        case State.search_module:
            const qMenu = await workingMem.registries[workingMem.registry!].getModulesPage(workingMem, workingMem.page!, workingMem.pageSize!, workingMem.query);
            return {
                title: `Searching in ${workingMem.registry} for: "${workingMem.query}"`,
                options: [
                    Select.separator(""),
                    ...qMenu,
                    Select.separator(""),
                    Select.separator(`---- Searching for: "${workingMem.query}" ----`),
                    { name: "Back", value: MenuItem.back},
                ]
            };
        case State.module_info:
            const infoOptions = await workingMem.registries[workingMem.registry!].showInfoPage(workingMem, workingMem.selectedModule!);
            return {
                title: `${backspace(5)}Action:`,
                options: [
                    ...infoOptions as any,
                    { name: "Back", value: MenuItem.back}
                ]
            };
    }
}