// IELTS-style listening sections, read aloud via TTS (audioText), question types
// mirror ielts-reading.js: 'mc', 'fill' (free text). Modeled loosely on the real IELTS
// Listening structure (Section 1: everyday form-filling conversation, Section 2: a
// monologue/announcement, Section 3: an academic conversation, Section 4: a lecture).
const IELTS_LISTENING = [
    {
        id: 'il_section1',
        bandTier: 1,
        title: 'Section 1 - Booking a Hotel Room',
        kind: 'dialogue',
        lines: [
            'A: Good afternoon, Lakeside Hotel, how can I help you?',
            'B: Hi, I would like to book a room for the third of next month, for two nights.',
            'A: Sure, could I have your full name, please?',
            'B: Yes, it is Sarah Thompson.',
            'A: And would you like a single or a double room?',
            'B: A single room, please, and if possible, one with a view of the lake.',
            'A: We have one available on the second floor for eighty dollars a night.',
            'B: That sounds perfect, thank you.'
        ],
        audioText: 'Good afternoon, Lakeside Hotel, how can I help you? Hi, I would like to book a room for the third of next month, for two nights. Sure, could I have your full name, please? Yes, it is Sarah Thompson. And would you like a single or a double room? A single room, please, and if possible, one with a view of the lake. We have one available on the second floor for eighty dollars a night. That sounds perfect, thank you.',
        questions: [
            { type: 'fill', q: "What is the customer's full name?", acceptedAnswers: ['sarah thompson', 'sarah'] },
            { type: 'fill', q: 'How many nights does she want to stay?', acceptedAnswers: ['two nights', '2 nights', 'two'] },
            { type: 'mc', q: 'What type of room does she book?', options: ['Double room', 'Single room', 'Family room', 'Suite'], correct: 1 },
            { type: 'fill', q: 'How much does the room cost per night?', acceptedAnswers: ['eighty dollars', '$80', '80 dollars', 'eighty'] }
        ]
    },
    {
        id: 'il_section2',
        bandTier: 1,
        title: 'Section 2 - Museum Announcement',
        kind: 'passage',
        text: 'Good morning, everyone, and welcome to the City History Museum. Before you begin your visit, please note that photography is allowed in most areas, except in the ancient pottery room on the second floor. The gift shop is located near the main entrance and closes thirty minutes before the museum itself. If you would like a guided tour, groups depart from the main hall every hour, starting at ten in the morning. Please remember that food and drinks are not permitted inside the exhibition halls, but there is a small cafe on the ground floor where you are welcome to eat.',
        audioText: 'Good morning, everyone, and welcome to the City History Museum. Before you begin your visit, please note that photography is allowed in most areas, except in the ancient pottery room on the second floor. The gift shop is located near the main entrance and closes thirty minutes before the museum itself. If you would like a guided tour, groups depart from the main hall every hour, starting at ten in the morning. Please remember that food and drinks are not permitted inside the exhibition halls, but there is a small cafe on the ground floor where you are welcome to eat.',
        questions: [
            { type: 'mc', q: 'Where is photography NOT allowed?', options: ['The main hall', 'The gift shop', 'The ancient pottery room', 'The cafe'], correct: 2 },
            { type: 'fill', q: 'What time do guided tours start?', acceptedAnswers: ['ten', 'ten in the morning', '10am', '10 am'] },
            { type: 'mc', q: 'Where can visitors eat food?', options: ['In the exhibition halls', 'In the pottery room', 'In the small cafe', 'In the gift shop'], correct: 2 }
        ]
    },
    {
        id: 'il_section3',
        bandTier: 2,
        title: 'Section 3 - Discussing a Research Project',
        kind: 'dialogue',
        lines: [
            "A: Professor, I have finished the first draft of my research proposal on renewable energy.",
            "B: Good, what is the main focus of your study?",
            "A: I am comparing the efficiency of solar panels in urban versus rural environments.",
            "B: That is an interesting angle. Have you thought about your data collection method yet?",
            "A: Yes, I am planning to use existing government data rather than collecting new measurements myself.",
            "B: That should save you a lot of time. Just make sure you clearly explain why you chose that approach in your methodology section."
        ],
        audioText: 'Professor, I have finished the first draft of my research proposal on renewable energy. Good, what is the main focus of your study? I am comparing the efficiency of solar panels in urban versus rural environments. That is an interesting angle. Have you thought about your data collection method yet? Yes, I am planning to use existing government data rather than collecting new measurements myself. That should save you a lot of time. Just make sure you clearly explain why you chose that approach in your methodology section.',
        questions: [
            { type: 'mc', q: 'What is the student comparing in her research?', options: ['Wind vs solar energy', 'Solar panels in urban vs rural areas', 'Government funding programs', 'Old vs new solar technology'], correct: 1 },
            { type: 'fill', q: 'What data collection method will the student use?', acceptedAnswers: ['existing government data', 'government data', 'existing data'] },
            { type: 'mc', q: 'What does the professor advise the student to explain clearly?', options: ['Her personal background', 'Why she chose that data approach', 'The cost of the project', 'Her graduation date'], correct: 1 }
        ]
    },
    {
        id: 'il_section4',
        bandTier: 3,
        title: 'Section 4 - Lecture on Ocean Currents',
        kind: 'passage',
        text: "Today, I want to talk about ocean currents and their role in regulating the climate of our planet. Ocean currents are driven by several factors, including wind, temperature differences, and the rotation of the Earth. One of the most well-known currents is the Gulf Stream, which carries warm water from the Gulf of Mexico across the Atlantic toward Western Europe. This current is a major reason why countries like the United Kingdom have milder winters than other regions at similar latitudes. Scientists have become increasingly concerned in recent decades that climate change could weaken currents like the Gulf Stream, which in turn could cause more extreme and unpredictable weather patterns across the affected regions.",
        audioText: "Today, I want to talk about ocean currents and their role in regulating the climate of our planet. Ocean currents are driven by several factors, including wind, temperature differences, and the rotation of the Earth. One of the most well-known currents is the Gulf Stream, which carries warm water from the Gulf of Mexico across the Atlantic toward Western Europe. This current is a major reason why countries like the United Kingdom have milder winters than other regions at similar latitudes. Scientists have become increasingly concerned in recent decades that climate change could weaken currents like the Gulf Stream, which in turn could cause more extreme and unpredictable weather patterns across the affected regions.",
        questions: [
            { type: 'mc', q: 'Which current carries warm water toward Western Europe?', options: ['The Pacific Current', 'The Gulf Stream', 'The Arctic Current', 'The Indian Ocean Current'], correct: 1 },
            { type: 'fill', q: 'Why does the UK have milder winters than similar latitudes?', acceptedAnswers: ['the gulf stream', 'gulf stream', 'because of the gulf stream'] },
            { type: 'mc', q: 'What are scientists concerned climate change could do to currents like the Gulf Stream?', options: ['Make them faster', 'Weaken them', 'Have no effect on them', 'Make them warmer'], correct: 1 }
        ]
    },
    {
        id: 'il_section5',
        bandTier: 1,
        title: 'Section 1 - Registering for a Library Card',
        kind: 'dialogue',
        lines: [
            'A: Hi, I would like to register for a library card, please.',
            'B: Sure, could I have your name and date of birth?',
            'A: It is Daniel Carter, and my date of birth is the fourteenth of March.',
            'B: Great, and what is your current address?',
            'A: Twenty-two Baker Street.',
            'B: Perfect. Your card will be ready in about ten minutes, and it is valid for two years.'
        ],
        audioText: 'Hi, I would like to register for a library card, please. Sure, could I have your name and date of birth? It is Daniel Carter, and my date of birth is the fourteenth of March. Great, and what is your current address? Twenty-two Baker Street. Perfect. Your card will be ready in about ten minutes, and it is valid for two years.',
        questions: [
            { type: 'fill', q: "What is the customer's full name?", acceptedAnswers: ['daniel carter', 'daniel'] },
            { type: 'fill', q: 'What is the customer\'s address?', acceptedAnswers: ['twenty-two baker street', '22 baker street', 'baker street'] },
            { type: 'mc', q: 'How long is the library card valid for?', options: ['One year', 'Two years', 'Five years', 'Ten years'], correct: 1 }
        ]
    },
    {
        id: 'il_section6',
        bandTier: 1,
        title: 'Section 2 - Airport Announcement',
        kind: 'passage',
        text: 'Attention passengers, this is an announcement for flight two-one-four to Singapore. Boarding will begin in twenty minutes at gate twelve. Passengers travelling with young children or requiring extra assistance are invited to board first. Please have your boarding pass and passport ready for inspection. Note that the departure gate has changed from gate eight to gate twelve, so please allow extra time to walk to the new location. We apologize for any inconvenience this may cause.',
        audioText: 'Attention passengers, this is an announcement for flight two-one-four to Singapore. Boarding will begin in twenty minutes at gate twelve. Passengers travelling with young children or requiring extra assistance are invited to board first. Please have your boarding pass and passport ready for inspection. Note that the departure gate has changed from gate eight to gate twelve, so please allow extra time to walk to the new location. We apologize for any inconvenience this may cause.',
        questions: [
            { type: 'fill', q: 'What is the new departure gate number?', acceptedAnswers: ['twelve', '12', 'gate twelve', 'gate 12'] },
            { type: 'mc', q: 'Who is invited to board first?', options: ['Business class passengers only', 'Passengers with young children or needing assistance', 'Passengers with no luggage', 'Frequent flyers only'], correct: 1 },
            { type: 'fill', q: 'What documents should passengers have ready?', acceptedAnswers: ['boarding pass and passport', 'boarding pass', 'passport and boarding pass'] }
        ]
    },
    {
        id: 'il_section7',
        bandTier: 2,
        title: 'Section 3 - Group Project Discussion',
        kind: 'dialogue',
        lines: [
            'A: So for our group presentation, I think we should focus on the environmental impact of fast fashion.',
            'B: That sounds good, but do you think we have enough time to cover it properly in ten minutes?',
            'A: Maybe we should narrow it down to just the water pollution caused by textile dyeing.',
            'B: That is a better idea. I can research the statistics if you want to work on the case studies.',
            'A: Sounds fair. Let us also agree on a deadline to combine our sections before the presentation.',
            'B: How about we finish our parts by Thursday and rehearse together on Friday?'
        ],
        audioText: 'So for our group presentation, I think we should focus on the environmental impact of fast fashion. That sounds good, but do you think we have enough time to cover it properly in ten minutes? Maybe we should narrow it down to just the water pollution caused by textile dyeing. That is a better idea. I can research the statistics if you want to work on the case studies. Sounds fair. Let us also agree on a deadline to combine our sections before the presentation. How about we finish our parts by Thursday and rehearse together on Friday?',
        questions: [
            { type: 'mc', q: 'What topic do they decide to narrow their presentation down to?', options: ['Fast fashion in general', 'Water pollution from textile dyeing', 'Plastic packaging', 'Fashion advertising'], correct: 1 },
            { type: 'fill', q: 'What will speaker B research?', acceptedAnswers: ['the statistics', 'statistics'] },
            { type: 'fill', q: 'When do they plan to rehearse together?', acceptedAnswers: ['friday', 'on friday'] }
        ]
    },
    {
        id: 'il_section8',
        bandTier: 3,
        title: 'Section 4 - Lecture on Sleep Science',
        kind: 'passage',
        text: 'Today\'s lecture examines why sleep is so essential to human health. During sleep, the brain does not simply rest; it actively processes memories, consolidating information learned during the day into long-term storage. Sleep is typically divided into several cycles, each containing distinct stages, including deep sleep and rapid eye movement, or REM, sleep, during which most dreaming occurs. Chronic sleep deprivation has been linked to a wide range of negative outcomes, including impaired concentration, weakened immune function, and an increased risk of developing cardiovascular disease over time. Despite this growing body of evidence, surveys consistently show that a large proportion of adults in industrialized countries regularly sleep fewer hours than health experts recommend.',
        audioText: "Today's lecture examines why sleep is so essential to human health. During sleep, the brain does not simply rest; it actively processes memories, consolidating information learned during the day into long-term storage. Sleep is typically divided into several cycles, each containing distinct stages, including deep sleep and rapid eye movement, or REM, sleep, during which most dreaming occurs. Chronic sleep deprivation has been linked to a wide range of negative outcomes, including impaired concentration, weakened immune function, and an increased risk of developing cardiovascular disease over time. Despite this growing body of evidence, surveys consistently show that a large proportion of adults in industrialized countries regularly sleep fewer hours than health experts recommend.",
        questions: [
            { type: 'mc', q: 'What does the brain do during sleep, according to the lecture?', options: ['It completely shuts down', 'It actively processes and consolidates memories', 'It stops all activity except breathing', 'It only processes physical movement'], correct: 1 },
            { type: 'fill', q: 'During which sleep stage does most dreaming occur?', acceptedAnswers: ['rem', 'rem sleep', 'rapid eye movement'] },
            { type: 'mc', q: 'What has chronic sleep deprivation been linked to?', options: ['Improved concentration', 'Weakened immune function', 'Stronger memory', 'Lower risk of disease'], correct: 1 }
        ]
    }
];
