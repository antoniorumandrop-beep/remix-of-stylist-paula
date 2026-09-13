import "@testing-library/jest-dom";

// Ten plik łata przeglądarkę, której jsdom nie ma w komplecie. Testy kodu
// serwerowego (`// @vitest-environment node`) przeglądarki nie mają w ogóle i
// niczego tu nie potrzebują — bez tej bramki wywracają się na `window` z
// błędem, który nie ma nic wspólnego z tym, co sprawdzają.
const hasDom = typeof window !== "undefined";

if (hasDom) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  });
}

// jsdom implements no layout, so it has no scrollIntoView. Screens that keep a
// conversation pinned to the bottom call it on every new message; without this
// they throw during render and the test failure points at the test, not at the
// missing browser API.
if (hasDom && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
