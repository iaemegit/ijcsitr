import test from 'node:test';
import assert from 'node:assert/strict';
import {serializeDatabase} from './db.ts';
test('Prisma IDs, counts and timestamps are safe in REST JSON responses',()=>{
  const result=serializeDatabase({id:12n,count:122n,created:new Date('2026-10-21T10:15:30.123Z'),items:[{id:3n}],missing:null});
  assert.equal(JSON.stringify(result),'{"id":12,"count":122,"created":"2026-10-21 10:15:30.123","items":[{"id":3}],"missing":null}');
});
test('Prisma IDs outside JavaScript safe integer range are not silently rounded',()=>{
  assert.throws(()=>serializeDatabase({id:9007199254740993n}),RangeError);
});
