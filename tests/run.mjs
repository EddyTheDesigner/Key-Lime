import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url),script=new URL('generated-tests.jsx',import.meta.url);
await writeFile(script,await readFile(new URL('src/core.js',root),'utf8')+'\n'+await readFile(new URL('engine-tests.js',import.meta.url),'utf8'));
const cli='C:/Program Files/EffectCraft/effectcraft-cli.exe';
try{const out=execFileSync(cli,['script',fileURLToPath(script),'--empty'],{encoding:'utf8',windowsHide:true,timeout:120000});await writeFile(new URL('engine-results.txt',import.meta.url),out);console.log(out);}catch(e){console.error(e.stdout?.toString(),e.stderr?.toString());process.exitCode=1;}
