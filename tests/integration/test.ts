import {
    assertEquals,
    dirname,
    expandGlob,
    WalkEntry,
    iter
} from "../test_deps.ts";

import { upInCL } from "../../utils.ts";
  
  const baseDir = `${dirname(import.meta.url).replace("file://", "")}`;
  
  for await (const file: WalkEntry of expandGlob(`${baseDir}/fixtures/*.in`)) {
    if (file.isFile) {
      const name = file.name.replace(/_/g, " ").replace(".in", "");
      Deno.test({
        name: `kopo - integration - ${name}`,
        async fn() {
          const output: string = await runPrompt(file.path);
          const expectedOutput: string = await getExpectedOutput(file.path);
          // console.log(JSON.stringify(cleanOutput(output).split('##CLSX##')));
          assertEquals(
            cleanOutput(output)
              .replace("#END#", "")
              .split('##CLSX##')
              .at(-1),
            expectedOutput
              .replace(/\r\n/g, "\n")

          );
        }
      });
    }
  }

  function cleanOutput(output: string) {
    return output
            .replaceAll(/\r\n/g, "\n")
            .replaceAll('\x1Bc', "##CLS-KOPO##") // used by Kopo
            .replaceAll('\u001b[0J', '##CLSX##') // cls
            .replaceAll(upInCL(1) + " ".repeat(70) + upInCL(1)+'\n', '##cl-up2##')
            .replaceAll('\u001b[?25l', ''/* , '#l#' */) // hidecursor
            .replaceAll('\u001b[?25h', ''/* , '#h#' */) // showcursor
            //.replaceAll('\u001b[6A', ''/* , '#˘#' */) // cursor up 6
            .replaceAll('\u001b[G', ''/* , '#g#' */) // cursor stuff?
            // .replaceAll('\u001b[17G', '') // cursor horizontal absolute. 
            .replace(/\u001b\[[0-9]+m/g, '') // text formatting
            .replaceAll('\b', '×')
            .replaceAll(/\u001b\[(\d+)G/g, '##cha$1##') // cursor horizontal absolute. 1 = first char of the line
            .replaceAll(/\u001b\[(\d+)A/g,"##up$1##") // cursor up \d
            .replace(/##CLSX##$/g, '#END#') // clsx at the end
            // .replaceAll(/\n[^×\n]*×+/g, '\n') // clear before backspace
  } 
  
  async function getExpectedOutput(path: string) {
    const osOutputPath = path.replace(/\.in$/, `.${Deno.build.os}.out`);
    try {
      return await Deno.readTextFile(osOutputPath);
    } catch (_) {
      const outputPath = path.replace(/\.in$/, ".out");
      return await Deno.readTextFile(outputPath);
    }
  }
  
  function getCmdFlagsForFile(filePath: string): string[] {
    /* if (file.name === "input_no_location_flag.ts") {
      return [
        "--unstable",
        "--allow-all",
      ];
    }
    return [
      "--unstable",
      "--allow-all",
      "--location",
      "https://kopo.mod.land",
    ]; */
    return [
      "--allow-net", // TODO minimal
      "--allow-read", // TODO min glob
      "--unstable",
    ]
  }
  
  export async function runPrompt(filePath: string): Promise<string> {
    const inputText = await Deno.readTextFile(filePath);
    const flags = getCmdFlagsForFile(filePath);
    const process = Deno.run({
      stdin: "piped",
      stdout: "piped",
      cmd: [
        "deno",
        "run",
        ...flags,
        'mod.ts',
        "-r", new URL('../test_registry.ts', import.meta.url).href, // TODO not always needed, eg. registrySelect
      ],
      env: {
        NO_COLOR: "true",
      },clearEnv:true
    });   


    let result = '';
    process.stdin.write(new TextEncoder().encode(inputText)).then(async _ => {await process.stdin.write(new TextEncoder().encode('\u0003'));/* Simulate CTRL+C */});
    for await (let a of iter(process.stdout)) {
      result += new TextDecoder().decode(a);
    }

    process.stdin.close();
    process.stdout.close();
    process.close();
  
    // assert(bytesCopied > 0, "No bytes copied");
  
    return cleanOutput(result);
  }