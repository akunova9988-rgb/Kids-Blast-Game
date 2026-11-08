const SETS = [
  {
    title: 'Easy Addition',
    topic: 'Addition',
    accent: 'gold',
    play: [
      ['2 + 3 = ?', ['4', '5', '6', '1'], 1],
      ['4 + 1 = ?', ['3', '6', '5', '2'], 2],
      ['3 + 3 = ?', ['5', '8', '4', '6'], 3],
      ['5 + 2 = ?', ['7', '6', '8', '3'], 0],
      ['1 + 6 = ?', ['5', '8', '6', '7'], 3],
      ['4 + 4 = ?', ['6', '9', '8', '7'], 2],
      ['2 + 5 = ?', ['6', '7', '10', '8'], 1],
      ['3 + 2 = ?', ['4', '6', '1', '5'], 3],
    ],
  },
  {
    title: 'Sight Words',
    topic: 'Reading',
    accent: 'lilac',
    play: [
      ['Find the word: the', ['cat', 'the', 'run', 'big'], 1],
      ['Find the word: see', ['dog', 'sun', 'hop', 'see'], 3],
      ['I ___ you.', ['like', 'run', 'blue', 'tree'], 0],
      ['We ___ go.', ['red', 'book', 'can', 'sit'], 2],
      ['Find the word: and', ['ant', 'ask', 'all', 'and'], 3],
      ['She ___ hello.', ['jump', 'said', 'green', 'ball'], 1],
      ['Find the word: you', ['yes', 'you', 'yell', 'yam'], 1],
      ['I want ___ play.', ['top', 'toy', 'to', 'two'], 2],
    ],
  },
  {
    title: 'Simple Science',
    topic: 'Science',
    accent: 'teal',
    play: [
      ['The sun is a…', ['star', 'rock', 'fish', 'tree'], 0],
      ['Plants need…', ['shoes', 'hats', 'water', 'cars'], 2],
      ['A baby dog is a…', ['calf', 'cub', 'kit', 'puppy'], 3],
      ['We see with our…', ['ears', 'eyes', 'nose', 'hands'], 1],
      ['Fish live in…', ['trees', 'nests', 'water', 'sand'], 2],
      ['Birds have…', ['scales', 'fur', 'shells', 'feathers'], 3],
      ['The moon shows at…', ['night', 'lunch', 'noon', 'class'], 0],
      ['Ice is water that is…', ['hot', 'frozen', 'dry', 'soft'], 1],
    ],
  },
];

function shuffle(list) {
  const arr = list.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function deal(item) {
  const order = shuffle([0, 1, 2, 3]);
  return {
    prompt: item[0],
    choices: order.map((index) => item[1][index]),
    correctIndex: order.indexOf(item[2]),
  };
}

export function starsFor({ correctCount, missCount, roundSize }) {
  if (correctCount === roundSize && missCount === 0 && roundSize > 0) return 3;
  if (correctCount >= 1 && correctCount >= missCount) return 2;
  return 1;
}

export function makeRound(setIndex) {
  const set = SETS[setIndex % SETS.length];
  return {
    setIndex,
    title: set.title,
    topic: set.topic,
    accent: set.accent,
    questions: shuffle(set.play).slice(0, 5).map(deal),
  };
}
