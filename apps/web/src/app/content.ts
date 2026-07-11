export interface NavigationItem {
  readonly label: string;
  readonly href: string;
}

export const navigationItems: readonly NavigationItem[] = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Safety', href: '#safety' },
  { label: 'For organizations', href: '#organizations' },
] as const;

export interface Benefit {
  readonly number: string;
  readonly title: string;
  readonly description: string;
}

export const benefits: readonly Benefit[] = [
  {
    number: '01',
    title: 'Know the group',
    description:
      'See everyone on the shared route with honest location freshness—not a false promise of perfect GPS.',
  },
  {
    number: '02',
    title: 'Catch the gap',
    description:
      'Route-aware intelligence notices when one connected convoy becomes two real groups.',
  },
  {
    number: '03',
    title: 'Regroup safely',
    description:
      'Share a suitable point ahead and keep every message calm. Nobody is told to rush.',
  },
] as const;

export const organizationAudiences = [
  'Families',
  'Clubs',
  'Tours',
  'Events',
  'Fleets',
] as const;
