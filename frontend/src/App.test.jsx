import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.jsx';
import { api } from './lib/api.js';

vi.mock('./lib/api.js', () => ({
  api: {
    bootstrap: vi.fn(),
    setupStore: vi.fn(),
    verifyPin: vi.fn(),
    addCategory: vi.fn(), updateCategory: vi.fn(), toggleCategoryStatus: vi.fn(),
    addProduct: vi.fn(), updateProduct: vi.fn(), toggleProductStatus: vi.fn(), deleteProduct: vi.fn(),
    restock: vi.fn(), adjustStock: vi.fn(), writeOffBatch: vi.fn(),
    completeSale: vi.fn(), voidTransaction: vi.fn(),
    addExpense: vi.fn(), updateExpense: vi.fn(), deleteExpense: vi.fn(),
    updateSettings: vi.fn(), resetAllData: vi.fn(),
  },
}));

const EMPTY_TABLES = { categories: [], products: [], batches: [], movements: [], transactions: [], expenses: [] };

const SAMPLE_PRODUCT = {
  id: 'p1', name: 'Indomie Goreng', categoryId: 'c1', unit: 'pcs',
  purchasePrice: 2500, sellingPrice: 3000, minimumStock: 10, status: 'active',
  sellableStock: 25, totalStock: 25, isLowStock: false, isOutOfStock: false,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Alur setup toko pertama kali', () => {
  it('menampilkan wizard setup ketika belum ada settings, lalu masuk ke dashboard setelah selesai', async () => {
    const user = userEvent.setup();
    api.bootstrap.mockResolvedValue({ settings: null, ...EMPTY_TABLES });

    render(<App />);
    expect(await screen.findByText('Selamat Datang')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('mis. Warung Berkah Jaya'), 'Warung Test');
    await user.click(screen.getByRole('button', { name: 'Lanjut' }));
    await user.type(screen.getByPlaceholderText('mis. Budi'), 'Budi');

    api.setupStore.mockResolvedValue({
      settings: { storeName: 'Warung Test', adminName: 'Budi', hasPin: false, expWarningDays: 30, receiptWidth: '58' },
      ...EMPTY_TABLES,
    });
    await user.click(screen.getByRole('button', { name: 'Mulai Pakai Aplikasi' }));

    expect(await screen.findByText(/Halo, Budi/)).toBeInTheDocument();
    expect(api.setupStore).toHaveBeenCalledWith({ storeName: 'Warung Test', address: '', adminName: 'Budi', pin: '' });
  });
});

describe('Alur login PIN', () => {
  it('meminta PIN, menolak PIN salah, dan masuk dashboard dengan PIN benar', async () => {
    const user = userEvent.setup();
    api.bootstrap.mockResolvedValue({
      settings: { storeName: 'Warung Berkah', adminName: 'Sari', hasPin: true, expWarningDays: 30, receiptWidth: '58' },
      ...EMPTY_TABLES,
    });

    render(<App />);
    expect(await screen.findByText('Warung Berkah')).toBeInTheDocument();

    api.verifyPin.mockResolvedValueOnce({ valid: false });
    await user.type(screen.getByPlaceholderText('••••'), '0000');
    await user.click(screen.getByRole('button', { name: /masuk/i }));
    expect(await screen.findByText('PIN salah, coba lagi.')).toBeInTheDocument();

    api.verifyPin.mockResolvedValueOnce({ valid: true });
    await user.type(screen.getByPlaceholderText('••••'), '1234');
    await user.click(screen.getByRole('button', { name: /masuk/i }));

    expect(await screen.findByText(/Halo, Sari/)).toBeInTheDocument();
  });
});

describe('Status koneksi backend', () => {
  it('menampilkan pesan error dan tombol coba lagi saat bootstrap gagal', async () => {
    const user = userEvent.setup();
    api.bootstrap.mockRejectedValueOnce(new Error('VITE_API_URL belum diatur.'));
    render(<App />);

    expect(await screen.findByText('Tidak bisa terhubung ke server')).toBeInTheDocument();
    expect(screen.getByText('VITE_API_URL belum diatur.')).toBeInTheDocument();

    api.bootstrap.mockResolvedValueOnce({
      settings: { storeName: 'Warung Berkah', adminName: 'Sari', hasPin: false, expWarningDays: 30, receiptWidth: '58' },
      ...EMPTY_TABLES,
    });
    await user.click(screen.getByRole('button', { name: 'Coba Lagi' }));
    expect(await screen.findByText(/Masuk sebagai Sari/)).toBeInTheDocument();
  });
});

describe('Navigasi utama setelah login', () => {
  it('bisa pindah ke halaman Transaksi dan menampilkan produk', async () => {
    const user = userEvent.setup();
    api.bootstrap.mockResolvedValue({
      settings: { storeName: 'Warung Berkah', adminName: 'Sari', hasPin: false, expWarningDays: 30, receiptWidth: '58' },
      categories: [{ id: 'c1', name: 'Makanan', status: 'active' }],
      products: [SAMPLE_PRODUCT],
      batches: [], movements: [], transactions: [], expenses: [],
    });

    render(<App />);
    await user.click(await screen.findByRole('button', { name: /masuk sebagai sari/i }));
    expect(await screen.findByText(/Halo, Sari/)).toBeInTheDocument();

    const posButtons = screen.getAllByText('Transaksi');
    await user.click(posButtons[0]);

    expect(await screen.findByText('Indomie Goreng')).toBeInTheDocument();
    expect(screen.getByText('Rp3.000')).toBeInTheDocument();
  });
});
