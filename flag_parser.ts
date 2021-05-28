// Copyright 2020- Szalay Kristóf. All rights reserved. MIT license.
const FtoEMap: any = {
    "--unstable": '🚧',
    "--allow-net": "🌐",
    "--allow-read": "🔍",
    "--allow-write": "💾",
    "--allow-hrtime": "⏱",
    "--allow-run": "⚠",
    "--allow-all": "🔮",
    "--allow-env": "🧭",
    "--allow-plugin": "🧩",
}

const flagRegexp = new RegExp(/\| .*\s?\`(--[^`]*)\`\s*\|([\s_\*(?:Y|yes)]*)\|(?:([^\|\n]*)\|)?/g);

export function flagToEmoji(flag: string) {
    return FtoEMap[flag];
}

export function toEmojiList(flags?: {required: {flag: string, description?: string}[], optional: {flag: string, description?: string}[]}) {
    return flags ? `${flags.required?.map(f => flagToEmoji(f.flag)).join(" ")}` + (flags.optional.length ? ` (${flags.optional?.map(f => flagToEmoji(f.flag)).join(" ")})` : '') : '-'; // TODO undefined flags
}

export const enum FlagType {
    "--unstable",
    "--allow-net",
    "--allow-read",
    "--allow-write",
    "--allow-hrtime",
    "--allow-run",
    "--allow-all",
    "--allow-env",
    "--allow-plugin",
    // TODO location?!
}

export interface Flags {
    required: {flag: FlagType, description?: string}[];
    optional: {flag: FlagType, description?: string}[];
}
export function getFlags(text: string): Flags | undefined {
    let result;
    const required = [];
    const optional = [];

    while((result = flagRegexp.exec(text)) !== null) {
        const flag = {
            flag: result[1] as unknown as FlagType,
            description: result[3].trim()
        }

        // _ -> ignore
        if(result[2].includes('_')){ continue; }

        // \* or yes -> required
        if(/\s*(\*|[Yy]es)\s*/.test(result[2])) {
            required.push(flag);
        } else {
            optional.push(flag);
        }
    }

    if(!required.length && !optional.length) {
        return undefined;
    }
    
    return {
        required,
        optional
    }
}