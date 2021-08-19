import { Args, renderMarkdown } from "../deps.ts";
import { Theme } from "../theme.ts";
import { UI } from "../ui.ts";

export class HelpPage {
    static async show(args: Args, options?: {}) {
        console.log(renderMarkdown(`**KOPO CLI - Help**\n${HelpPage.helpText}`, {listIcons: ['', '  '], extensions: [{generateNode: (gnfn, node) => {if(node.type==="link"){return `${node.children![0].value}: ${Theme.accent(node.url!)}`}}}]}));

        await UI.selectList({
            message: '              ',
            options: [
                UI.listOptions.back
            ]
        })
    }

    static readonly helpText = `
[Version](${/*TODO*/'v0.1.0'})
[Repository](https://github.com/littletof/kopo-cli)
[Feedback](https://github.com/littletof/kopo-cli/issues)

- **UI**:
    - browse
    - search
    - registries
    - settings
    - help


- **Commands**:
    - search
    - settings
`;
}