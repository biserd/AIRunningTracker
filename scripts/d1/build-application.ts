import {build} from 'esbuild';
import {resolve,dirname} from 'node:path';

const root=resolve('.');
await build({entryPoints:['server/index.ts'],platform:'node',packages:'external',bundle:true,
  format:'esm',jsx:'automatic',outfile:'dist/d1-index.mjs',
  plugins:[{name:'isolated-d1-application',setup(builder){
    builder.onResolve({filter:/.*/},args=>{
      const file=args.path.startsWith('.')?resolve(dirname(args.importer),args.path):args.path;
      const normalized=file.replaceAll('\\','/').replace(/\.ts$/,'');
      if(args.path==='@shared/schema'||normalized===resolve(root,'shared/schema').replaceAll('\\','/'))return {path:resolve(root,'shared/schema.d1.ts')};
      if(normalized===resolve(root,'server/db').replaceAll('\\','/'))return {path:resolve(root,'server/d1/runtimeDatabase.ts')};
      if(normalized===resolve(root,'server/storageAtomic').replaceAll('\\','/'))return {path:resolve(root,'server/d1/atomicStorage.ts')};
      if(normalized===resolve(root,'server/runtimeServices').replaceAll('\\','/'))return {path:resolve(root,'server/d1/runtimeServices.ts')};
      if(normalized===resolve(root,'server/stripeWebhookVerification').replaceAll('\\','/'))return {path:resolve(root,'server/d1/stripeWebhookVerification.ts')};
      return undefined;
    });
  }}],
});
console.log('D1 application bundle built. Not deployed; PostgreSQL-only operations remain explicit errors.');
