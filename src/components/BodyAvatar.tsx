import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { buildAvatar, type AvatarError } from '@/lib/body/avatar';
import { BANDS, garmentFrom } from '@/lib/body/garment';

/**
 * Sylwetka użytkowniczki, do obejrzenia z każdej strony.
 *
 * Siatka pochodzi z warsztatu Anny w `body-lab`, dopasowanego do jej trzech
 * obwodów i wzrostu — nie ze zdjęcia. Powód jest zmierzony, nie estetyczny:
 * siatka zwracana przez model ze zdjęcia ma zaszyty błąd wzrostu rzędu 7 cm.
 * Skutek uboczny jest tym, na czym nam zależy — sylwetka wygląda tak samo,
 * czy obwody przyszły z taśmy, czy ze zdjęcia.
 *
 * To jest **obraz ciała, nie ocena ciała**. Nie ma tu żadnej liczby poza
 * wymiarami w centymetrach i żadnego zdania o tym, jak to wygląda.
 */

const ERROR_KEY: Record<AvatarError, string> = {
  'not-configured': 'avatarErrNotConfigured',
  'no-dev-server': 'avatarErrNoDevServer',
  failed: 'avatarErrFailed',
};

interface Props {
  bust: number;
  waist: number;
  hips: number;
  heightCm: number;
}

type State = { phase: 'idle' | 'working' } | { phase: 'error'; code: AvatarError } | { phase: 'ready' };

export function BodyAvatar({ bust, waist, hips, heightCm }: Props) {
  const { t } = useLanguage();
  const mount = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<State>({ phase: 'idle' });

  useEffect(() => {
    const host = mount.current;
    if (!host) return;

    // Poza serwerem deweloperskim sylwetki nie ma czym policzyć, więc nie ma po
    // co budować sceny: renderer WebGL, OrbitControls i ResizeObserver
    // powstawałyby tylko po to, żeby za chwilę pokazać zdanie o tym, że nic z
    // tego nie będzie. Bramka stoi w efekcie, a nie przed nim, bo hooka nie
    // wolno wywołać warunkowo.
    if (!import.meta.env.DEV) {
      setState({ phase: 'error', code: 'no-dev-server' });
      return;
    }

    let disposed = false;
    setState({ phase: 'working' });

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // Światło rozproszone plus jedno kierunkowe: dość, żeby czytać kształt,
    // za mało, żeby robić z tego sesję zdjęciową.
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 2.2));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(1.5, 2.5, 2);
    scene.add(key);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.minDistance = 1.2;
    controls.maxDistance = 6;

    host.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'none';

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = host;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    let frame = 0;
    const tick = () => {
      frame = requestAnimationFrame(tick);
      controls.update();
      renderer.render(scene, camera);
    };

    void (async () => {
      const result = await buildAvatar({ bust, waist, hips, heightCm });
      if (disposed) return;
      if (result.status === 'error') {
        setState({ phase: 'error', code: result.code });
        return;
      }

      new GLTFLoader().parse(result.glb, '', gltf => {
        if (disposed) return;
        const body = gltf.scene;
        body.traverse(node => {
          const mesh = node as THREE.Mesh;
          if (!mesh.isMesh) return;
          if (!mesh.geometry.attributes.normal) mesh.geometry.computeVertexNormals();
          mesh.material = new THREE.MeshStandardMaterial({
            color: 0xd9d2ca, roughness: 0.85, metalness: 0,
          });
        });

        // Warsztat eksportuje siatkę w konwencji Z do góry (stopy na Z=0),
        // a three.js liczy w górę oś Y. Bez tego obrotu sylwetka leży.
        const box = new THREE.Box3().setFromObject(body);
        const span = box.getSize(new THREE.Vector3());
        if (span.z > span.y) body.rotation.x = -Math.PI / 2;

        const framed = new THREE.Box3().setFromObject(body);
        const centre = framed.getCenter(new THREE.Vector3());
        const height = framed.getSize(new THREE.Vector3()).y;
        body.position.sub(centre);
        scene.add(body);

        const skin: THREE.Mesh[] = [];
        body.traverse(node => {
          if ((node as THREE.Mesh).isMesh) skin.push(node as THREE.Mesh);
        });
        for (const part of skin) {
          for (const band of BANDS) {
            const garment = garmentFrom(part, band);
            // Dziecko tego samego rodzica co skóra: dziedziczy jej obrót i
            // przesunięcie, więc nie trzeba ich liczyć drugi raz.
            if (garment) part.parent?.add(garment);
          }
        }

        controls.target.set(0, 0, 0);
        camera.position.set(0, height * 0.1, height * 1.9);
        controls.update();
        setState({ phase: 'ready' });
        tick();
      }, error => {
        // Bez wypisania powodu każda awaria wygląda tak samo: pusty prostokąt
        // i „spróbuj jeszcze raz", które niczego nie naprawi.
        console.error('[avatar]', error);
        if (!disposed) setState({ phase: 'error', code: 'failed' });
      });
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      // Bez tego każde wejście na ekran zostawia po sobie kontekst WebGL, a
      // przeglądarka trzyma ich kilkanaście i przestaje dawać nowe.
      scene.traverse(node => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        const material = mesh.material;
        if (Array.isArray(material)) material.forEach(m => m.dispose());
        else material.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [bust, waist, hips, heightCm]);

  return (
    <div className="relative w-full aspect-[3/4] bg-card rounded-2xl overflow-hidden">
      <div ref={mount} className="absolute inset-0" />
      {state.phase !== 'ready' && (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
          {state.phase === 'error' ? (
            <p role="alert" className="text-xs text-muted-foreground">
              {t(ERROR_KEY[state.code] as Parameters<typeof t>[0])}
            </p>
          ) : (
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {t('avatarBuilding')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
