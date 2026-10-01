const STAGE_TIERS = [1, 2, 3, 4, 5, 6, 7, null];

export function createProgress() {
  return { unlocked: 0, seen: {}, trophies: [], totalAnswers: 0, totalCorrect: 0 };
}

export function restoreProgress(raw) {
  const progress = createProgress();
  let saved;
  try { saved = JSON.parse(raw); } catch { return progress; }
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return progress;
  if (Number.isInteger(saved.unlocked)) progress.unlocked = Math.min(7, Math.max(0, saved.unlocked));
  if (saved.seen && typeof saved.seen === 'object' && !Array.isArray(saved.seen)) progress.seen = { ...saved.seen };
  if (Array.isArray(saved.trophies)) {
    progress.trophies = [...new Set(saved.trophies.filter(stage => Number.isInteger(stage) && stage >= 0 && stage <= 7))];
  }
  for (const key of ['totalAnswers', 'totalCorrect']) {
    if (Number.isInteger(saved[key]) && saved[key] >= 0) progress[key] = saved[key];
  }
  return progress;
}

export function stageStatus(progress, stageIndex) {
  if (stageIndex > progress.unlocked) return 'locked';
  return stageIndex < progress.unlocked ? 'cleared' : 'current';
}

function stagePool(bank, stageIndex) {
  const tier = STAGE_TIERS[stageIndex];
  if (tier === undefined) throw new RangeError('Invalid stage');
  return bank.filter(question => tier === null || question.tier === tier);
}

export function stageCoverage(bank, stageIndex, seen = {}) {
  const pool = stagePool(bank, stageIndex);
  return { seen: pool.filter(question => seen[String(question.id)]).length, total: pool.length };
}

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

export function toRomanNumeral(number) {
  if (!Number.isInteger(number) || number < 1 || number > ROMAN_NUMERALS.length) {
    throw new RangeError('toRomanNumeral supports 1-' + ROMAN_NUMERALS.length);
  }
  return ROMAN_NUMERALS[number - 1];
}

export function activeCompanion(stage, progress, stageIndex) {
  const showRival = Boolean(stage.rivalLine) && stageStatus(progress, stageIndex) !== 'cleared';
  return showRival
    ? { name: stage.rival, line: stage.rivalLine, portraitClass: stage.rivalClass }
    : { name: stage.guide, line: stage.line, portraitClass: stage.guideClass };
}

export function selectQuestions(bank, stageIndex, seen = {}, count = 5, random = Math.random) {
  const pool = stagePool(bank, stageIndex);
  const order = questions => questions
    .map((question, index) => ({ question, key: random(), index }))
    .sort((a, b) => a.key - b.key || a.index - b.index)
    .map(item => item.question);
  const unseen = order(pool.filter(question => !seen[String(question.id)]));
  const reviewed = order(pool.filter(question => seen[String(question.id)]));
  return unseen.concat(reviewed).slice(0, count);
}

export function finishLesson(progress, stageIndex, results) {
  const seen = { ...progress.seen };
  for (const result of results) seen[String(result.id)] = true;
  const correct = results.filter(result => result.correct).length;
  const passed = results.length >= 5 && correct / results.length >= 0.8;
  return {
    ...progress,
    seen,
    totalAnswers: progress.totalAnswers + results.length,
    totalCorrect: progress.totalCorrect + correct,
    unlocked: progress.unlocked,
  };
}

export function finishBattle(progress, stageIndex, correct, total) {
  const won = correct >= 3 && correct <= total && stageIndex <= progress.unlocked;
  const trophies = won && !progress.trophies.includes(stageIndex)
    ? [...progress.trophies, stageIndex] : [...progress.trophies];
  return {
    ...progress,
    trophies,
    totalAnswers: progress.totalAnswers + total,
    totalCorrect: progress.totalCorrect + correct,
  };
}

export function createSession(questions, mode) {
  if (!['lesson', 'midterm', 'final', 'battle'].includes(mode) || !questions.length) {
    throw new Error('A session needs a mode and at least one question');
  }
  return {
    mode,
    questions,
    index: 0,
    results: [],
    correct: 0,
    wrong: 0,
    answered: false,
    finished: false,
    won: false,
  };
}

export function submitAnswer(session, choiceIndex) {
  if (session.answered || session.finished) return session;
  const question = session.questions[session.index];
  const correct = choiceIndex === question.correct_index;
  return {
    ...session,
    results: [...session.results, { id: question.id, correct }],
    correct: session.correct + Number(correct),
    wrong: session.wrong + Number(!correct),
    answered: true,
  };
}

export function isLastTurn(session) {
  const battleOver = session.mode === 'battle' && (session.correct >= 3 || session.wrong >= 3);
  return battleOver || session.index >= session.questions.length - 1;
}

export function skipQuestion(session) {
  if (session.answered || session.finished) return session;
  const question = session.questions[session.index];
  return {
    ...session,
    results: [...session.results, { id: question.id, correct: false, skipped: true }],
    answered: true,
  };
}

export function advanceSession(session) {
  if (!session.answered || session.finished) return session;
  if (isLastTurn(session)) {
    return { ...session, finished: true, won: session.mode === 'battle' ? session.correct >= 3 : session.correct / session.questions.length >= 0.8 };
  }
  return { ...session, index: session.index + 1, answered: false };
}

export function normalizeVoice(transcript) {
  const text = String(transcript).normalize('NFKC').replace(/\s/g, '');
  const exitWords = ['終了', '終わり', 'おわり', 'オワリ', 'しゅうりょう', 'シュウリョウ'];
  const nextWords = ['次', 'つぎ', 'ツギ'];
  if (exitWords.some(word => text.includes(word))) return { type: 'exit' };
  if (nextWords.some(word => text.includes(word))) return { type: 'next' };
  const digit = text.match(/(?<!\d)([1-5])(?!\d)(?:番)?/);
  if (digit) return { type: 'answer', index: Number(digit[1]) - 1 };
  const words = ['一番', '二番', '三番', '四番', '五番', 'いちばん', 'にばん', 'さんばん', 'よんばん', 'ごばん'];
  const match = words.findIndex(word => text.includes(word));
  return match < 0 ? null : { type: 'answer', index: match % 5 };
}

export function voiceContinuation(answered) {
  return answered ? 'advance' : 'listen';
}
