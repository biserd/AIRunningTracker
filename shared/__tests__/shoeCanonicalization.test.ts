import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalizeShoeCatalog, canonicalizeComparisons, normalizedShoeModelKey } from '../shoeCanonicalization';
const shoes = [
  {id:1,brand:'ASICS',model:'Gel-Nimbus 27',slug:'asics-gel-nimbus-27',lastVerified:'2026-09-26'},
  {id:2,brand:'ASICS',model:'Nimbus 27',slug:'asics-nimbus-27'},
  {id:3,brand:'ASICS',model:'Gel-Nimbus 28',slug:'asics-gel-nimbus-28'},
  {id:4,brand:'ASICS',model:'Gel-Nimbus 27 TR',slug:'asics-gel-nimbus-27-tr'},
];
test('explicit aliases consolidate, but versions and variants stay separate', () => {
  const result = canonicalizeShoeCatalog(shoes);
  assert.equal(result.canonicalShoes.length,3);
  assert.equal(result.aliasToCanonical.get('asics-nimbus-27'),'asics-gel-nimbus-27');
  assert.equal(normalizedShoeModelKey({brand:'New Balance',model:'Fresh Foam X 1080v14'}),normalizedShoeModelKey({brand:'New Balance',model:'1080 v14'}));
  assert.notEqual(normalizedShoeModelKey(shoes[0]), normalizedShoeModelKey(shoes[3]));
  assert.notEqual(normalizedShoeModelKey({brand:'ASICS',model:'Nimbus 27 Womens'}),normalizedShoeModelKey({brand:'ASICS',model:'Nimbus 27 Mens'}));
});
test('comparison pairs consolidate regardless of order, orphan rows excluded, identical models redirect to shoe', () => {
  const result = canonicalizeComparisons([
    {id:1,slug:'canonical',shoe1Id:1,shoe2Id:3},
    {id:2,slug:'alias',shoe1Id:2,shoe2Id:3},
    {id:3,slug:'reverse',shoe1Id:3,shoe2Id:1},
    {id:4,slug:'same-model',shoe1Id:1,shoe2Id:2},
    {id:5,slug:'orphan',shoe1Id:1,shoe2Id:999},
  ],shoes);
  assert.deepEqual(result.canonicalComparisons.map(c=>c.slug), ['canonical']);
  assert.equal(result.aliasToCanonical.get('alias'),'canonical');
  assert.equal(result.aliasToCanonical.get('reverse'),'canonical');
  assert.equal(result.collapsedToShoe.get('same-model'),'asics-gel-nimbus-27');
});
