import { execFile } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
if(existsSync('.env')) throw new Error('.env already exists; refusing to replace credentials.');
const mysql = process.env.MYSQL_CLI || 'C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysql.exe';
const password = randomBytes(32).toString('hex');
const user = 'ijcsitr_app';
const sql = `CREATE USER '${user}'@'127.0.0.1' IDENTIFIED BY '${password}'; GRANT SELECT ON ijcsitr.* TO '${user}'@'127.0.0.1'; GRANT INSERT ON ijcsitr.article_submission TO '${user}'@'127.0.0.1'; GRANT INSERT ON ijcsitr.contactus TO '${user}'@'127.0.0.1';`;
await new Promise((resolve,reject) => {
  const child = execFile(mysql,['--login-path=ijcsitr-migration','--batch'],{ windowsHide:true },error => error ? reject(new Error('Database account setup failed. Check your MySQL login profile and whether ijcsitr_app already exists.')) : resolve());
  child.stdin.end(sql);
});
writeFileSync('.env',`HOST=127.0.0.1\nPORT=4000\nMYSQL_HOST=127.0.0.1\nMYSQL_PORT=3306\nMYSQL_DATABASE=ijcsitr\nMYSQL_USER=${user}\nMYSQL_PASSWORD=${password}\n`,{ mode:0o600, flag:'wx' });
console.log('Created a limited application account. Local settings saved in ignored .env. Root credentials are not used by the app.');
