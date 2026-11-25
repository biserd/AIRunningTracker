import {SEO} from '@/components/SEO';
import {IosAppContent} from '@shared/iosAppView';
import {getIosAppSchema,iosAppMeta,iosWebOfferFromQuotes} from '@shared/iosAppContent';
import {useQuery} from '@tanstack/react-query';

export default function IosAppPage(){
 const {data} = useQuery({
  queryKey: ['ios-app-web-intro-quotes'],
  queryFn: () => Promise.all(['monthly','annual'].map(async period => {
   const response = await fetch('/api/stripe/web-intro-offer?billingPeriod='+period);
   return response.ok ? response.json() : null;
  })),
  staleTime: 60_000,
 });
 const offer = data ? iosWebOfferFromQuotes(data[0],data[1]) : null;
 return <><SEO {...iosAppMeta} url={'https://aitracker.run'+iosAppMeta.path} ogImage={iosAppMeta.image} structuredData={getIosAppSchema(offer)}/><IosAppContent webOffer={offer}/></>;
}
