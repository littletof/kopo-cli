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

const flagRegexp = new RegExp(/\| .*\s?\`(--[^`]*)\` \|([\s_\*]*)\|(?:([^\|\n]*)\|)?/g);

export function flagToEmoji(flag: string) {
    return FtoEMap[flag];
}

export function toEmojiList(flags: {required: {flag: string, description?: string}[], optional: {flag: string, description?: string}[]}) {
    return `${flags.required?.map(f => flagToEmoji(f.flag)).join(" ")}` + (flags.optional.length ? ` (${flags.optional?.map(f => flagToEmoji(f.flag)).join(" ")})` : '');
}

export function getFlags(text: string) {
    var result;
    const required = [];
    const optional = [];

    while((result = flagRegexp.exec(text)) !== null) {
        const flag = {
            flag: result[1],
            description: result[3]
        }

        if(result[2].includes('_')){ continue; }

        if(result[2].includes('*')) {
            required.push(flag);
        } else {
            optional.push(flag);
        }
    }

    if(!required.length && !optional.length) {
        return null;
    }
    
    return {
        required,
        optional
    }
}