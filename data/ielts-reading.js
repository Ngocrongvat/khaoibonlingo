// IELTS-style reading passages. Question "type" values:
//   'mc'   - multiple choice: { options: [...], correct: idx }
//   'tfng' - True / False / Not Given: { correct: 'true' | 'false' | 'not_given' }
//   'fill' - sentence completion (free text): { acceptedAnswers: [...] }
const IELTS_READING = [
    {
        id: 'ir_1',
        bandTier: 1, // roughly Band 5.0-6.0 difficulty
        title: 'Urban Beekeeping',
        passage: "In recent years, keeping bees on city rooftops has become increasingly popular. Urban beekeepers argue that cities can actually provide better conditions for bees than rural areas, since city gardens and parks often use fewer pesticides than large farms. A single hive can produce over twenty kilograms of honey per year, and the bees also help pollinate nearby gardens and street trees. However, city beekeeping is not without challenges: hives must be registered with local authorities in many places, and beekeepers need training to manage bees safely near people. Despite these hurdles, community groups in several major cities now run beekeeping workshops for beginners, and interest continues to grow each year.",
        questions: [
            { type: 'mc', q: 'Why might cities provide better conditions for bees than farms?', options: ['Cities have warmer weather', 'City gardens use fewer pesticides', 'Cities have more flowers', 'City bees are naturally stronger'], correct: 1 },
            { type: 'fill', q: 'How many kilograms of honey can a single hive produce per year?', acceptedAnswers: ['over twenty', 'twenty', '20', 'more than 20', 'over 20'] },
            { type: 'tfng', q: 'Urban beekeepers do not need any kind of training.', correct: 'false' },
            { type: 'tfng', q: 'Community workshops are only available for experienced beekeepers.', correct: 'false' },
            { type: 'tfng', q: 'Registering a hive is required in some places.', correct: 'true' }
        ]
    },
    {
        id: 'ir_2',
        bandTier: 2, // roughly Band 6.0-7.0
        title: 'The Silk Road',
        passage: "The Silk Road was not a single road but a network of trade routes that connected East Asia with the Mediterranean world for over a thousand years. Merchants carried silk, spices, and precious stones westward, while gold, wool, and glassware moved east. Beyond goods, the Silk Road also carried ideas: religions such as Buddhism spread along these routes, and technologies like papermaking eventually reached Europe through the same paths. Travel along the Silk Road was slow and dangerous, with merchants facing harsh deserts, high mountain passes, and the constant threat of bandits. As a result, few traders travelled the entire route themselves; instead, goods typically passed through many hands, with each merchant covering only a section of the journey before selling to the next trader.",
        questions: [
            { type: 'mc', q: 'What is the main point made about the Silk Road in the first sentence?', options: ['It was a single paved road', 'It was actually a network of routes', 'It only existed for one century', 'It connected only two cities'], correct: 1 },
            { type: 'fill', q: 'Besides goods, what else spread along the Silk Road?', acceptedAnswers: ['ideas', 'religions', 'technologies', 'ideas and technologies'] },
            { type: 'tfng', q: 'Most merchants travelled the entire length of the Silk Road themselves.', correct: 'false' },
            { type: 'tfng', q: 'Papermaking technology reached Europe through the Silk Road.', correct: 'true' },
            { type: 'tfng', q: 'The passage states exactly how many bandits attacked merchants each year.', correct: 'not_given' }
        ]
    },
    {
        id: 'ir_3',
        bandTier: 3, // roughly Band 7.5+
        title: 'Cognitive Bias in Decision-Making',
        passage: "Human beings like to think of themselves as rational decision-makers, yet decades of research in behavioural psychology suggest otherwise. Cognitive biases are systematic patterns of deviation from rationality, and they influence judgment in ways that are often invisible to the person making the decision. Confirmation bias, for instance, leads people to seek out information that supports their existing beliefs while disregarding evidence that contradicts them. Anchoring bias causes individuals to rely too heavily on the first piece of information they encounter, even when it is irrelevant to the decision at hand. Although awareness of these biases has grown considerably since the pioneering work of psychologists in the 1970s, simply knowing that a bias exists does not necessarily prevent a person from falling victim to it. Some researchers argue that structural changes to decision-making processes, such as checklists or the introduction of a devil's advocate role in group discussions, are more effective than individual awareness alone at reducing biased outcomes.",
        questions: [
            { type: 'mc', q: 'According to the passage, what does confirmation bias cause people to do?', options: ['Ignore all new information', 'Seek information supporting existing beliefs', 'Change their beliefs frequently', 'Rely on the first piece of information'], correct: 1 },
            { type: 'mc', q: 'What do some researchers argue is more effective than individual awareness?', options: ['Reading more psychology books', 'Structural changes to decision-making processes', 'Ignoring all biases entirely', 'Working alone rather than in groups'], correct: 1 },
            { type: 'fill', q: 'Anchoring bias means relying too heavily on what?', acceptedAnswers: ['the first piece of information', 'first information', 'the first information encountered'] },
            { type: 'tfng', q: 'Awareness of cognitive biases has grown since the 1970s.', correct: 'true' },
            { type: 'tfng', q: 'Knowing about a bias is always enough to prevent it.', correct: 'false' },
            { type: 'tfng', q: 'The passage names the exact psychologists who pioneered this research.', correct: 'not_given' }
        ]
    },
    {
        id: 'ir_4',
        bandTier: 1,
        title: 'The History of Chocolate',
        passage: "Chocolate has a much older history than most people realize. Ancient civilizations in Central America, including the Maya and later the Aztecs, made a bitter drink from crushed cacao beans mixed with water and spices, and they valued cacao so highly that the beans were even used as a form of currency. When Spanish explorers brought cacao back to Europe in the sixteenth century, sugar was added to make the drink sweeter, and it quickly became a fashionable treat among the wealthy. Solid chocolate bars, similar to what we eat today, were not invented until the nineteenth century, when new manufacturing techniques made it possible to press cacao into a solid, smooth form.",
        questions: [
            { type: 'mc', q: 'What did the Maya and Aztecs use cacao beans for besides making a drink?', options: ['As building material', 'As a form of currency', 'As medicine only', 'As clothing dye'], correct: 1 },
            { type: 'fill', q: 'What did Europeans add to make the cacao drink sweeter?', acceptedAnswers: ['sugar'] },
            { type: 'tfng', q: 'Solid chocolate bars existed in ancient Aztec civilization.', correct: 'false' },
            { type: 'tfng', q: 'The Spanish were the first Europeans to bring cacao back from the Americas.', correct: 'true' },
            { type: 'tfng', q: 'The passage states the exact number of cacao beans needed to buy goods.', correct: 'not_given' }
        ]
    },
    {
        id: 'ir_5',
        bandTier: 1,
        title: 'Public Libraries in the Digital Age',
        passage: "Many people assumed that public libraries would become less important once books and information became widely available online. In fact, libraries in many cities have adapted and remain busy places. Modern libraries now offer free internet access, digital borrowing of e-books, and community spaces for events such as workshops and children's reading groups. For people who cannot afford a computer or a fast internet connection at home, the local library is often the only place where they can search for jobs online or complete school assignments. As a result, many library directors argue that their buildings are more essential to communities now than they were several decades ago.",
        questions: [
            { type: 'mc', q: 'What is one modern service that libraries now offer?', options: ['Free digital borrowing of e-books', 'Free grocery delivery', 'Private tutoring only', 'Paid internet access'], correct: 0 },
            { type: 'fill', q: 'Who especially depends on libraries for internet access, according to the passage?', acceptedAnswers: ['people who cannot afford a computer', 'those who cannot afford internet', 'people without a computer at home'] },
            { type: 'tfng', q: 'Libraries have become less busy since the internet became widely available.', correct: 'false' },
            { type: 'tfng', q: 'Some library directors believe libraries are more important now than in the past.', correct: 'true' },
            { type: 'tfng', q: 'The passage names a specific library that offers job-searching help.', correct: 'not_given' }
        ]
    },
    {
        id: 'ir_6',
        bandTier: 2,
        title: 'Urban Green Spaces and Mental Health',
        passage: "A growing body of research suggests that access to green spaces, such as parks and community gardens, has a measurable positive effect on mental health in cities. Studies have found that people who live within walking distance of a park report lower levels of stress and anxiety than those who do not. Researchers believe several factors are at play: green spaces provide opportunities for physical exercise, encourage social interaction among neighbours, and offer a visual break from the noise and concrete of city streets. As urban populations continue to grow, some city planners now argue that green space should be treated as essential infrastructure, in the same category as roads and hospitals, rather than as an optional luxury.",
        questions: [
            { type: 'mc', q: 'What do people living near parks report, according to the research?', options: ['Higher stress levels', 'Lower levels of stress and anxiety', 'No change in mental health', 'More frequent illness'], correct: 1 },
            { type: 'fill', q: 'What do some city planners now believe green space should be treated as?', acceptedAnswers: ['essential infrastructure', 'infrastructure'] },
            { type: 'tfng', q: 'Green spaces are described as encouraging social interaction among neighbours.', correct: 'true' },
            { type: 'tfng', q: 'All city planners agree that green space is an optional luxury.', correct: 'false' },
            { type: 'tfng', q: 'The passage states the exact percentage reduction in stress from living near a park.', correct: 'not_given' }
        ]
    },
    {
        id: 'ir_7',
        bandTier: 2,
        title: 'The Rise of Electric Vehicles',
        passage: "Sales of electric vehicles have increased dramatically over the past decade, driven by falling battery costs, government incentives, and growing concern about air pollution from traditional petrol and diesel engines. However, the shift to electric vehicles still faces significant obstacles. Charging infrastructure remains limited in many rural areas, and the time required to fully charge a car is still much longer than the few minutes it takes to fill a fuel tank. There are also questions about the environmental cost of mining the metals used in batteries. Despite these challenges, several major car manufacturers have announced plans to stop producing petrol and diesel vehicles entirely within the next two decades, suggesting that the transition to electric transport, while gradual, is now considered inevitable by much of the industry.",
        questions: [
            { type: 'mc', q: 'What has driven the increase in electric vehicle sales?', options: ['Rising battery costs', 'Falling battery costs and government incentives', 'A decrease in fuel car sales', 'New petrol taxes only'], correct: 1 },
            { type: 'fill', q: 'What remains limited in many rural areas?', acceptedAnswers: ['charging infrastructure', 'infrastructure'] },
            { type: 'tfng', q: 'Charging an electric car currently takes about the same time as filling a fuel tank.', correct: 'false' },
            { type: 'tfng', q: 'Some car manufacturers plan to stop making petrol and diesel vehicles.', correct: 'true' },
            { type: 'tfng', q: 'The passage names the exact number of car manufacturers making this pledge.', correct: 'not_given' }
        ]
    },
    {
        id: 'ir_8',
        bandTier: 3,
        title: 'The Ethics of Artificial Intelligence in Healthcare',
        passage: "As artificial intelligence systems become increasingly capable of diagnosing diseases and recommending treatments, healthcare providers face a set of ethical questions that did not exist a generation ago. One central concern is accountability: if an AI system makes an incorrect diagnosis that harms a patient, it is not always clear whether responsibility lies with the developer of the software, the hospital that deployed it, or the physician who relied on its recommendation. A further complication arises from the fact that many AI systems function as \"black boxes\", producing accurate predictions without offering a transparent explanation of their reasoning, which makes it difficult for doctors to fully justify decisions to patients. Proponents argue that these concerns, while legitimate, should not prevent the adoption of technology that has already demonstrated an ability to detect certain conditions earlier and more accurately than human specialists.",
        questions: [
            { type: 'mc', q: 'What is one central ethical concern mentioned about AI in healthcare?', options: ['The cost of computers', 'Accountability when an AI diagnosis causes harm', 'The speed of internet connections', 'A shortage of doctors'], correct: 1 },
            { type: 'mc', q: 'Why are "black box" AI systems considered problematic?', options: ['They are too expensive', 'They do not offer a transparent explanation of their reasoning', 'They are too slow to use', 'They require too much electricity'], correct: 1 },
            { type: 'fill', q: 'What have some AI systems already demonstrated an ability to do better than human specialists?', acceptedAnswers: ['detect certain conditions earlier and more accurately', 'detect conditions earlier', 'diagnose conditions more accurately'] },
            { type: 'tfng', q: 'It is always clear who is responsible when an AI diagnosis causes harm.', correct: 'false' },
            { type: 'tfng', q: 'Proponents believe ethical concerns should stop AI adoption entirely.', correct: 'false' },
            { type: 'tfng', q: 'The passage names a specific hospital that uses AI diagnosis systems.', correct: 'not_given' }
        ]
    },
    {
        id: 'ir_9',
        bandTier: 3,
        title: 'Linguistic Relativity',
        passage: "The idea that the language we speak might shape the way we think, known as linguistic relativity, has been debated by linguists for nearly a century. An early, strong version of this hypothesis, associated with Benjamin Lee Whorf, claimed that language essentially determines thought, meaning that speakers of different languages would perceive reality in fundamentally different ways. This strong version has largely been rejected by modern researchers, who found little convincing evidence for it. However, a more moderate version of the hypothesis has gained support in recent decades: while language may not determine what we are capable of thinking, it does appear to influence which distinctions we habitually notice and remember. For example, speakers of languages with multiple words for different shades of a colour tend to distinguish between those shades more quickly than speakers whose language uses only one word for the same range of colours.",
        questions: [
            { type: 'mc', q: 'What did the strong version of linguistic relativity claim?', options: ['Language has no effect on thought', 'Language essentially determines thought', 'All languages are identical', 'Colour perception is universal'], correct: 1 },
            { type: 'fill', q: 'Who is the strong version of the hypothesis associated with?', acceptedAnswers: ['benjamin lee whorf', 'whorf'] },
            { type: 'tfng', q: 'Modern researchers found strong evidence supporting the strong version of the hypothesis.', correct: 'false' },
            { type: 'tfng', q: 'A moderate version of the hypothesis suggests language influences which distinctions we notice.', correct: 'true' },
            { type: 'tfng', q: 'The passage states exactly how many languages have multiple words for colour shades.', correct: 'not_given' }
        ]
    }
];
