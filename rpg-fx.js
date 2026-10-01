export function createFx(root, { reducedMotion = false } = {}) {
  const layer = root.querySelector('#battle-fx-layer');
  const enemy = root.querySelector('#battle-rpg-enemy');
  const timers = new Set();

  function later(callback, delay) {
    const timer = setTimeout(() => {
      timers.delete(timer);
      callback();
    }, delay);
    timers.add(timer);
  }

  function cancel() {
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
    layer?.classList.remove('rpg-fx-attack');
    enemy?.classList.remove('is-hit', 'is-hurt', 'is-defeated');
    root.querySelectorAll('.rpg-glow').forEach(element => element.classList.remove('rpg-glow'));
    layer?.replaceChildren();
  }

  function addFxImage(className, src, alt) {
    if (!layer) return;
    const image = document.createElement('img');
    image.className = className;
    image.src = src;
    image.alt = alt;
    layer.append(image);
  }

  function attack({ slash, hit } = {}) {
    cancel();
    if (reducedMotion) return;
    addFxImage('rpg-fx-slash', slash, '');
    addFxImage('rpg-fx-hit', hit, '');
    layer?.classList.add('rpg-fx-attack');
    enemy?.classList.add('is-hit');
    later(cancel, 520);
  }

  function hurt() {
    cancel();
    if (reducedMotion) return;
    enemy?.classList.add('is-hurt');
    later(cancel, 360);
  }

  function victory() {
    cancel();
    if (reducedMotion) return;
    enemy?.classList.add('is-defeated');
    later(cancel, 720);
  }

  function correctGlow(element) {
    if (!element || reducedMotion) return;
    element.classList.add('rpg-glow');
    later(() => element.classList.remove('rpg-glow'), 320);
  }

  return { attack, hurt, victory, correctGlow, cancel };
}
