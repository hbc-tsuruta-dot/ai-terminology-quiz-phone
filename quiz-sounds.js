const SOUND_ASSETS = {
  correct: 'assets/sounds/quiz-correct-tv-02.wav',
  wrong: 'assets/sounds/quiz-wrong-game-show-03.wav',
};

const SETTINGS_KEY = 'ai-term-quiz-sound-v1';
const DEFAULT_SETTINGS = { volume: 0.82, muted: false };


function clampVolume(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return DEFAULT_SETTINGS.volume;
  return Math.min(1, Math.max(0, number));
}


function availableStorage(explicitStorage) {
  if (explicitStorage !== undefined) return explicitStorage;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}


function readSettings(storage, fallbackVolume) {
  const fallback = { volume: clampVolume(fallbackVolume), muted: false };
  if (!storage?.getItem) return fallback;

  try {
    const saved = JSON.parse(storage.getItem(SETTINGS_KEY));
    if (!saved || typeof saved !== 'object') return fallback;
    return {
      volume: clampVolume(saved.volume),
      muted: saved.muted === true,
    };
  } catch {
    return fallback;
  }
}


export function createQuizSounds({
  AudioClass = globalThis.Audio,
  storage: explicitStorage,
  volume = DEFAULT_SETTINGS.volume,
} = {}) {
  const storage = availableStorage(explicitStorage);
  let settings = readSettings(storage, volume);
  let current = null;

  const sounds = typeof AudioClass === 'function'
    ? Object.fromEntries(Object.entries(SOUND_ASSETS).map(([name, path]) => {
        const audio = new AudioClass(path);
        audio.preload = 'auto';
        return [name, audio];
      }))
    : {};

  function effectiveVolume() {
    return settings.muted ? 0 : settings.volume;
  }

  function applyVolume() {
    Object.values(sounds).forEach((audio) => {
      audio.volume = effectiveVolume();
    });
  }

  function persist() {
    try {
      storage?.setItem?.(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // Storage can be unavailable in private browsing. The setting still works for this page.
    }
  }

  function stop() {
    if (!current) return false;
    const playback = current;
    current = null;
    playback.audio.onended = null;
    playback.audio.onerror = null;
    playback.audio.pause?.();
    playback.audio.currentTime = 0;
    playback.resolve(false);
    return true;
  }

  applyVolume();

  return {
    play(name) {
      const audio = sounds[name];
      if (!audio || settings.muted || settings.volume <= 0) return Promise.resolve(false);

      stop();
      audio.currentTime = 0;
      let resolvePlayback;
      const promise = new Promise((resolve) => { resolvePlayback = resolve; });
      const finish = (played) => {
        if (current?.audio !== audio) return;
        current = null;
        audio.onended = null;
        audio.onerror = null;
        resolvePlayback(played);
      };

      current = { audio, promise, resolve: resolvePlayback };
      audio.onended = () => finish(true);
      audio.onerror = () => finish(false);

      try {
        const request = audio.play();
        request?.catch?.(() => finish(false));
      } catch {
        finish(false);
      }
      return promise;
    },

    stop,

    whenIdle() {
      return current?.promise ?? Promise.resolve();
    },

    getSettings() {
      return { ...settings };
    },

    setVolume(nextVolume) {
      settings = { ...settings, volume: clampVolume(nextVolume) };
      applyVolume();
      persist();
      if (settings.volume <= 0) stop();
      return { ...settings };
    },

    setMuted(muted) {
      settings = { ...settings, muted: Boolean(muted) };
      applyVolume();
      persist();
      if (settings.muted) stop();
      return { ...settings };
    },
  };
}
