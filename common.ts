import { renderMarkdown } from "https://deno.land/x/charmd@v0.0.1/mod.ts";
import { KopoOptions, Settings } from "./settings.ts";

export async function printReadme(text: string) {
    let readme = text;
    if(!await Settings.getKopoOption(KopoOptions.rawreadme)){
        readme = renderMarkdown(text);
    }

    console.log(readme);

    return readme.split('\n').length;
}