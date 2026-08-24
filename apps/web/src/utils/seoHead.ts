export interface SeoHeadOptions {
  title: string;
  description: string;
  canonicalUrl: string;
  indexable: boolean;
  keywords?: readonly string[];
  type?: 'website' | 'article';
  imageUrl?: string;
  locale?: string;
}

function setMeta(attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function removeMeta(attribute: 'name' | 'property', key: string) {
  document.head.querySelector(`meta[${attribute}="${key}"]`)?.remove();
}

function setLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

export function updateSeoHead(options: SeoHeadOptions) {
  if (typeof document === 'undefined') return;

  document.title = options.title;
  setMeta('name', 'description', options.description);
  setMeta('name', 'robots', options.indexable ? 'index, follow' : 'noindex, nofollow');
  const keywords = options.keywords?.map((keyword) => keyword.trim()).filter(Boolean) ?? [];
  if (options.indexable && keywords.length > 0) {
    setMeta('name', 'keywords', [...new Set(keywords)].join(', '));
  } else {
    removeMeta('name', 'keywords');
  }
  setMeta('property', 'og:title', options.title);
  setMeta('property', 'og:description', options.description);
  setMeta('property', 'og:url', options.canonicalUrl);
  setMeta('property', 'og:type', options.type ?? 'website');
  setMeta('property', 'og:site_name', 'RankWoven');
  setMeta('property', 'og:locale', options.locale ?? 'zh_Hant');
  setMeta('name', 'twitter:card', options.imageUrl ? 'summary_large_image' : 'summary');
  setMeta('name', 'twitter:title', options.title);
  setMeta('name', 'twitter:description', options.description);
  if (options.imageUrl) {
    setMeta('property', 'og:image', options.imageUrl);
    setMeta('name', 'twitter:image', options.imageUrl);
  } else {
    removeMeta('property', 'og:image');
    removeMeta('name', 'twitter:image');
  }
  setLink('canonical', options.canonicalUrl);
}
