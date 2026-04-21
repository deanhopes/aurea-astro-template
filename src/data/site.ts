export interface NavLink {
  label: string;
  href: string;
}

export const site = {
  name: 'Aurea Residences',
  url: 'https://aurea-astro-template.netlify.app',
  description:
    'Aurea Residences offers private waterfront residences on Biscayne Bay in Edgewater, Miami. Three-bedroom, four-bedroom, and full-floor penthouse homes from the 12th to 52nd floor, with bay views, wraparound terraces, and private lift access.',
  ogImage: '/og.jpg',
  locale: 'en',
} as const;

export const contact = {
  address: {
    name: 'Aurea Residences',
    street: '3900 Biscayne Blvd',
    city: 'Edgewater, Miami FL 33137',
  },
  phone: { display: '+1 (305) 555-0180', href: 'tel:+13055550180' },
  mapUrl: 'https://maps.google.com/?q=3900+Biscayne+Blvd+Miami+FL+33137',
} as const;

export const nav = {
  cta: { label: 'Enquire', href: '#enquire' },
  menu: {
    cards: [
      { label: 'Vision', href: '#vision' },
      { label: 'Residences', href: '#residences' },
      { label: 'Lifestyle', href: '#lifestyle' },
    ],
    links: [{ label: 'Neighbourhood', href: '#neighbourhood' }],
    secondaryLinks: [
      { label: 'Terms & Conditions', href: '/terms' },
      { label: 'Privacy Policy', href: '/privacy' },
    ],
  },
} as const;

export const footerLinkGroups: NavLink[][] = [
  [
    { label: 'Vision', href: '#vision' },
    { label: 'Residences', href: '#residences' },
    { label: 'Lifestyle', href: '#lifestyle' },
    { label: 'Neighbourhood', href: '#neighbourhood' },
  ],
  [
    { label: 'Terms & Conditions', href: '/terms' },
    { label: 'Privacy Policy', href: '/privacy' },
  ],
];
