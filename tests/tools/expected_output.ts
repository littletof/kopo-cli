import {runPrompt} from '../integration/test.ts';

/**
 You need 2 `\x1b[A` at the end of the file, to get the proper output.
 If you put one at the start, then one after each eg. arrow input, you will get the output for each step.
 */
const inputPath = new URL('exp.in', import.meta.url).href.replace(/file:\/\/\/?/, "");
const outputPath = new URL('exp.out', import.meta.url).href.replace(/file:\/\/\/?/, "");

const result = (await runPrompt(inputPath))

console.log(JSON.stringify(result.split('##CLSX##'), undefined, ' '));

const parsedOutput = result.replace("#END#", "")
                            .split('##CLSX##')
                            .at(-1);

Deno.writeFileSync(outputPath, new TextEncoder().encode(parsedOutput));
console.log('DONE');