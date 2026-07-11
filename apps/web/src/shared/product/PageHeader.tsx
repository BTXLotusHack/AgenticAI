import type { ReactNode } from 'react';

export function PageHeader({
  actions,
  description,
  eyebrow,
  title,
}: {
  readonly actions?: ReactNode;
  readonly description?: ReactNode;
  readonly eyebrow: string;
  readonly title: string;
}) {
  return (
    <header className="product-page-header">
      <div>
        <p className="product-kicker">{eyebrow}</p>
        <h1>{title}</h1>
        {description ? <p className="product-page-header__description">{description}</p> : null}
      </div>
      {actions ? <div className="product-page-header__actions">{actions}</div> : null}
    </header>
  );
}
