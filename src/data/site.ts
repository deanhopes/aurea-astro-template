export const site = {
  name: 'Aurea Residences',
  url: 'https://aurearesidences.com',
  description: 'Waterfront living on Biscayne Bay, Edgewater, Miami.',
  ogImage: '/og.jpg',
  locale: 'en',
} as const;

export const nav = {
  cta: { label: 'Enquire', href: '#enquire' },
  menu: {
    cards: [
      { label: 'Vision', href: '/vision' },
      { label: 'Residences', href: '/residences' },
      { label: 'Lifestyle', href: '/lifestyle' },
    ],
    links: [
      { label: 'Neighbourhood', href: '/neighbourhood' },
      { label: 'Location', href: '/location' },
      { label: 'The Team', href: '/team' },
    ],
    secondaryLinks: [
      { label: 'Blog', href: '/blog' },
      { label: 'Terms & Conditions', href: '/terms' },
      { label: 'Privacy Policy', href: '/privacy' },
    ],
  },
} as const;
