export const site = {
  name: 'Aurea Residences',
  url: 'https://aurearesidences.com',
  description: 'Waterfront living on Biscayne Bay, Edgewater, Miami.',
  ogImage: '/og.jpg',
  locale: 'en',
} as const;

export const nav = {
  items: [
    { label: 'Residences', href: '/residences' },
    { label: 'Lifestyle', href: '/lifestyle' },
    { label: 'Location', href: '/location' },
  ],
  cta: { label: 'Enquire', href: '#enquire' },
} as const;
