import { normalizeVoice } from './game-core.js';


const DIFFICULTY_TIERS = {
  beginner: [1, 2],
  intermediate: [3, 4],
  advanced: [5, 6, 7],
};


function shuffle(items, random) {
  return items
    .map((item, index) => ({ item, index, key: random() }))
    .sort((left, right) => left.key - right.key || left.index - right.index)
    .map(entry => entry.item);
}


export function buildNormalChoices(question, random = Math.random) {
  if (!Array.isArray(question?.choices) || question.choices.length < 3) {
    throw new RangeError('A normal-mode question needs at least three choices');
  }
  if (!Number.isInteger(question.correct_index) || !question.choices[question.correct_index]) {
    throw new RangeError('A normal-mode question needs a valid correct choice');
  }
  const correct = { text: question.choices[question.correct_index], correct: true };
  const wrongChoices = question.choices
    .filter((choice, index) => index !== question.correct_index)
    .map(text => ({ text, correct: false }));
  const selected = [correct, ...shuffle(wrongChoices, random).slice(0, 2)];
  const shuffled = shuffle(selected, random);
  return {
    choices: shuffled.map(choice => choice.text),
    correctIndex: shuffled.findIndex(choice => choice.correct),
  };
}


export function normalLabel(text) {
  return String(text || '')
    .replace(/\s*[\(（][^\)）]*[\)）]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}


export function normalPrompt(question) {
  const prompt = normalLabel(question?.prompt);
  if (question?.direction === 'term_to_meaning') return `${prompt}とは？`;
  const firstSentence = prompt.match(/^.*?[。！？]/)?.[0] || prompt;
  return firstSentence.length <= 46 ? firstSentence : `${firstSentence.slice(0, 45)}…`;
}


export function selectNormalQuestions(bank, difficulty, count = 10, random = Math.random) {
  const tiers = DIFFICULTY_TIERS[difficulty];
  if (!tiers) throw new RangeError('Unknown normal-mode difficulty');
  return bank
    .filter(question => tiers.includes(question.tier))
    .map((question, index) => ({ question, index, key: random() }))
    .sort((a, b) => a.key - b.key || a.index - b.index)
    .slice(0, count)
    .map(item => item.question);
}


const STOP_WORDS = ['ストップ', 'すとっぷ', 'キャンセル', 'きゃんせる'];


export function parseNormalCommand(transcript, phase, answerCount = 5) {
  const command = normalizeVoice(transcript);
  if (command?.type === 'exit') return command;
  const text = String(transcript).normalize('NFKC').replace(/\s/g, '');
  if (STOP_WORDS.some(word => text.includes(word))) return { type: 'stop' };
  if (command?.type === 'next') return command;
  if (phase === 'answer' && command?.type === 'answer' && command.index < answerCount) return command;
  return null;
}


export function heardLabel({ transcript, error } = {}) {
  if (error) return `音声認識エラー: ${error}`;
  if (transcript) return `聞き取り結果:「${transcript}」`;
  return '音声は検出されませんでした';
}


export function withHeard(notice, heard) {
  return heard ? `${notice}(${heard})` : notice;
}


export function normalFeedbackSpeech(question, normalChoices, selectedIndex) {
  const correct = selectedIndex === normalChoices.correctIndex;
  const head = correct ? '正解です。' : '残念です。';
  const answer = '正解は' + (normalChoices.correctIndex + 1) + '番、' + normalLabel(normalChoices.choices[normalChoices.correctIndex]) + 'です。';
  const why = question.why ? '理由。' + normalLabel(question.why) : '';
  const example = question.example ? '具体例。' + normalLabel(question.example) : '';
  return [head, answer, why, example].filter(Boolean).join(' ');
}
