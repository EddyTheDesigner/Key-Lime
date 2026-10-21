import net from 'node:net';
export async function rpc(method,params={}){
 return await new Promise((resolve,reject)=>{const s=net.createConnection({host:'127.0.0.1',port:9877});let b='';s.setTimeout(30000);s.on('connect',()=>s.write(JSON.stringify({id:1,method,params})+'\n'));s.on('data',d=>{b+=d;if(b.includes('\n')){s.end();const r=JSON.parse(b.split('\n')[0]);if(!r.ok||r.result?.ok===false)reject(Error(r.error||JSON.stringify(r.result.error)));else resolve(r.result);}});s.on('error',reject);s.on('timeout',()=>{s.destroy();reject(Error('EffectCraft timed out'));});});
}
export const cmd=(command,params={})=>rpc('engine.execute',{command,params});
export const script=code=>cmd('script.run',{name:'Key Lime verification',code});
export function walk(n){return [n,...(n.children||[]).flatMap(walk)];}
