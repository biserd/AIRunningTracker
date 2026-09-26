import {SEO} from '@/components/SEO';
import {IosPrivacyContent} from '@shared/iosAppView';
import {iosPrivacyMeta} from '@shared/iosAppContent';
export default function IosPrivacyPage(){return <><SEO {...iosPrivacyMeta} url={'https://aitracker.run'+iosPrivacyMeta.path} ogImage={iosPrivacyMeta.image} structuredData={{'@context':'https://schema.org','@type':'WebPage',name:iosPrivacyMeta.title,url:'https://aitracker.run'+iosPrivacyMeta.path}}/><IosPrivacyContent/></>;}
