import { Args, parse } from "./deps.ts";
import { KopoOptions, Settings } from "./settings.ts";
import { Theme } from "./theme.ts";
import { HomePage } from "./pages/home_page.ts";
import { UI } from "./ui.ts";
import { settingsCLI } from "./cli/settings_cli.ts";
import { RegistryHandler } from "./registries/registry_handler.ts";
import { search } from "./cli/search_cli.ts";
import { upInCL } from "./utils.ts";

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

// deno run --allow-net --no-check --unstable --location https://kopo.land index.ts ui
// deno run --allow-net --no-check --unstable --location https://kopo.land --allow-write --allow-read index.ts settings import ./test.json --yes

async function startUI(args: Args) {
  if (await Settings.getKopoOption(KopoOptions.cls)) {
    UI.cls();
  }

  if(await Settings.getKopoOption(KopoOptions.winprint)) {
    Deno.stdout.write = ((x: any) => { console.log(new TextDecoder().decode(x) + upInCL(1));}) as any;
  }

  console.log(); // so upInCL+clear doesnt jump

  await HomePage.show(args);
}

async function run() {
  const parsedArgs = parse(Deno.args, {
    boolean: ["json", "readme", "readme-raw", "exact", "yes", "flags"],
    alias: { e: "exact", v: "version", y: "yes" },
  });

  await Theme.init();
  await RegistryHandler.initRegistries(parsedArgs);

  if (parsedArgs._?.length) {
    const cmd = parsedArgs._[0];

    switch (cmd) {
      case "search":
        await search(parsedArgs);
        break;
      case "ui":
        await startUI(parsedArgs);
        break;

      case "settings": {
        await settingsCLI(parsedArgs);
        break;
      }
    }
  } else {
    await startUI(parsedArgs);
  }
}

await run();

// deno run --allow-net --no-check index.ts search pretty
// deno run --allow-net --no-check index.ts search pretty --json
// deno run --allow-net --no-check index.ts search pretty_benching -e
// deno run --allow-net --no-check index.ts search pretty_benching -e --version v0.0.3
// deno run --allow-net --no-check index.ts search pretty_benching -e --json
// deno run --allow-net --no-check index.ts search pretty_benching -e --readme
// deno run --allow-net --no-check index.ts search pretty_benching -e --readme-raw

// ---------
// --no-prompt
//      if no registry is defined (-d / -n) in a --readme search eg., select deno, or next in line.
//      otherwise, if found in multiple registries give a prompt for the user to select from. but they should be the same...
// -e --detailed
//      gives all versions, others from json output + readme by default?!
// search from an import route
//      kopo find?? https://deno.land/x/kopo@v0.0.2/parse_flags.ts -> kopo search kopo -e -v v0.0.2

// TODO test with module husky
