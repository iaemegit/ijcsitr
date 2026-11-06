import { spawn,execFile } from 'node:child_process';
import { promisify } from 'node:util';
const child=spawn(process.execPath,['server/index.js'],{env:{...process.env,PORT:'4001'},windowsHide:true,stdio:['ignore','pipe','pipe']});
try {
  await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('MySQL search test server did not start')),15000);child.stdout.on('data',data=>{if(data.toString().includes('IJCSITR API:')){clearTimeout(timeout);resolve();}});child.on('error',reject);child.on('exit',code=>{clearTimeout(timeout);reject(new Error('MySQL search test server exited '+code));});});
  const {stdout}=await promisify(execFile)(process.execPath,['scripts/smoke.mjs'],{env:{...process.env,TEST_URL:'http://127.0.0.1:4001'},windowsHide:true});
  process.stdout.write(stdout);
} finally {child.kill();}
