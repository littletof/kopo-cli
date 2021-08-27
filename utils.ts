// Copyright 2020- Szalay Kristóf. All rights reserved. MIT license.
import { colors } from './deps.ts';


export function upInCL(num: number = 1) {
    return `\x1B[${num}A`;
}

export function backspace(num: number = 1) {
    return '\u0008'.repeat(num);
}

export function separator(num: number = 20) {
    return '-'.repeat(num);
}

export function menuState(name: string, disabled: boolean) {
    if(!disabled) {
        return colors.bold(colors.white(name));
    } else {
        return colors.gray(name);
    }
}

export function paginateArray<T>(array: T[], page: number, pageSize: number) {
    return array.slice((Math.max(0, page)-1) * pageSize, Math.min(array.length, page * pageSize));
}

export async function fetchJSON(path: string): Promise<any> {
    try {
        return await ((await fetch(path)).json());
    } catch (e){
        return {error: true};
    }
}
export async function fetchText(path: string) {
    return await ((await fetch(path)).text());
}

export function random<T = any>(array: T[], take: number = 1) {
    // https://stackoverflow.com/a/19270021/1497170

    let result = new Array(take),
        len = array.length,
        taken = new Array(len);
    if (take > len)
        throw new RangeError("getRandom: more elements taken than available");
    while (take--) {
        var x = Math.floor(Math.random() * len);
        result[take] = array[x in taken ? taken[x] : x];
        taken[x] = --len in taken ? taken[len] : len;
    }
    return result;
}