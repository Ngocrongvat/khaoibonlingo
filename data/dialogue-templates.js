// Short dialogues ending with "choose the best response". Fixed text for coherence.
const DIALOGUE_TEMPLATES = [
  {
    id: 'dialogue_1',
    difficulty: 1,
    lines: ['A: Hi! How are you today?', 'B: ___'],
    question: 'Câu trả lời phù hợp nhất là gì?',
    options: ["I'm fine, thank you. And you?", 'The store closes at nine.', 'It is raining outside.', 'I have two brothers.'],
    correct: 0
  },
  {
    id: 'dialogue_2',
    difficulty: 1,
    lines: ['A: What time does the movie start?', 'B: ___'],
    question: 'Câu trả lời phù hợp nhất là gì?',
    options: ['It starts at seven thirty.', 'I like action movies.', 'Yes, I am hungry.', 'She lives in Hanoi.'],
    correct: 0
  },
  {
    id: 'dialogue_3',
    difficulty: 2,
    lines: ['A: Excuse me, where is the nearest bus station?', 'B: ___'],
    question: 'Câu trả lời phù hợp nhất là gì?',
    options: ["It's just around the corner, next to the bank.", 'I had a sandwich for lunch.', 'The weather is nice today.', 'My phone battery is low.'],
    correct: 0
  },
  {
    id: 'dialogue_4',
    difficulty: 2,
    lines: ['A: Would you like some coffee or tea?', 'B: ___'],
    question: 'Câu trả lời phù hợp nhất là gì?',
    options: ["I'd love some tea, thank you.", 'I finished my homework yesterday.', 'The train was late this morning.', 'She is a doctor.'],
    correct: 0
  },
  {
    id: 'dialogue_5',
    difficulty: 2,
    lines: ['A: Can you help me carry these boxes?', 'B: ___'],
    question: 'Câu trả lời phù hợp nhất là gì?',
    options: ['Sure, no problem at all.', 'I live near the park.', 'The boxes are blue.', 'He is my brother.'],
    correct: 0
  },
  {
    id: 'dialogue_6',
    difficulty: 3,
    lines: ['A: I heard you got a new job. Congratulations!', 'B: ___'],
    question: 'Câu trả lời phù hợp nhất là gì?',
    options: ["Thank you so much, I'm really excited about it.", 'The bus was ten minutes late.', 'I forgot my umbrella at home.', 'That restaurant is quite expensive.'],
    correct: 0
  },
  {
    id: 'dialogue_7',
    difficulty: 3,
    lines: ['A: I am sorry, but I cannot come to the meeting tomorrow.', 'B: ___'],
    question: 'Câu trả lời phù hợp nhất là gì?',
    options: ["That's okay, we can reschedule it for another day.", 'I like tea more than coffee.', 'The weather was sunny yesterday.', 'My favorite color is blue.'],
    correct: 0
  },
  {
    id: 'dialogue_8',
    difficulty: 1,
    lines: ['A: Where are you from?', 'B: ___'],
    question: 'Câu trả lời phù hợp nhất là gì?',
    options: ['I am from Vietnam.', 'I am reading a book.', 'It is five o\'clock.', 'The soup is delicious.'],
    correct: 0
  }
];
