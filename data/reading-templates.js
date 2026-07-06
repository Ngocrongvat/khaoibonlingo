// Reading comprehension passages. {name} is substituted with a random name at generation time
// for variety; the rest of the text is fixed to guarantee coherence and grammatical correctness.
const NAME_POOL = ['Anna', 'David', 'Maria', 'Tom', 'Linh', 'Nam', 'Mai', 'Sophia', 'James', 'Lan'];

const READING_TEMPLATES = [
  {
    id: 'reading_1',
    difficulty: 1,
    passage: '{name} wakes up at six in the morning. {name} eats breakfast and then goes to school by bus. After school, {name} does homework and plays with friends.',
    question: 'What does {name} do after school?',
    options: ['Does homework and plays with friends', 'Goes to the hospital', 'Goes to sleep immediately', 'Cooks dinner for the family'],
    correct: 0
  },
  {
    id: 'reading_2',
    difficulty: 1,
    passage: '{name} lives in a small house near a park. Every weekend, {name} goes for a walk in the park with a dog. {name} loves animals very much.',
    question: 'Where does {name} live?',
    options: ['In a small house near a park', 'In a big city', 'Near the beach', 'On a farm'],
    correct: 0
  },
  {
    id: 'reading_3',
    difficulty: 2,
    passage: '{name} works at a hospital as a doctor. {name} starts work early and often stays late to help patients. Although the job is tiring, {name} enjoys helping people feel better.',
    question: 'Why does {name} enjoy the job, even though it is tiring?',
    options: ['Because helping people feel better makes {name} happy', 'Because the salary is very high', 'Because the working hours are short', 'Because {name} does not like the job'],
    correct: 0
  },
  {
    id: 'reading_4',
    difficulty: 2,
    passage: '{name} is planning a trip to the mountains next month. {name} has already bought a train ticket and packed warm clothes because the weather there is very cold. {name} is excited about the trip.',
    question: 'Why did {name} pack warm clothes?',
    options: ['Because the weather in the mountains is very cold', 'Because {name} is going to the beach', 'Because {name} dislikes cold weather', 'Because the train is cold'],
    correct: 0
  },
  {
    id: 'reading_5',
    difficulty: 2,
    passage: '{name} is learning English to get a better job. Every day, {name} studies new words and practices speaking with friends online. {name} believes that hard work will bring good results.',
    question: 'Why is {name} learning English?',
    options: ['To get a better job', 'To travel for free', 'Because school requires it', 'To teach children'],
    correct: 0
  },
  {
    id: 'reading_6',
    difficulty: 3,
    passage: '{name} used to be very shy, but after joining a public speaking club, {name} became much more confident. Now {name} enjoys giving presentations and even helps other members practice their speeches.',
    question: 'What helped {name} become more confident?',
    options: ['Joining a public speaking club', 'Reading more books', 'Moving to a new city', 'Getting a promotion at work'],
    correct: 0
  },
  {
    id: 'reading_7',
    difficulty: 3,
    passage: '{name} runs a small coffee shop in the city center. Business was difficult at first, but {name} listened to customer feedback and slowly improved the menu. Today, the shop is one of the most popular places in the area.',
    question: 'How did {name} improve the business?',
    options: ['By listening to customer feedback and improving the menu', 'By moving to a different city', 'By closing the shop for a year', 'By hiring a famous chef'],
    correct: 0
  },
  {
    id: 'reading_8',
    difficulty: 1,
    passage: '{name} has a big family. There are two brothers and one sister. On weekends, the whole family cooks together and eats dinner at the same table.',
    question: 'What does the family do on weekends?',
    options: ['Cooks together and eats dinner at the same table', 'Travels abroad every week', 'Goes to work together', 'Watches movies at the cinema'],
    correct: 0
  },
  {
    id: 'reading_9',
    difficulty: 2,
    passage: '{name} was feeling sick last week, so {name} went to see a doctor. The doctor said it was just a cold and gave some medicine. After a few days of rest, {name} felt much better.',
    question: 'What was wrong with {name}?',
    options: ['{name} had a cold', '{name} broke a leg', '{name} had a toothache', '{name} was too tired from work'],
    correct: 0
  },
  {
    id: 'reading_10',
    difficulty: 3,
    passage: 'Although {name} grew up in a small village, {name} always dreamed of studying abroad. After years of hard work and saving money, {name} was finally accepted into a university overseas.',
    question: 'What did {name} always dream of doing?',
    options: ['Studying abroad', 'Becoming a farmer', 'Staying in the village forever', 'Opening a small shop'],
    correct: 0
  }
];
