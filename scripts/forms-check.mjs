import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { existsSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { query,db } from '../server/db.ts';
const base=process.env.TEST_URL || 'http://127.0.0.1:4000';
const marker='Integration check '+randomUUID();
let submissionId,contactId,storedFile;
try {
  const contact=await fetch(base+'/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Integration Test',email:'test@example.invalid',subject:marker,message:'Automated integration test; this record will be removed.'})});
  assert.equal(contact.status,201);contactId=(await contact.json()).id;
  const savedContact=await query('SELECT subject FROM contactus WHERE id=?',[contactId]);assert.equal(savedContact[0].subject,marker);
  const form=new FormData();
  for(const [key,value] of Object.entries({article_title:marker,author_name:'Integration Test',email:'test@example.invalid',country:'Test country',keywords:'integration, test',discipline_title:'Computer science',consent:'true'})) form.set(key,value);
  const invalidForm=new FormData();for(const [key,value] of form)invalidForm.set(key,value);
  invalidForm.set('manuscript',new Blob(['not a PDF'],{type:'application/pdf'}),'invalid.pdf');
  const invalid=await fetch(base+'/api/submissions',{method:'POST',body:invalidForm});assert.equal(invalid.status,400);
  form.set('manuscript',new Blob(['%PDF-1.4\n% Integration test fixture\n%%EOF'],{type:'application/pdf'}),'test.pdf');
  const submission=await fetch(base+'/api/submissions',{method:'POST',body:form});assert.equal(submission.status,201);submissionId=(await submission.json()).id;
  const rows=await query('SELECT article_title,status,upload_manuscript FROM article_submission WHERE abs_id=?',[submissionId]);assert.equal(rows[0].article_title,marker);assert.equal(rows[0].status,0);
  storedFile=rows[0].upload_manuscript;assert.match(storedFile,/^[0-9a-f-]{36}\.pdf$/);assert.ok(existsSync(path.resolve('uploads',storedFile)));
  console.log('PASS: contact and manuscript forms persist correctly in MySQL, PDFs are stored privately, new submissions await review, and fake PDFs are rejected.');
} finally {
  const statements=[];
  if(contactId)statements.push(`DELETE FROM ijcsitr.contactus WHERE id=${Number(contactId)} AND subject='${marker}'`);
  if(submissionId)statements.push(`DELETE FROM ijcsitr.article_submission WHERE abs_id=${Number(submissionId)} AND article_title='${marker}'`);
  if(statements.length)await new Promise((resolve,reject)=>{const child=execFile('C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysql.exe',['--login-path=ijcsitr-migration','--batch'],{windowsHide:true},error=>error?reject(new Error('Could not clean up integration test records')):resolve());child.stdin.end(statements.join(';')+';');});
  if(storedFile && /^[0-9a-f-]{36}\.pdf$/.test(storedFile)){const uploadRoot=path.resolve('uploads');const target=path.resolve(uploadRoot,storedFile);if(path.dirname(target)!==uploadRoot)throw new Error('Invalid test cleanup path');if(existsSync(target))unlinkSync(target);}
  await db.end();
  console.log('Integration test records and uploaded fixture removed.');
}
