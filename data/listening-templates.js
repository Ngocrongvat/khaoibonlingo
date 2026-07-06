const LISTENING_TEMPLATES = [
    // ===================== PASSAGES =====================
    {
        id: 'lc_passage_1', kind: 'passage', difficulty: 1, topic: 'Travel',
        text: 'Last weekend, Mai went to the beach with her family. They built a sandcastle and swam in the sea. In the evening, they watched the sunset and ate fresh seafood at a small restaurant.',
        audioText: 'Last weekend, Mai went to the beach with her family. They built a sandcastle and swam in the sea. In the evening, they watched the sunset and ate fresh seafood at a small restaurant.',
        questions: [
            { q: 'Where did Mai go last weekend?', acceptedAnswers: ['beach', 'the beach', 'seaside'] },
            { q: 'What did they eat in the evening?', acceptedAnswers: ['seafood', 'fresh seafood'] }
        ]
    },
    {
        id: 'lc_passage_2', kind: 'passage', difficulty: 1, topic: 'Sports',
        text: 'On Saturday morning, the school football team played against another school. The match was very exciting. In the end, our team won three to one, and everyone cheered loudly.',
        audioText: 'On Saturday morning, the school football team played against another school. The match was very exciting. In the end, our team won three to one, and everyone cheered loudly.',
        questions: [
            { q: 'What sport did the school team play?', acceptedAnswers: ['football', 'soccer'] },
            { q: 'What was the final score?', acceptedAnswers: ['three to one', '3 to 1', '3-1'] }
        ]
    },
    {
        id: 'lc_passage_3', kind: 'passage', difficulty: 1, topic: 'Shopping',
        text: 'Last month, Tom bought his first mobile phone. He saved money for three months to buy it. Now he uses it to call his friends and take photos every day.',
        audioText: 'Last month, Tom bought his first mobile phone. He saved money for three months to buy it. Now he uses it to call his friends and take photos every day.',
        questions: [
            { q: 'What did Tom buy?', acceptedAnswers: ['mobile phone', 'phone', 'a phone'] },
            { q: 'How long did he save money for?', acceptedAnswers: ['three months', '3 months'] }
        ]
    },
    {
        id: 'lc_passage_4', kind: 'passage', difficulty: 1, topic: 'Culture',
        text: 'Every year in January, the town holds a big street festival. There are colorful lights, live music, and many food stalls. Thousands of visitors come to enjoy the celebration.',
        audioText: 'Every year in January, the town holds a big street festival. There are colorful lights, live music, and many food stalls. Thousands of visitors come to enjoy the celebration.',
        questions: [
            { q: 'In which month is the festival held?', acceptedAnswers: ['january'] },
            { q: 'What can visitors find at the festival?', acceptedAnswers: ['food stalls', 'lights', 'music', 'live music'] }
        ]
    },
    {
        id: 'lc_passage_5', kind: 'passage', difficulty: 2, topic: 'Science',
        text: 'Bees are very important insects. They fly from flower to flower and collect a sweet liquid called nectar. Back at the hive, the bees turn the nectar into honey. Without bees, many plants would not be able to produce fruit.',
        audioText: 'Bees are very important insects. They fly from flower to flower and collect a sweet liquid called nectar. Back at the hive, the bees turn the nectar into honey. Without bees, many plants would not be able to produce fruit.',
        questions: [
            { q: 'What do bees collect from flowers?', acceptedAnswers: ['nectar', 'sweet liquid'] },
            { q: 'What would happen to plants without bees?', acceptedAnswers: ['would not produce fruit', 'no fruit', 'cannot make fruit'] }
        ]
    },
    {
        id: 'lc_passage_6', kind: 'passage', difficulty: 2, topic: 'Work',
        text: 'Linh applied for a job at a marketing company last week. During the interview, she talked about her experience and her strengths. A few days later, she received a phone call offering her the position, and she happily accepted it.',
        audioText: 'Linh applied for a job at a marketing company last week. During the interview, she talked about her experience and her strengths. A few days later, she received a phone call offering her the position, and she happily accepted it.',
        questions: [
            { q: 'What kind of company did Linh apply to?', acceptedAnswers: ['marketing company', 'marketing'] },
            { q: 'How did the company tell Linh she got the job?', acceptedAnswers: ['phone call', 'a phone call', 'called her'] }
        ]
    },
    {
        id: 'lc_passage_7', kind: 'passage', difficulty: 2, topic: 'Environment',
        text: 'Many cities are starting recycling programs to reduce waste. Residents separate paper, plastic, and glass into different bins. This simple habit helps protect the environment and saves valuable resources for the future.',
        audioText: 'Many cities are starting recycling programs to reduce waste. Residents separate paper, plastic, and glass into different bins. This simple habit helps protect the environment and saves valuable resources for the future.',
        questions: [
            { q: 'What do residents separate into different bins?', acceptedAnswers: ['paper, plastic, and glass', 'paper plastic glass', 'paper and plastic and glass'] },
            { q: 'Why are recycling programs important?', acceptedAnswers: ['protect the environment', 'save resources', 'reduce waste'] }
        ]
    },
    {
        id: 'lc_passage_8', kind: 'passage', difficulty: 2, topic: 'Travel',
        text: 'Nam spent two months backpacking across the country with only a small bag. He slept in cheap hostels, met many new people, and learned to cook simple meals. The trip taught him to be more independent.',
        audioText: 'Nam spent two months backpacking across the country with only a small bag. He slept in cheap hostels, met many new people, and learned to cook simple meals. The trip taught him to be more independent.',
        questions: [
            { q: 'How long was Nam backpacking for?', acceptedAnswers: ['two months', '2 months'] },
            { q: 'Where did Nam sleep during his trip?', acceptedAnswers: ['hostels', 'cheap hostels'] }
        ]
    },
    {
        id: 'lc_passage_9', kind: 'passage', difficulty: 3, topic: 'History',
        text: 'In 1492, Christopher Columbus sailed across the Atlantic Ocean, hoping to find a new route to Asia. Instead, he landed in the Caribbean, an event that changed the course of world history forever. Although his voyage led to great suffering for native peoples, it also connected two worlds that had never met before.',
        audioText: 'In 1492, Christopher Columbus sailed across the Atlantic Ocean, hoping to find a new route to Asia. Instead, he landed in the Caribbean, an event that changed the course of world history forever. Although his voyage led to great suffering for native peoples, it also connected two worlds that had never met before.',
        questions: [
            { q: 'What was Columbus originally hoping to find?', acceptedAnswers: ['a new route to asia', 'route to asia', 'new way to asia'] },
            { q: 'Where did Columbus actually land?', acceptedAnswers: ['caribbean', 'the caribbean'] },
            { q: 'What negative effect did the voyage have on native peoples?', acceptedAnswers: ['suffering', 'great suffering'] }
        ]
    },
    {
        id: 'lc_passage_10', kind: 'passage', difficulty: 3, topic: 'Technology',
        text: 'Artificial intelligence is rapidly changing the way people work. Although some jobs may disappear because machines can do them faster, new kinds of jobs are also being created that did not exist before. Experts believe workers who keep learning new skills will adapt most successfully to this change.',
        audioText: 'Artificial intelligence is rapidly changing the way people work. Although some jobs may disappear because machines can do them faster, new kinds of jobs are also being created that did not exist before. Experts believe workers who keep learning new skills will adapt most successfully to this change.',
        questions: [
            { q: 'Why might some jobs disappear, according to the passage?', acceptedAnswers: ['machines can do them faster', 'machines do it faster', 'because of machines'] },
            { q: 'Who does the passage say will adapt most successfully?', acceptedAnswers: ['workers who keep learning new skills', 'people who keep learning', 'those who learn new skills'] }
        ]
    },

    // ===================== DIALOGUES =====================
    {
        id: 'lc_dialogue_1', kind: 'dialogue', difficulty: 1, topic: 'Travel',
        lines: ['A: Hi, I would like to buy a ticket to Da Nang, please.', 'B: Sure, one way or round trip?', 'A: Round trip, for tomorrow morning.', 'B: That will be five hundred thousand dong.'],
        audioText: 'Hi, I would like to buy a ticket to Da Nang, please. Sure, one way or round trip? Round trip, for tomorrow morning. That will be five hundred thousand dong.',
        questions: [
            { q: 'Where does the customer want to travel to?', acceptedAnswers: ['da nang'] },
            { q: 'Is it a one-way or round trip ticket?', acceptedAnswers: ['round trip', 'roundtrip'] }
        ]
    },
    {
        id: 'lc_dialogue_2', kind: 'dialogue', difficulty: 1, topic: 'Food',
        lines: ['A: Good morning, what would you like to order?', 'B: I would like a cup of coffee and a croissant, please.', 'A: Would you like your coffee hot or iced?', 'B: Iced, please. Thank you.'],
        audioText: 'Good morning, what would you like to order? I would like a cup of coffee and a croissant, please. Would you like your coffee hot or iced? Iced, please. Thank you.',
        questions: [
            { q: 'What food does the customer order besides coffee?', acceptedAnswers: ['croissant', 'a croissant'] },
            { q: 'How does the customer want their coffee?', acceptedAnswers: ['iced', 'cold'] }
        ]
    },
    {
        id: 'lc_dialogue_3', kind: 'dialogue', difficulty: 1, topic: 'Directions',
        lines: ['A: Excuse me, how do I get to the museum from here?', 'B: Go straight for two blocks, then turn left.', 'A: Is it far from here?', 'B: No, it is only a five minute walk.'],
        audioText: 'Excuse me, how do I get to the museum from here? Go straight for two blocks, then turn left. Is it far from here? No, it is only a five minute walk.',
        questions: [
            { q: 'Where is the person trying to go?', acceptedAnswers: ['museum', 'the museum'] },
            { q: 'How long does it take to walk there?', acceptedAnswers: ['five minutes', 'five minute walk', '5 minutes'] }
        ]
    },
    {
        id: 'lc_dialogue_4', kind: 'dialogue', difficulty: 1, topic: 'Accommodation',
        lines: ['A: Hello, I would like to book a room for two nights.', 'B: Would you prefer a single or double room?', 'A: A double room, please, with a sea view if possible.', 'B: Of course, I have one available on the fifth floor.'],
        audioText: 'Hello, I would like to book a room for two nights. Would you prefer a single or double room? A double room, please, with a sea view if possible. Of course, I have one available on the fifth floor.',
        questions: [
            { q: 'How many nights does the guest want to stay?', acceptedAnswers: ['two nights', '2 nights'] },
            { q: 'What type of room does the guest want?', acceptedAnswers: ['double room', 'double'] }
        ]
    },
    {
        id: 'lc_dialogue_5', kind: 'dialogue', difficulty: 2, topic: 'Work',
        lines: ['A: Thank you for coming in today. Can you tell me about your last job?', 'B: I worked as a graphic designer for three years at a marketing agency.', 'A: What made you decide to leave?', 'B: I wanted a bigger challenge and a chance to lead my own projects.'],
        audioText: 'Thank you for coming in today. Can you tell me about your last job? I worked as a graphic designer for three years at a marketing agency. What made you decide to leave? I wanted a bigger challenge and a chance to lead my own projects.',
        questions: [
            { q: "What was the interviewee's previous job?", acceptedAnswers: ['graphic designer', 'designer'] },
            { q: 'Why did the interviewee want to leave?', acceptedAnswers: ['bigger challenge', 'wanted to lead projects', 'chance to lead own projects'] }
        ]
    },
    {
        id: 'lc_dialogue_6', kind: 'dialogue', difficulty: 2, topic: 'Shopping',
        lines: ['A: Hi, I bought this blender last week, but it stopped working.', 'B: I am sorry to hear that. Do you have the receipt?', 'A: Yes, here it is. Can I get a refund or an exchange?', 'B: Since it is still under warranty, I can offer you a new one for free.'],
        audioText: 'Hi, I bought this blender last week, but it stopped working. I am sorry to hear that. Do you have the receipt? Yes, here it is. Can I get a refund or an exchange? Since it is still under warranty, I can offer you a new one for free.',
        questions: [
            { q: 'What product is the customer returning?', acceptedAnswers: ['blender', 'a blender'] },
            { q: 'What does the staff member offer instead of a refund?', acceptedAnswers: ['a new one for free', 'new one free', 'free replacement'] }
        ]
    },
    {
        id: 'lc_dialogue_7', kind: 'dialogue', difficulty: 2, topic: 'Travel',
        lines: ['A: I am thinking about visiting Hoi An next month. Do you want to come?', 'B: I would love to! Should we go by train or by bus?', 'A: Let us take the train, it is more comfortable for a long trip.', 'B: Great idea, I will book the tickets this weekend.'],
        audioText: 'I am thinking about visiting Hoi An next month. Do you want to come? I would love to! Should we go by train or by bus? Let us take the train, it is more comfortable for a long trip. Great idea, I will book the tickets this weekend.',
        questions: [
            { q: 'Which city are they planning to visit?', acceptedAnswers: ['hoi an'] },
            { q: 'How will they travel?', acceptedAnswers: ['train', 'by train'] }
        ]
    },
    {
        id: 'lc_dialogue_8', kind: 'dialogue', difficulty: 3, topic: 'Business',
        lines: ['A: Thank you for meeting me. I would like to present a new investment opportunity.', 'B: I am listening. What makes this idea different from others we have seen?', 'A: Our product uses recycled materials, which significantly lowers production costs.', 'B: That is interesting, but I will need to see detailed financial projections before deciding.'],
        audioText: 'Thank you for meeting me. I would like to present a new investment opportunity. I am listening. What makes this idea different from others we have seen? Our product uses recycled materials, which significantly lowers production costs. That is interesting, but I will need to see detailed financial projections before deciding.',
        questions: [
            { q: 'What material does the product use?', acceptedAnswers: ['recycled materials', 'recycled material'] },
            { q: 'What does the investor want to see before deciding?', acceptedAnswers: ['financial projections', 'detailed financial projections'] }
        ]
    },

    // ===================== SONGS (TTS-read lyric text, no real melody) =====================
    {
        id: 'lc_song_1', kind: 'song', difficulty: 1, topic: 'Friendship',
        lines: ['You and I, side by side,', 'Through the sun and through the tide.', 'Friends forever, hand in hand,', 'Walking together across the land.'],
        audioText: 'You and I, side by side, through the sun and through the tide. Friends forever, hand in hand, walking together across the land.',
        questions: [
            { q: 'What do the friends do "hand in hand"?', acceptedAnswers: ['walk', 'walking', 'walk together'] },
            { q: 'How long does the song say the friendship lasts?', acceptedAnswers: ['forever'] }
        ]
    },
    {
        id: 'lc_song_2', kind: 'song', difficulty: 1, topic: 'Seasons',
        lines: ['Spring brings flowers, soft and new,', 'Summer skies are bright and blue.', 'Autumn leaves fall to the ground,', 'Winter snow falls without a sound.'],
        audioText: 'Spring brings flowers, soft and new. Summer skies are bright and blue. Autumn leaves fall to the ground. Winter snow falls without a sound.',
        questions: [
            { q: 'What color are the summer skies?', acceptedAnswers: ['blue', 'bright and blue'] },
            { q: 'What falls to the ground in autumn?', acceptedAnswers: ['leaves', 'autumn leaves'] }
        ]
    },
    {
        id: 'lc_song_3', kind: 'song', difficulty: 1, topic: 'Nature',
        lines: ['Hush now baby, close your eyes,', 'The moon is shining in the skies.', 'Stars will watch you while you sleep,', 'Sweet dreams are yours to keep.'],
        audioText: 'Hush now baby, close your eyes. The moon is shining in the skies. Stars will watch you while you sleep. Sweet dreams are yours to keep.',
        questions: [
            { q: 'What is shining in the skies?', acceptedAnswers: ['moon', 'the moon'] },
            { q: 'What watches the baby while it sleeps?', acceptedAnswers: ['stars'] }
        ]
    },
    {
        id: 'lc_song_4', kind: 'song', difficulty: 2, topic: 'Adventure',
        lines: ['Pack your bag, let us go,', 'To places we have never seen before.', 'Across the ocean, over the hill,', 'Chasing a dream that we cannot kill.'],
        audioText: 'Pack your bag, let us go, to places we have never seen before. Across the ocean, over the hill, chasing a dream that we cannot kill.',
        questions: [
            { q: 'What kind of places does the song describe?', acceptedAnswers: ['places we have never seen before', 'never seen before', 'new places'] },
            { q: 'What are they chasing, according to the song?', acceptedAnswers: ['a dream', 'dream'] }
        ]
    },
    {
        id: 'lc_song_5', kind: 'song', difficulty: 2, topic: 'Home',
        lines: ['Miles away from where I grew,', 'I still remember every view.', 'The old street, the small house door,', 'Home is a place I am always searching for.'],
        audioText: 'Miles away from where I grew, I still remember every view. The old street, the small house door, home is a place I am always searching for.',
        questions: [
            { q: 'What does the singer still remember?', acceptedAnswers: ['every view', 'the view'] },
            { q: 'What is the singer always searching for?', acceptedAnswers: ['home', 'a place'] }
        ]
    },
    {
        id: 'lc_song_6', kind: 'song', difficulty: 3, topic: 'Time',
        lines: ['Yesterday feels so far away now,', 'Time keeps slipping, I don\'t know how.', 'I hold on to these fading memories,', 'Wishing I could stop the passing years.'],
        audioText: 'Yesterday feels so far away now. Time keeps slipping, I do not know how. I hold on to these fading memories, wishing I could stop the passing years.',
        questions: [
            { q: 'What does the singer hold on to?', acceptedAnswers: ['fading memories', 'memories'] },
            { q: 'What does the singer wish they could stop?', acceptedAnswers: ['the passing years', 'passing years', 'time'] }
        ]
    },
    {
        id: 'lc_song_7', kind: 'song', difficulty: 3, topic: 'Environment',
        lines: ['The ice is melting, the seas will rise,', 'Can you hear the planet\'s cries?', 'It is not too late to make a change,', 'Together we can rearrange.'],
        audioText: 'The ice is melting, the seas will rise. Can you hear the planet\'s cries? It is not too late to make a change. Together we can rearrange.',
        questions: [
            { q: 'What does the song say is melting?', acceptedAnswers: ['ice', 'the ice'] },
            { q: 'According to the song, is it too late to make a change?', acceptedAnswers: ['no', 'not too late', 'it is not too late'] }
        ]
    }
];
