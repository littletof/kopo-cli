import { Select } from './deps.ts';
import { deno_land } from "./registries/deno_land.ts";
import { nest_land } from "./registries/nest_land.ts";
import {stateMachine, getMenu} from './state_machine.ts';
import { MenuItem, State, WorkingMemory } from "./types.ts";
import { backspace, upInCL } from "./utils.ts";
/*  

        /\  /\
       |  ||  |
 ..___[.][.]   \                          ________
 |              \                        /  ______|
  \_____         \______________________/  /
        |                                 /
        \                                 |
         \                                |
         |    |       _____________|      /
      ____|__/    ___/         \_  \     |
     / __________/               \  |\   |
    |_|   |  |                   |  | |  |
          |  |                   |  | |  |
        _/  /                  _/  / _/  /
       |___/                  |___/ |___/        
____________________________________________________
                    KOPO CLI
*/

const workingMemory: WorkingMemory = {
    state: State.select_registry,
    registries: {
        'deno.land': deno_land,
        'nest.land': nest_land
    }
};

Deno.stdout.writeSync = ((x: any) => { console.log(new TextDecoder().decode(x) + upInCL(1));}) as any;

let selectedMenu;
while(selectedMenu !== MenuItem.exit) {
  selectedMenu = await showModuleMenu(workingMemory);
  console.log(`\r${upInCL(2)}`);
  await stateMachine[workingMemory.state](workingMemory, selectedMenu!);
}

async function showModuleMenu(workingMem: WorkingMemory) {

    const currentMenu = await getMenu(workingMem);

    if(!currentMenu) {
        return;
    }

    return await Select.prompt({
      message: `${backspace(5)}${currentMenu?.title}`,
      options: currentMenu!.options,
      keys: {
        // arrows doesnt work on windows: https://github.com/c4spar/deno-cliffy/issues/47
        previous: [ 'up', 'w' ],
        next: [ 'down', 's' ]
      },
      default: currentMenu!.default,
      maxRows: 17,
    });
}