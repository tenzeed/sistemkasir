import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentModal } from './Pos.jsx';

function getConfirmButton() {
  return screen.getByRole('button', { name: /selesaikan/i });
}

describe('PaymentModal — tombol Selesaikan', () => {
  it('nonaktif saat metode Tunai dan belum ada nominal diisi', () => {
    render(<PaymentModal open total={15000} onClose={() => {}} onConfirm={vi.fn()} />);
    expect(getConfirmButton()).toBeDisabled();
  });

  it('aktif dan bisa diklik setelah nominal tunai mencukupi, lalu memanggil onConfirm dengan payload yang benar', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue();
    render(<PaymentModal open total={15000} onClose={() => {}} onConfirm={onConfirm} />);

    const input = screen.getByPlaceholderText('0');
    await user.type(input, '20000');

    const btn = getConfirmButton();
    expect(btn).toBeEnabled();

    await user.click(btn);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith({ paymentMethod: 'Tunai', paidAmount: 20000 });
  });

  it('tombol jumlah cepat mengisi nominal dan mengaktifkan tombol Selesaikan', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue();
    render(<PaymentModal open total={12345} onClose={() => {}} onConfirm={onConfirm} />);

    // The exact total is always offered as one of the quick-amount chips
    // (use getByRole here since the running total summary above also
    // renders the same "Rp12.345" text as a plain <span>).
    const quick = screen.getByRole('button', { name: 'Rp12.345' });
    await user.click(quick);

    const btn = getConfirmButton();
    expect(btn).toBeEnabled();
    await user.click(btn);
    expect(onConfirm).toHaveBeenCalledWith({ paymentMethod: 'Tunai', paidAmount: 12345 });
  });

  it('langsung aktif untuk metode non-tunai tanpa perlu mengisi nominal', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue();
    render(<PaymentModal open total={15000} onClose={() => {}} onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: 'QRIS' }));

    const btn = getConfirmButton();
    expect(btn).toBeEnabled();
    await user.click(btn);

    expect(onConfirm).toHaveBeenCalledWith({ paymentMethod: 'QRIS', paidAmount: 15000 });
  });

  it('tetap nonaktif jika nominal tunai kurang dari total', async () => {
    const user = userEvent.setup();
    render(<PaymentModal open total={15000} onClose={() => {}} onConfirm={vi.fn()} />);
    const input = screen.getByPlaceholderText('0');
    await user.type(input, '5000');
    expect(getConfirmButton()).toBeDisabled();
  });

  it('modal tetap terbuka dan tombol tidak macet jika onConfirm gagal (mis. stok berubah di server)', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockRejectedValue(new Error('Stok tidak mencukupi'));
    const onClose = vi.fn();
    render(<PaymentModal open total={15000} onClose={onClose} onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: 'QRIS' }));
    await user.click(getConfirmButton());

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    // Button should be re-enabled (not stuck on "Memproses...") so the
    // cashier can try again.
    expect(getConfirmButton()).toBeEnabled();
  });

  it('tidak merender apapun saat open=false', () => {
    const { container } = render(<PaymentModal open={false} total={15000} onClose={() => {}} onConfirm={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
