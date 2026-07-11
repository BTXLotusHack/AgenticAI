import { Link } from 'react-router-dom';
import { BrandMark } from '../components/BrandMark';

export function ProductBrand() {
  return (
    <Link aria-label="Loopin home" className="product-brand" to="/">
      <BrandMark />
    </Link>
  );
}
