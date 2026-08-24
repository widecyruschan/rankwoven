import publicSeoPages from './publicSeo.json';

export const publicSeoKeywordKeys = Object.fromEntries(
  Object.entries(publicSeoPages).map(([page, config]) => [page, config.keywordKey])
) as { [Page in keyof typeof publicSeoPages]: (typeof publicSeoPages)[Page]['keywordKey'] };
