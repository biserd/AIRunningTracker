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
  url,
  type = 'website',
  structuredData,
  ogTitle,
  ogDescription
}: SEOProps) {
  useEffect(() => {
    const resolvedUrl = url || `https://aitracker.run${window.location.pathname}`;
    const resolvedTitle = title.length > 60 ? `${title.slice(0, 57).trimEnd()}...` : title;
    const resolvedDescription = description.length > 160 ? `${description.slice(0, 157).trimEnd()}...` : description;
    // Update title
    document.title = resolvedTitle;

    // Update or create meta tags
    const updateMeta = (name: string, content: string, property?: boolean) => {
      const attribute = property ? 'property' : 'name';
      const matches = Array.from(document.querySelectorAll(`meta[${attribute}="${name}"]`));
      let element = matches[0];
      
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      
      element.setAttribute('content', content);
      matches.slice(1).forEach((duplicate) => duplicate.remove());
    };

    // Standard meta tags
    updateMeta('description', resolvedDescription);
    if (keywords) {
      updateMeta('keywords', keywords);
    }

    // Open Graph: allow overriding the OG title/description independently
    // of the <title>/meta description so social cards can use punchier copy.
    const ogTitleResolved = ogTitle ?? resolvedTitle;
    const ogDescriptionResolved = ogDescription ?? resolvedDescription;
    updateMeta('og:title', ogTitleResolved, true);
    updateMeta('og:description', ogDescriptionResolved, true);
    updateMeta('og:image', ogImage, true);
    updateMeta('og:url', resolvedUrl, true);
    updateMeta('og:type', type, true);

    // Twitter Card
    updateMeta('twitter:title', ogTitleResolved);
    updateMeta('twitter:description', ogDescriptionResolved);
    updateMeta('twitter:image', ogImage);
    updateMeta('twitter:url', resolvedUrl);

    // Add or update canonical link
    const canonicalLinks = Array.from(document.querySelectorAll('link[rel="canonical"]')) as HTMLLinkElement[];
    let canonicalLink = canonicalLinks[0];
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', resolvedUrl);
    canonicalLinks.slice(1).forEach((duplicate) => duplicate.remove());

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
  }, [title, description, keywords, ogImage, url, type, structuredData, ogTitle, ogDescription]);

  return null;
}
