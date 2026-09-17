import { describe, it, expect, vi, afterEach } from 'vitest';
import { measureFromPhoto } from '@/lib/body/photoMeasure';
import { buildAvatar } from '@/lib/body/avatar';

/**
 * Pomiar ze zdjęcia i awatar poza serwerem deweloperskim.
 *
 * Oba liczy Python z `body-lab/` przez middleware dev-serwera, więc w
 * zbudowanej aplikacji nie ma ich czym policzyć. Same odpowiedzi były już
 * uczciwe — `res.json().catch(() => null)` nie przepuszcza SPA-fallbacku i
 * kończy się kodem `no-dev-server`. Ale uczciwe było dopiero **na końcu**:
 * najpierw aplikacja czytała jej zdjęcie całej sylwetki do pamięci, wysyłała
 * je w żądaniu i kazała czekać, żeby po wszystkim powiedzieć, że nie liczy.
 *
 * Pytanie o zdjęcie ciała, na które z góry wiadomo, że nic nie da, jest gorsze
 * niż zwykły martwy przycisk. Dlatego zatrzymujemy się przed odczytem pliku i
 * przed siecią — tak samo jak przy skanie fitu (`src/lib/fitCutout.test.ts`).
 */
describe('pomiar i awatar poza serwerem deweloperskim', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('pomiar nie czyta zdjęcia ani nie wysyła żądania', async () => {
    vi.stubEnv('DEV', false);
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const plik = new File([new Uint8Array([1, 2, 3])], 'sylwetka.jpg', { type: 'image/jpeg' });
    const wynik = await measureFromPhoto(plik);

    expect(wynik.status).toBe('error');
    expect(wynik.status === 'error' && wynik.code).toBe('no-dev-server');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('awatar nie wysyła żądania', async () => {
    vi.stubEnv('DEV', false);
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const wynik = await buildAvatar({ bust: 92, waist: 74, hips: 100, heightCm: 168 });

    expect(wynik.status).toBe('error');
    expect(wynik.status === 'error' && wynik.code).toBe('no-dev-server');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
