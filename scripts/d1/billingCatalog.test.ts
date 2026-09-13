import {test} from 'node:test';
import assert from 'node:assert/strict';
import type Stripe from 'stripe';
import {BillingCatalog} from '../../server/services/billingCatalog';

function setup(){
  let requests=0,now=0,fail=false;
  const products=[{id:'prod_runner',name:'Premium',description:null,metadata:{plan:'premium'},active:true},
    {id:'prod_other',name:'Other',description:null,metadata:{},active:true}];
  const prices=[{id:'price_month',product:'prod_runner',active:true,created:1,metadata:{},unit_amount:799,currency:'usd',recurring:{interval:'month'}},
    {id:'price_year',product:'prod_runner',active:true,created:2,metadata:{},unit_amount:7999,currency:'usd',recurring:{interval:'year'}},
    {id:'price_other',product:'prod_other',active:true,created:3,metadata:{},unit_amount:123,currency:'usd',recurring:null}];
  const client={products:{list:async()=>{requests++;if(fail)throw new Error('PROVIDER_DOWN');return {data:products,has_more:false};}},
    prices:{list:async()=>{requests++;return {data:prices,has_more:false};}}} as unknown as Pick<Stripe,'prices'|'products'>;
  return {catalog:new BillingCatalog(async()=>client,()=>now),requests:()=>requests,expire:()=>{now+=60_001;},fail:()=>{fail=true;}};
}

test('catalog resolves Premium prices and rejects unrelated or malformed checkout IDs',async()=>{
  const {catalog}=setup();
  assert.equal(await catalog.resolvePremium('monthly'),'price_month');
  assert.equal(await catalog.resolvePremium('annual'),'price_year');
  assert.equal(await catalog.isAllowed('price_month',[]),true);
  assert.equal(await catalog.isAllowed('price_other',[]),false);
  assert.equal(await catalog.isAllowed('price_missing',[]),false);
  assert.equal(await catalog.isAllowed({id:'price_month'},[]),false);
  assert.equal(await catalog.isAllowed('price_pinned',['price_pinned']),true);
  assert.equal(await catalog.interval('price_year'),'year');
  const publicProducts=await catalog.publicProducts();
  assert.deepEqual(Object.keys(publicProducts[0].prices[0]).sort(),['currency','id','metadata','recurring','unit_amount']);
});

test('catalog coalesces concurrent loads and fails closed after cache expires',async()=>{
  const {catalog,requests,expire,fail}=setup();
  await Promise.all([catalog.publicProducts(),catalog.resolvePremium('monthly'),catalog.isAllowed('price_year',[])]);
  assert.equal(requests(),2);
  expire();fail();
  await assert.rejects(catalog.resolvePremium('monthly'),/PROVIDER_DOWN/);
  await assert.rejects(catalog.isAllowed('price_month',[]),/PROVIDER_DOWN/);
  assert.equal(await catalog.resolvePremium('monthly','price_pinned'),'price_pinned');
});

test('catalog refuses a truncated provider catalog instead of silently accepting partial results',async()=>{
  let requests=0;
  const client={products:{list:async()=>{requests++;return {data:[{id:`prod_${requests}`}],has_more:true};}}} as unknown as Pick<Stripe,'prices'|'products'>;
  await assert.rejects(new BillingCatalog(async()=>client).publicProducts(),/BILLING_CATALOG_LIMIT/);
  assert.equal(requests,10);
});
