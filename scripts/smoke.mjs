import assert from 'node:assert/strict';
const base=process.env.TEST_URL || 'http://127.0.0.1:4000';
async function get(path,status=200){const response=await fetch(base+path);assert.equal(response.status,status,path);return response.json();}
const health=await get('/api/health');assert.equal(health.mysql,true);assert.equal(health.searchMode,'mysql');
const journal=await get('/api/journal');assert.equal(journal.stats.articles,122);assert.ok(journal.latest.length);
const all=await get('/api/articles');assert.equal(all.total,122);assert.equal(all.articles.length,6);
const first=all.articles[0];const article=await get('/api/articles/'+first.article_id);assert.equal(article.article.article_id,first.article_id);assert.ok(article.article.authors.length);assert.equal(article.article.user_password,undefined);
const filtered=await get('/api/articles?year=2026');assert.ok(filtered.total>0);assert.ok(filtered.articles.every(a=>a.year==='2026'));
const paged=await get('/api/articles?page=2');assert.ok(!paged.articles.some(a=>all.articles.some(b=>a.article_id===b.article_id)));
const search=await get('/api/articles?q=cloud&sort=relevance');assert.ok(search.total>0);assert.equal(search.engine,'mysql');
const searchAgain=await get('/api/articles?q=cloud&sort=relevance');assert.deepEqual(searchAgain.articles.map(row=>row.article_id),search.articles.map(row=>row.article_id));
for(const sort of ['newest','oldest','title','popular','relevance']) { const result=await get('/api/articles?q=cloud&sort='+sort);assert.equal(result.engine,'mysql');assert.equal(result.total,search.total); }
for(const q of ['%','_',"' OR 1=1 --"]){ const result=await get('/api/articles?q='+encodeURIComponent(q));assert.equal(result.engine,'mysql');assert.ok(result.total<all.total); }
const author=first.authors[0].name;const byAuthor=await get('/api/articles?q='+encodeURIComponent(author)+'&sort=relevance');assert.ok(byAuthor.total>0);
const empty=await get('/api/articles?q=zzzznonexistent123456');assert.equal(empty.total,0);
await get('/api/articles?sort=invalid',400);await get('/api/articles?page=-1',400);await get('/api/articles/999999',404);await get('/api/articles/notanumber',400);
assert.ok((await get('/api/issues')).issues.length>0);const editors=await get('/api/editors');assert.ok(editors.editors.length>0);assert.ok(editors.editors.every(e=>!('editor_email' in e)));
const invalid=await fetch(base+'/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'X',email:'invalid',subject:'',message:''})});assert.equal(invalid.status,400);
const invalidUpload=await fetch(base+'/api/submissions',{method:'POST',body:new FormData()});assert.equal(invalidUpload.status,400);
const missing=await fetch(base+'/api/no-such-endpoint');assert.equal(missing.status,404);
console.log(`PASS: real MySQL data, article details, year filters, pagination, ${search.engine} search, author search, empty states, archives, editorial directory, input validation, and private-field protection.`);
