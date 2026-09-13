import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LanguageProvider } from '@/i18n/LanguageContext';
import { PhotoMeasure } from './PhotoMeasure';
import * as photoMeasure from '@/lib/body/photoMeasure';
import { LANGUAGE_STORAGE_KEY } from '@/i18n/language';

/**
 * Ekran wgrywania zdjęcia.
 *
 * Dwie rzeczy tutaj są wymogiem prawnym, a nie decyzją graficzną, więc są
 * testem, a nie akapitem — lekcja z sesji 4 brzmi, że reguła zapisana w
 * dokumencie nie obowiązuje:
 *
 * - komunikat AI Act (art. 50 ust. 3) stoi **przed** wyborem pliku,
 * - żaden wymiar nie idzie dalej, dopóki użytkowniczka go nie potwierdzi.
 */
function renderPhotoMeasure(onMeasured = vi.fn()) {
  render(
    <LanguageProvider>
      <PhotoMeasure onMeasured={onMeasured} />
    </LanguageProvider>,
  );
  return onMeasured;
}

function fakePhoto() {
  return new File([new Uint8Array([1, 2, 3])], 'ja.jpg', { type: 'image/jpeg' });
}

/** Talia z taśmy kotwiczy pomiar, więc bez niej nie da się wybrać pliku. */
function pickPhoto(waist = '70') {
  fireEvent.change(screen.getByLabelText('Twoja talia, zmierzona taśmą'), { target: { value: waist } });
  const input = screen.getByTestId('photo-input') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [fakePhoto()] } });
}

beforeEach(() => {
  vi.restoreAllMocks();
  // Po polsku, bo po polsku ten ekran zobaczy użytkowniczka — a komunikat
  // AI Act ma być zrozumiały w języku, w którym stoi produkt, nie w domyślnym
  // języku jsdom.
  localStorage.setItem(LANGUAGE_STORAGE_KEY, 'pl');
});

describe('ekran pomiaru ze zdjęcia', () => {
  it('pokazuje komunikat AI Act przed wyborem pliku, nie po', () => {
    renderPhotoMeasure();
    const notice = screen.getByText(/model AI/i);
    // Liczy się położenie względem **widocznego przycisku**, a nie ukrytego
    // `<input type="file">`. Input jest schowany i można go przestawić w DOM
    // bez żadnej zmiany na ekranie — porównanie z nim sprawdzałoby kolejność
    // znaczników, a wymóg dotyczy tego, co człowiek widzi, zanim kliknie.
    const button = screen.getByRole('button', { name: /Wybierz zdjęcie/i });
    expect(notice.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('mówi wprost, że taśma jest dokładniejsza', () => {
    renderPhotoMeasure();
    expect(screen.getByText(/dokładniejszy/i)).toBeInTheDocument();
  });

  it('nie oddaje wymiarów, dopóki nie zostaną potwierdzone', async () => {
    vi.spyOn(photoMeasure, 'measureFromPhoto').mockResolvedValue({
      status: 'ok',
      measurements: { bust: 90, waist: 70, hips: 100 },
    });
    const onMeasured = renderPhotoMeasure();

    pickPhoto();
    await waitFor(() => expect(screen.getByText('90 cm')).toBeInTheDocument());
    // Odczytane i pokazane — ale profil zostaje nietknięty do kliknięcia.
    expect(onMeasured).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText(/Użyj tych wymiarów/i));
    expect(onMeasured).toHaveBeenCalledWith({ bust: 90, waist: 70, hips: 100 });
  });

  it('gdy nie ma czym liczyć, mówi to zamiast udawać, że działa', async () => {
    vi.spyOn(photoMeasure, 'measureFromPhoto').mockResolvedValue({
      status: 'error',
      code: 'not-configured',
    });
    const onMeasured = renderPhotoMeasure();

    pickPhoto();
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('alert').textContent).toMatch(/nie jest włączone/i);
    expect(onMeasured).not.toHaveBeenCalled();
  });

  it('nazywa po imieniu zdjęcie, na którym nie ma jednej osoby', async () => {
    vi.spyOn(photoMeasure, 'measureFromPhoto').mockResolvedValue({
      status: 'error',
      code: 'no-person',
    });
    renderPhotoMeasure();

    pickPhoto();
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('alert').textContent).toMatch(/jednej osoby/i);
  });

  it('kotwiczy odczyt na talii z taśmy, zanim cokolwiek pokaże', async () => {
    // Prawdziwy odczyt drugiej osoby z 2026-09-13: model podał 93,1 / 75,6 /
    // 105,8, a taśma mówiła 82,5 / 65 / 95. Przesunięcie o −10,6 sprowadza
    // biust i biodra do taśmy z dokładnością do 0,2 cm — i to jest jedyny
    // powód, dla którego ten ekran w ogóle pyta o talię.
    vi.spyOn(photoMeasure, 'measureFromPhoto').mockResolvedValue({
      status: 'ok',
      measurements: { bust: 93.1, waist: 75.6, hips: 105.8 },
    });
    const onMeasured = renderPhotoMeasure();

    pickPhoto('65');
    await waitFor(() => expect(screen.getByText('82.5 cm')).toBeInTheDocument());
    expect(screen.getByText('95.2 cm')).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Użyj tych wymiarów/i));
    expect(onMeasured).toHaveBeenCalledWith(
      expect.objectContaining({ bust: 82.5, waist: 65, hips: 95.2 }),
    );
  });
});
