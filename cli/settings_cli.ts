import { Args } from "../deps.ts";
import { Settings } from "../settings.ts";

export async function settingsCLI(args: Args) {
    if(args._.length < 2) {
        console.error('Settings command needs export or import subcommand');
    }

    switch(args._[1]) {
        case "export":
            await exportSettings(args._[2] as any);
            break;
        case "import":
            await importSettings(args._[2] as any, {yes: args.yes})
            break;
    }
}

async function exportSettings(path?: string) {

    if(!Settings.isSettingsAvailable()) {
        throw new Error('No settings are available. Have you provided the --location flag?');
    }

    const exportPath = path ?? `./${getExportFileName()}`;

    await Deno.permissions.request({name: 'write', path: exportPath});
    Deno.writeTextFileSync(exportPath, JSON.stringify(await Settings.getAllSetOptions(), undefined, 4));
}

async function importSettings(path: string, options: {yes?: boolean}) {
    if(!Settings.isSettingsAvailable()) {
        throw new Error('No settings are available. Have you provided the --location flag?');
    }

    if(options.yes || confirm('Importing settings will overwrite the current settings. Do you want to continue?')) {
        await Deno.permissions.request({name: 'read', path});
        const settingsText = Deno.readTextFileSync(path);
        const settings = JSON.parse(settingsText);

        await Settings.clearAllOptions();
        await Promise.all(
            settings.map((is: any) => {
                Settings.setOption(is.key, is.value);
            })
        );

        console.log(`Settings were successfully imported from ${path}`);
    }

}

function getExportFileName() {
    return `kopo_cli_settings_${Intl.DateTimeFormat('hu').format(new Date()).replaceAll(/\.\s/g, '_').replaceAll(/\./g, '')}.json`;
}