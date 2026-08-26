import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AppCtx } from '../lib/context.jsx';
import ProductsView from './Products.jsx';

function renderProducts(overrides = {}) {
  let resolveAdd;
  const addCategory = vi.fn(() => new Promise((resolve) => { resolveAdd = resolve; }));
  const ctx = {
    products: [],
    categories: [],
    transactions: [],
    toggleProductStatus: vi.fn(),
    deleteProduct: vi.fn(),
    pushToast: vi.fn(),
    addCategory,
    updateCategory: vi.fn(),
    toggleCategoryStatus: vi.fn(),
    ...overrides,
  };
  render(
    <AppCtx.Provider value={ctx}>
      <ProductsView />
    </AppCtx.Provider>
  );
  return { ctx, resolveAdd: () => resolveAdd({}) };
}

describe('CategoryModal — mencegah dobel-simpan saat tombol (+) di-spam klik', () => {
  it('memanggil addCategory hanya SEKALI walau tombol diklik 4x berturut-turut sebelum respons server datang', async () => {
    const { ctx, resolveAdd } = renderProducts();

    fireEvent.click(screen.getByRole('button', { name: /kategori/i }));
    const input = await screen.findByPlaceholderText('Kategori baru');
    fireEvent.change(input, { target: { value: 'Minuman' } });

    // Cari tombol ikon (+) di sebelah input — ini yang dilaporkan bisa di-spam.
    const addButtons = screen.getAllByRole('button').filter((b) => b.querySelector('svg.lucide-plus'));
    const addBtn = addButtons[addButtons.length - 1];

    // Simulasikan klik 4x beruntun sebelum request pertama selesai (mis. Apps Script lambat merespons).
    fireEvent.click(addBtn);
    fireEvent.click(addBtn);
    fireEvent.click(addBtn);
    fireEvent.click(addBtn);

    expect(ctx.addCategory).toHaveBeenCalledTimes(1);
    expect(addBtn).toBeDisabled();

    resolveAdd();
    await waitFor(() => expect(addBtn).not.toBeDisabled());
  });
});
