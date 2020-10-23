import { colors } from './deps.ts';


export function upInCL(num: number = 1) {
    return `\x1B[${num}A`;
}

export function backspace(num: number = 1) {
    return '\u0008'.repeat(num);
}

export function menuState(name: string, disabled: boolean) {
    if(!disabled) {
        return colors.bold(colors.white(name));
    } else {
        return colors.gray(name);
    }
}

export async function fetchJSON(path: string) {
    return await ((await fetch(path)).json());
}
export async function fetchText(path: string) {
    return await ((await fetch(path)).text());
}