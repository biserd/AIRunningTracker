import type Stripe from 'stripe';

type CatalogClient=Pick<Stripe,'prices'|'products'>;
type PublicPrice=Pick<Stripe.Price,'id'|'unit_amount'|'currency'|'recurring'|'metadata'>;
export type BillingProduct={id:string;name:string;description:string|null;metadata:Stripe.Metadata;prices:PublicPrice[]};

/** Stripe is authoritative for checkout catalog data. No PostgreSQL mirror required. */
export class BillingCatalog {
  private cached:{at:number;prices:Stripe.Price[];products:Stripe.Product[]}|undefined;
  private loading:Promise<{prices:Stripe.Price[];products:Stripe.Product[]}>|undefined;
  constructor(private client:()=>Promise<CatalogClient>,private clock=Date.now){}

  private async load(){
    if(this.cached&&this.clock()-this.cached.at<60_000)return this.cached;
    if(this.loading)return this.loading;
    this.loading=(async()=>{
      const stripe=await this.client();
      const products:Stripe.Product[]=[],prices:Stripe.Price[]=[];
      const deadline=Date.now()+15_000;
      let cursor:string|undefined;
      for(let page=0;page<10;page++){
        if(Date.now()>=deadline)throw new Error('BILLING_CATALOG_TIMEOUT');
        const result:Stripe.ApiList<Stripe.Product>=await stripe.products.list({active:true,limit:100,...(cursor?{starting_after:cursor}:{})},
          {timeout:Math.min(5_000,deadline-Date.now()),maxNetworkRetries:0});
        products.push(...result.data);
        if(!result.has_more)break;
        if(!result.data.length||page===9)throw new Error('BILLING_CATALOG_LIMIT');
        cursor=result.data.at(-1)!.id;
      }
      cursor=undefined;
      for(let page=0;page<10;page++){
        if(Date.now()>=deadline)throw new Error('BILLING_CATALOG_TIMEOUT');
        const result:Stripe.ApiList<Stripe.Price>=await stripe.prices.list({active:true,limit:100,...(cursor?{starting_after:cursor}:{})},
          {timeout:Math.min(5_000,deadline-Date.now()),maxNetworkRetries:0});
        prices.push(...result.data);
        if(!result.has_more)break;
        if(!result.data.length||page===9)throw new Error('BILLING_CATALOG_LIMIT');
        cursor=result.data.at(-1)!.id;
      }
      const data={at:this.clock(),prices,products};
      this.cached=data;
      return data;
    })();
    try{return await this.loading;}finally{this.loading=undefined;}
  }

  async resolvePremium(billing:'monthly'|'annual',pinned?:string){
    if(pinned)return pinned;
    const {prices,products}=await this.load();
    const byId=new Map(products.map(p=>[p.id,p]));
    return prices.filter(p=>{
      const product=byId.get(typeof p.product==='string'?p.product:p.product.id);
      return product&&((p.metadata.plan==='premium'&&p.metadata.billing===billing)||
        (product.metadata.plan==='premium'&&p.recurring?.interval===(billing==='monthly'?'month':'year')));
    }).sort((a,b)=>b.created-a.created||a.id.localeCompare(b.id))[0]?.id??null;
  }

  async isAllowed(priceId:unknown,pinned:readonly (string|undefined)[]){
    if(typeof priceId!=='string'||!/^price_[a-zA-Z0-9]{1,180}$/.test(priceId))return false;
    if(pinned.includes(priceId))return true;
    const {prices,products}=await this.load();
    const price=prices.find(p=>p.id===priceId);
    if(!price)return false;
    const product=products.find(p=>p.id===(typeof price.product==='string'?price.product:price.product.id));
    return !!product&&(price.metadata.plan==='premium'||product.metadata.plan==='premium');
  }

  async publicProducts():Promise<BillingProduct[]>{
    const {prices,products}=await this.load();
    return products.map(p=>({id:p.id,name:p.name,description:p.description,metadata:p.metadata,
      prices:prices.filter(price=>(typeof price.product==='string'?price.product:price.product.id)===p.id)
        .sort((a,b)=>(a.unit_amount??0)-(b.unit_amount??0))
        .map(({id,unit_amount,currency,recurring,metadata})=>({id,unit_amount,currency,recurring,metadata})),
    }));
  }

  async interval(priceId:string){
    const {prices}=await this.load();
    return prices.find(p=>p.id===priceId)?.recurring?.interval;
  }
}
