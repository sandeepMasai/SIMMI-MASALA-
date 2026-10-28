import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ProductCard } from './ProductCard';
import { store } from '../store';
import type { ProductDto } from '@simmi/shared';

const product: ProductDto = {
  id: '1',
  nameEn: 'Turmeric Powder',
  nameHi: 'हल्दी पाउडर',
  slug: 'turmeric-powder',
  brandName: 'SIMMI MASALA',
  shortDescription: 'Ground turmeric for everyday cooking',
  description: 'DEV PLACEHOLDER',
  categoryId: 'c1',
  images: [{ url: 'https://example.com/t.jpg', sortOrder: 0 }],
  isActive: true,
  isFeatured: true,
  status: 'active',
  variants: [
    {
      id: 'v1',
      sku: 'SM-HALDI-100G',
      packWeightGrams: 100,
      pricePaise: 8000,
      stockQuantity: 10,
      lowStockThreshold: 5,
      shippingWeightGrams: 120,
      isActive: true,
    },
  ],
  taxRateBps: 0,
  isPlaceholderContent: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('ProductCard', () => {
  it('renders product names and short description', () => {
    render(
      <Provider store={store}>
        <MemoryRouter>
          <ProductCard product={product} badge="Best Seller" />
        </MemoryRouter>
      </Provider>,
    );
    expect(screen.getByText('Turmeric Powder')).toBeTruthy();
    expect(screen.getByText('हल्दी पाउडर')).toBeTruthy();
    expect(screen.getByText('Best Seller')).toBeTruthy();
    expect(screen.getByText('Ground turmeric for everyday cooking')).toBeTruthy();
    expect(screen.getByText('Select pack')).toBeTruthy();
  });
});
