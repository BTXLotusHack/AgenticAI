import { Link } from 'react-router-dom';
import { ProductBrand } from './ProductBrand';

export function NotFoundPage() {
  return (
    <main className="product-empty">
      <ProductBrand />
      <p className="product-kicker">Route not found</p>
      <h1>This Loopin link has ended.</h1>
      <div className="product-empty__actions">
        <Link className="button button--primary" to="/trip/new">Set up a demo trip</Link>
        <Link className="text-link" to="/">Back to Loopin</Link>
      </div>
    </main>
  );
}
