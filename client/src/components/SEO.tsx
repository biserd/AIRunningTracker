import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  ogImage?: string;
  url?: string;
  type?: 'website' | 'article';
  structuredData?: object;
  ogTitle?: string;
  ogDescription?: string;
}

export function SEO({
  title,
  description,
  keywords,
  ogImage = 'https://aitracker.run/og-image.jpg',
  url = 'https://aitracker.run/',
  type = 'website',
  structuredData,
  ogTitle,
  ogDescription
}: SEOProps) {
  useEffect(() => {
    // Update title
    document.title = title;

    // Update or create meta tags
    const updateMeta = (name: string, content: string, property?: boolean) => {
      const attribute = property ? 'property' : 'name';
      let element = document.querySelector(`meta[${attribute}="${name}"]`);
      
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      
      element.setAttribute('content', content);
    };

    // Standard meta tags
    updateMeta('description', description);
    if (keywords) {
      updateMeta('keywords', keywords);
    }

    // Open Graph — allow overriding the OG title/description independently
    // of the <title>/meta description so social cards can use punchier copy.
    const ogTitleResolved = ogTitle ?? title;
    const ogDescriptionResolved = ogDescription ?? description;
    updateMeta('og:title', ogTitleResolved, true);
    updateMeta('og:description', ogDescriptionResolved, true);
    updateMeta('og:image', ogImage, true);
    updateMeta('og:url', url, true);
    updateMeta('og:type', type, true);

    // Twitter Card
    updateMeta('twitter:title', ogTitleResolved);
    updateMeta('twitter:description', ogDescriptionResolved);
    updateMeta('twitter:image', ogImage);
    updateMeta('twitter:url', url);

    // Add or update canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', url);

    // Add or update structured data
    if (structuredData) {
      let scriptElement = document.getElementById('structured-data') as HTMLScriptElement;
      
      if (!scriptElement) {
        scriptElement = document.createElement('script');
        scriptElement.id = 'structured-data';
        scriptElement.type = 'application/ld+json';
        document.head.appendChild(scriptElement);
      }
      
      scriptElement.textContent = JSON.stringify(structuredData);
    }
  }, [title, description, keywords, ogImage, url, type, structuredData]);

  return null;
}
