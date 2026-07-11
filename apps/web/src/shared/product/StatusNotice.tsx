import type { ReactNode } from 'react';

export type StatusTone = 'loading' | 'error' | 'empty' | 'permission' | 'stale' | 'success';

export function StatusNotice({ children, title, tone }: { readonly children?: ReactNode; readonly title: string; readonly tone: StatusTone }) {
  return (
    <section aria-live={tone === 'error' ? 'assertive' : 'polite'} className="product-status" data-tone={tone}>
      <span aria-hidden="true" />
      <div><strong>{title}</strong>{children ? <p>{children}</p> : null}</div>
    </section>
  );
}
