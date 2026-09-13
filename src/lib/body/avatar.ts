/**
 * Sylwetka z wymiarów — strona przeglądarki.
 *
 * PLUG(avatar): dziś liczy to middleware dev-serwera
 * (`vite-plugins/build-avatar.ts`), bo dopasowanie ciała robi Python z
 * `body-lab/`. Docelowo ta sama odpowiedź przyjdzie z edge function; wszystko
 * powyżej tej funkcji zostaje bez zmian.
 */

const DEV_ENDPOINT = '/__paula/build-avatar';

export interface AvatarRequest {
  bust: number;
  waist: number;
  hips: number;
  heightCm: number;
}

export type AvatarError = 'not-configured' | 'no-dev-server' | 'failed';

export type AvatarResult =
  | { status: 'ok'; glb: ArrayBuffer; reached: Record<string, number> }
  | { status: 'error'; code: AvatarError; detail?: string };

/** base64 → bajty. `atob` daje napis, a `GLTFLoader` chce bufora. */
function decodeBase64(data: string): ArrayBuffer {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export async function buildAvatar(wanted: AvatarRequest): Promise<AvatarResult> {
  let res: Response;
  try {
    res = await fetch(DEV_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(wanted),
    });
  } catch (e) {
    return { status: 'error', code: 'no-dev-server', detail: (e as Error).message };
  }

  // Zbudowana aplikacja serwuje `index.html` na nieznany adres, więc odpowiedź
  // przychodzi jako HTML ze statusem 200 i wygląda na sukces. Ta sama pułapka,
  // co przy imporcie z linku (commit ffae147).
  const body = await res.json().catch(() => null);
  if (body === null) return { status: 'error', code: 'no-dev-server' };

  if (!res.ok) {
    const { code, error } = body as { code?: AvatarError; error?: string };
    return { status: 'error', code: code ?? 'failed', detail: error };
  }

  const { glb, reached } = body as { glb?: string; reached?: Record<string, number> };
  if (!glb) return { status: 'error', code: 'failed', detail: 'odpowiedź bez siatki' };
  return { status: 'ok', glb: decodeBase64(glb), reached: reached ?? {} };
}
