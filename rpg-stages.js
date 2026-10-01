const ASSET_ROOT = 'assets/rpg-expansion-v1/cut';

export const RPG_ASSETS = {
  elementary: {
    scenes: [
      { id: 'classroom', path: `${ASSET_ROOT}/backgrounds/classroom.png`, label: 'AI教室' },
      { id: 'schoolyard-forest', path: `${ASSET_ROOT}/backgrounds/schoolyard-forest.png`, label: '校庭の森' },
    ],
    battleBackground: `${ASSET_ROOT}/backgrounds/forest-battle.png`,
    enemies: {
      normal: {
        id: 'leaf-slime',
        name: 'いたずらスライム',
        line: '覚えた言葉で勝負！',
        path: `${ASSET_ROOT}/enemies/leaf-slime.png`,
      },
      boss: {
        id: 'acorn-guardian',
        name: 'どんぐりの守護者',
        line: '小学生編の知識、ぜんぶ見せてごらん。',
        path: `${ASSET_ROOT}/enemies/acorn-guardian.png`,
      },
    },
    ui: {
      emerald: `${ASSET_ROOT}/ui/emerald.png`,
      shield: `${ASSET_ROOT}/ui/fx-shield.png`,
      slash: `${ASSET_ROOT}/ui/fx-slash.png`,
      hit: `${ASSET_ROOT}/ui/fx-hit.png`,
    },
  },
};

export function themeForStage(stageIndex) {
  return stageIndex === 0 ? 'elementary' : null;
}

export function pickScene(themeKey, lastScene, random = Math.random) {
  const scenes = RPG_ASSETS[themeKey]?.scenes;
  if (!scenes) return null;
  if (scenes.length === 1) return scenes[0];
  const choices = lastScene ? scenes.filter(scene => scene.id !== lastScene) : scenes;
  const index = Math.min(choices.length - 1, Math.floor(random() * choices.length));
  return choices[index];
}

export function pickEnemy(themeKey, cleared) {
  const enemies = RPG_ASSETS[themeKey]?.enemies;
  if (!enemies) return null;
  return cleared ? enemies.boss : enemies.normal;
}

export function battleGauge(session = {}) {
  session = session || {};
  const correct = Number.isFinite(session.correct) ? session.correct : 0;
  const wrong = Number.isFinite(session.wrong) ? session.wrong : 0;
  return {
    enemy: Math.max(0, 3 - correct),
    player: Math.max(0, 3 - wrong),
  };
}
