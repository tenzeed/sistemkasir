import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { InstallChip } from './InstallChip.jsx';

function fireGlobalInstallSignal() {
  // Mirrors exactly what the inline script in index.html does.
  const evt = new Event('beforeinstallprompt', { cancelable: true });
  evt.preventDefault = () => {};
  evt.prompt = () => {};
  evt.userChoice = Promise.resolve({ outcome: 'accepted' });
  window.__pwaInstallEvent = evt;
  window.dispatchEvent(new CustomEvent('pwa-install-ready'));
}

beforeEach(() => {
  window.__pwaInstallEvent = null;
});

describe('InstallChip — menangkap sinyal install walau muncul sebelum komponen dipasang', () => {
  it('tidak tampil kalau belum ada sinyal install sama sekali', () => {
    render(<InstallChip />);
    expect(screen.queryByText('Pasang Aplikasi')).not.toBeInTheDocument();
  });

  it('langsung tampil begitu komponen mount, jika sinyal sudah tertangkap SEBELUM komponen ini pernah dirender (persis kasus yang dilaporkan: muncul di halaman Setup, lalu ke halaman Login)', () => {
    // Simulasikan: event browser sudah datang lebih dulu (sebelum layar
    // manapun sempat mount), ditangkap oleh script global di index.html.
    fireGlobalInstallSignal();

    // Baru SEKARANG komponennya dipasang — mis. pengguna sudah pindah dari
    // layar Setup ke layar Login PIN.
    render(<InstallChip />);
    expect(screen.getByText('Pasang Aplikasi')).toBeInTheDocument();
  });

  it('tetap tampil di komponen berikutnya walau komponen pertama yang menangkapnya sudah unmount', async () => {
    const { unmount } = render(<InstallChip />);
    fireGlobalInstallSignal();
    await waitFor(() => expect(screen.getByText('Pasang Aplikasi')).toBeInTheDocument());
    unmount();

    // Layar berpindah (mis. Setup -> Login): komponen baru dipasang ulang.
    render(<InstallChip />);
    expect(screen.getByText('Pasang Aplikasi')).toBeInTheDocument();
  });

  it('hilang dari semua tempat setelah benar-benar ter-install', async () => {
    fireGlobalInstallSignal();
    render(<InstallChip />);
    await waitFor(() => expect(screen.getByText('Pasang Aplikasi')).toBeInTheDocument());

    window.dispatchEvent(new CustomEvent('pwa-install-done'));
    await waitFor(() => expect(screen.queryByText('Pasang Aplikasi')).not.toBeInTheDocument());
  });
});
