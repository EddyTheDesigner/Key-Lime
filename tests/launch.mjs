import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),config=fileURLToPath(new URL('app-config/',import.meta.url));
await mkdir(config,{recursive:true});
const child=spawn('C:/Program Files/EffectCraft/effectcraft.exe',['--control','9877','--empty'],{cwd:root,env:{...process.env,EFFECTCRAFT_CONFIG_DIR:config},windowsHide:true,detached:true,stdio:'ignore'});child.unref();console.log('Isolated EffectCraft test instance: '+child.pid);
