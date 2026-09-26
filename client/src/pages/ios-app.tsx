import {SEO} from '@/components/SEO';
import {IosAppContent} from '@shared/iosAppView';
import {iosAppMeta,iosAppSchema} from '@shared/iosAppContent';
export default function IosAppPage(){return <><SEO {...iosAppMeta} url={'https://aitracker.run'+iosAppMeta.path} ogImage={iosAppMeta.image} structuredData={iosAppSchema}/><IosAppContent/></>;}
