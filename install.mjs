import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {join} from 'node:path';
const target=join(process.env.APPDATA||'','EffectCraft','Scripts','ScriptUI Panels','Key Lime.jsx');
if(!process.env.APPDATA)throw Error('This installer is for Windows. Install dist/Key Lime.jsx through EffectCraft’s File → Scripts menu on other platforms.');
const source=new URL('dist/Key Lime.jsx',import.meta.url);
const data=await readFile(source);
try{const old=await readFile(target);if(!old.equals(data)){const archive=new URL('archive/',import.meta.url);await mkdir(archive,{recursive:true});await writeFile(new URL('Key Lime-'+Date.now()+'.jsx',archive),old);}}catch(e){if(e.code!=='ENOENT')throw e;}
await mkdir(join(process.env.APPDATA,'EffectCraft','Scripts','ScriptUI Panels'),{recursive:true});
await copyFile(source,target);console.log('Installed '+target);
