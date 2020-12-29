import { getFlags } from './flag_parser.ts';

if(!Deno.args?.[0]) {
    console.log('Please provide a path or url to the file to test');
}

const path = Deno.args[0];
try {
    let text;
    if(/https?:\/\//.test(path)) {
        console.log(`Trying to fetch remote file: ${path}`);
        const resp = await fetch(path);
        text = await resp.text();
    } else {
        console.log(`Trying to read file: ${path}`);
        text = Deno.readTextFileSync(path);
    }

    const flags = getFlags(text);

    if(flags) {
        console.log('The retrieved flags: \n');
        console.log(flags);
        console.log('\n');
    } else {
        console.log('\nCouldn\'t retrieve any flags\n');
    }

} catch {
    console.error('Couldn\'t read file. Make sure --allow-read or --allow-net flag is provided.');
}
