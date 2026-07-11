export interface NavigationItem {
  readonly label: string;
  readonly href: string;
}

export const navigationItems: readonly NavigationItem[] = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Safety', href: '#safety' },
  { label: 'For organizations', href: '#organizations' },
] as const;
