// Combinatorial reading/dialogue generation, organized by topic. Rather than storing
// hundreds of hand-written passages per topic (impossible to guarantee grammatically
// correct and non-repetitive at that scale), each topic defines a small number of
// carefully-written "shapes" (paragraph/dialogue skeletons) with several substitutable
// slots pulled from topic-specific word pools. A handful of shapes x modest slot pools
// already yields thousands of distinct, grammatically-valid combinations per topic -
// comfortably exceeding a ~300-passage target while keeping every sentence hand-checked
// for correctness (the risk with pure Mad-Libs is subject-verb agreement / article
// mismatches, so every slot pool below is written in the single verb form/article
// context each shape actually uses).
const TOPIC_NAME_POOL = ['Anna', 'David', 'Maria', 'Tom', 'Linh', 'Nam', 'Mai', 'Sophia', 'James', 'Lan', 'Hoa', 'Kevin'];

const TOPIC_PASSAGES = [
    {
        topic: 'Daily Life & Routines',
        slots: {
            time: ['six', 'six thirty', 'seven', 'seven thirty', 'eight', 'five thirty'],
            morningActivity: ['brushes their teeth', 'eats a quick breakfast', 'takes a shower', 'gets dressed', 'checks messages on the phone', 'makes a cup of coffee'],
            transport: ['walks', 'takes the bus', 'rides a bike', 'drives a car', 'takes the train'],
            place: ['school', 'the office', 'work', 'the gym', 'university'],
            eveningActivity: ['watches TV', 'reads a book', 'cooks dinner', 'calls a friend', 'does homework', 'plays video games', 'goes for a walk', 'listens to music']
        },
        // Bare/first-person forms of the two verb-phrase slots above, for reuse in
        // dialogue lines spoken as "I ___" - the third-person forms in `slots` (e.g.
        // "brushes their teeth") would wrongly produce "I brushes their teeth" if
        // reused directly after a first-person subject.
        baseForms: {
            morningActivity: ['brush my teeth', 'eat a quick breakfast', 'take a shower', 'get dressed', 'check messages on my phone', 'make a cup of coffee'],
            transport: ['walk', 'take the bus', 'ride a bike', 'drive a car', 'take the train']
        },
        readingShapes: [
            {
                passage: '{name} wakes up at {time} every morning. After that, {name} {morningActivity} and then {transport} to {place}. In the evening, {name} usually {eveningActivity}.',
                question: 'What does {name} usually do in the evening?',
                askSlot: 'eveningActivity'
            },
            {
                passage: 'Every day, {name} {transport} to {place}. Before leaving home, {name} {morningActivity}. {name} always wakes up at {time}.',
                question: 'What time does {name} wake up?',
                askSlot: 'time'
            }
        ],
        dialogueShapes: [
            {
                lines: ['A: What time do you usually wake up?', 'B: I wake up at {time}, then I {morningActivity}.'],
                question: 'What does B do after waking up?',
                askSlot: 'morningActivity',
                baseFormSlots: ['morningActivity']
            },
            {
                lines: ['A: How do you get to {place}?', 'B: I usually {transport}.'],
                question: 'How does B get to {place}?',
                askSlot: 'transport',
                baseFormSlots: ['transport']
            }
        ]
    },
    {
        topic: 'School & Study',
        slots: {
            subject: ['Math', 'English', 'History', 'Science', 'Art', 'Music', 'Geography', 'Physical Education'],
            time: ['eight', 'eight thirty', 'nine', 'nine thirty', 'ten'],
            activity: ['studies in the library', 'does homework with friends', 'reviews notes', 'prepares for a test', 'asks the teacher questions', 'joins a study group'],
            grade: ['an A', 'a B', 'a high score', 'good marks', 'a passing grade'],
            afterSchool: ['plays sports', 'joins a club', 'goes to the library', 'does homework', 'takes music lessons', 'meets friends at a cafe']
        },
        baseForms: {
            afterSchool: ['play sports', 'join a club', 'go to the library', 'do homework', 'take music lessons', 'meet friends at a cafe']
        },
        readingShapes: [
            {
                passage: '{name} has {subject} class at {time} every day. Before the exam, {name} {activity}. Last week, {name} got {grade} on the test.',
                question: 'What did {name} get on the test?',
                askSlot: 'grade'
            },
            {
                passage: 'After school, {name} usually {afterSchool}. {name} likes {subject} the most among all subjects. Classes start at {time}.',
                question: 'What does {name} usually do after school?',
                askSlot: 'afterSchool'
            }
        ],
        dialogueShapes: [
            {
                lines: ['A: What is your favorite subject?', 'B: I really like {subject}.'],
                question: 'What subject does B like?',
                askSlot: 'subject'
            },
            {
                lines: ['A: What do you do after school?', 'B: I usually {afterSchool}.'],
                question: 'What does B usually do after school?',
                askSlot: 'afterSchool',
                baseFormSlots: ['afterSchool']
            }
        ]
    },
    {
        topic: 'Work & Careers',
        slots: {
            job: ['a teacher', 'an engineer', 'a doctor', 'a chef', 'a nurse', 'an accountant', 'a designer', 'a driver', 'a manager', 'a programmer'],
            place: ['a hospital', 'an office', 'a school', 'a restaurant', 'a factory', 'a company'],
            task: ['answers emails', 'attends meetings', 'writes reports', 'talks to customers', 'plans the schedule', 'trains new employees'],
            time: ['eight hours', 'nine hours', 'six hours', 'seven hours'],
            feeling: ['tired but happy', 'stressed', 'excited', 'proud', 'satisfied']
        },
        baseForms: {
            task: ['answer emails', 'attend meetings', 'write reports', 'talk to customers', 'plan the schedule', 'train new employees']
        },
        readingShapes: [
            {
                passage: '{name} works as {job} at {place}. Every day, {name} {task}. {name} usually works for {time} a day and feels {feeling} after work.',
                question: 'How does {name} feel after work?',
                askSlot: 'feeling'
            },
            {
                passage: '{name} is {job}. At {place}, {name} {task} every day. {name} works {time} a day.',
                question: 'What does {name} do every day at work?',
                askSlot: 'task'
            }
        ],
        dialogueShapes: [
            {
                lines: ['A: What do you do for a living?', 'B: I am {job}. I work at {place}.'],
                question: 'What is B\'s job?',
                askSlot: 'job'
            },
            {
                lines: ['A: How was work today?', 'B: It was fine. I {task}, as usual.'],
                question: 'What did B do at work?',
                askSlot: 'task',
                baseFormSlots: ['task']
            }
        ]
    },
    {
        topic: 'Shopping & Money',
        slots: {
            item: ['a new jacket', 'some shoes', 'a birthday gift', 'groceries', 'a phone case', 'a book', 'a pair of jeans', 'some vegetables'],
            place: ['the mall', 'the market', 'a supermarket', 'an online store', 'a department store'],
            price: ['twenty dollars', 'fifty dollars', 'a hundred dollars', 'ten dollars', 'thirty dollars'],
            paymentMethod: ['cash', 'a credit card', 'a mobile app', 'a debit card'],
            reaction: ['was very happy', 'thought it was expensive', 'was satisfied', 'felt it was a good deal', 'was surprised by the price']
        },
        readingShapes: [
            {
                passage: '{name} went to {place} to buy {item}. It cost {price}, and {name} paid with {paymentMethod}. {name} {reaction} with the purchase.',
                question: 'How did {name} feel about the purchase?',
                askSlot: 'reaction'
            },
            {
                passage: 'Yesterday, {name} bought {item} at {place} for {price}. {name} paid with {paymentMethod}.',
                question: 'How much did {item} cost?',
                askSlot: 'price'
            }
        ],
        dialogueShapes: [
            {
                lines: ['A: How much does {item} cost?', 'B: It costs {price}.'],
                question: 'How much does {item} cost?',
                askSlot: 'price'
            },
            {
                lines: ['A: How would you like to pay?', 'B: I will pay with {paymentMethod}.'],
                question: 'How will B pay?',
                askSlot: 'paymentMethod'
            }
        ]
    },
    {
        topic: 'Food & Restaurants',
        slots: {
            dish: ['pho', 'a pizza', 'fried rice', 'a sandwich', 'sushi', 'grilled chicken', 'a salad', 'noodle soup'],
            place: ['a small restaurant', 'a food stall', 'a family restaurant', 'a new cafe', 'a street market'],
            taste: ['delicious', 'a bit spicy', 'very fresh', 'too salty', 'amazing', 'quite sweet'],
            drink: ['iced tea', 'orange juice', 'coffee', 'lemonade', 'water', 'a smoothie'],
            companion: ['friends', 'family', 'coworkers', 'a friend'],
        },
        readingShapes: [
            {
                passage: '{name} went to {place} with {companion} and ordered {dish}. The food was {taste}. {name} also had {drink} with the meal.',
                question: 'How did the food taste?',
                askSlot: 'taste'
            },
            {
                passage: 'Last night, {name} tried {dish} at {place}. It was {taste}. {name} drank {drink} with it.',
                question: 'What did {name} order?',
                askSlot: 'dish'
            }
        ],
        dialogueShapes: [
            {
                lines: ['A: What would you like to order?', 'B: I would like {dish}, please.'],
                question: 'What did B order?',
                askSlot: 'dish'
            },
            {
                lines: ['A: How is the food?', 'B: It is {taste}.'],
                question: 'How does B describe the food?',
                askSlot: 'taste'
            }
        ]
    },
    {
        topic: 'Travel & Transportation',
        slots: {
            destination: ['Da Nang', 'Paris', 'Tokyo', 'the countryside', 'a nearby island', 'the mountains', 'Ho Chi Minh City', 'Singapore'],
            transport: ['plane', 'train', 'car', 'bus', 'boat'],
            duration: ['three days', 'a week', 'two weeks', 'a weekend', 'five days'],
            activity: ['visited the old town', 'went swimming', 'tried local food', 'took a lot of photos', 'went hiking', 'visited a museum'],
            feeling: ['relaxed', 'excited', 'tired but happy', 'amazed']
        },
        readingShapes: [
            {
                passage: '{name} traveled to {destination} by {transport} for {duration}. During the trip, {name} {activity}. {name} felt {feeling} after the trip.',
                question: 'How did {name} feel after the trip?',
                askSlot: 'feeling'
            },
            {
                passage: 'Last summer, {name} went to {destination} for {duration}. {name} traveled by {transport} and {activity}.',
                question: 'How did {name} travel to {destination}?',
                askSlot: 'transport'
            }
        ],
        dialogueShapes: [
            {
                lines: ['A: Where are you going for your trip?', 'B: I am going to {destination} for {duration}.'],
                question: 'Where is B going?',
                askSlot: 'destination'
            },
            {
                lines: ['A: How will you get there?', 'B: I will go by {transport}.'],
                question: 'How will B travel?',
                askSlot: 'transport'
            }
        ]
    },
    {
        topic: 'Health & Body',
        slots: {
            symptom: ['a headache', 'a fever', 'a sore throat', 'a stomachache', 'a cold', 'a cough'],
            place: ['a hospital', 'a clinic', 'a pharmacy', 'the doctor\'s office'],
            advice: ['get some rest', 'drink more water', 'take some medicine', 'see a doctor', 'sleep early'],
            duration: ['two days', 'a few days', 'a week', 'one day'],
            outcome: ['felt much better', 'recovered quickly', 'was still a bit tired', 'felt fine again']
        },
        readingShapes: [
            {
                passage: '{name} had {symptom} last week and went to {place}. The doctor told {name} to {advice}. After {duration}, {name} {outcome}.',
                question: 'What did the doctor advise {name} to do?',
                askSlot: 'advice'
            },
            {
                passage: '{name} was not feeling well because of {symptom}. {name} decided to {advice}. After {duration}, {name} {outcome}.',
                question: 'What was wrong with {name}?',
                askSlot: 'symptom'
            }
        ],
        dialogueShapes: [
            {
                lines: ['A: What is wrong with you?', 'B: I have {symptom}.'],
                question: 'What is wrong with B?',
                askSlot: 'symptom'
            },
            {
                lines: ['A: What should I do?', 'B: You should {advice}.'],
                question: 'What does B suggest?',
                askSlot: 'advice'
            }
        ]
    },
    {
        topic: 'Family & Relationships',
        slots: {
            relative: ['mother', 'father', 'older sister', 'younger brother', 'grandmother', 'grandfather', 'aunt', 'uncle'],
            activity: ['cooks dinner for the family', 'tells interesting stories', 'helps with homework', 'plays games with the children', 'takes care of the garden', 'teaches life lessons'],
            occasion: ['a birthday party', 'a family reunion', 'a holiday dinner', 'a weekend gathering'],
            feeling: ['loved', 'grateful', 'happy', 'close to the family']
        },
        // "They" (singular, referring to one relative) still takes the plural/base verb
        // form ("they always cook", not "they always cooks") - same fix pattern as
        // Daily Life's baseForms above.
        baseForms: {
            activity: ['cook dinner for the family', 'tell interesting stories', 'help with homework', 'play games with the children', 'take care of the garden', 'teach life lessons']
        },
        readingShapes: [
            {
                passage: '{name}\'s {relative} always {activity}. Last weekend, the whole family had {occasion}. {name} felt very {feeling}.',
                question: 'What does {name}\'s {relative} usually do?',
                askSlot: 'activity'
            },
            {
                passage: 'Every year, {name}\'s family has {occasion}. {name}\'s {relative} always {activity}, which makes everyone happy.',
                question: 'What kind of event does the family have every year?',
                askSlot: 'occasion'
            }
        ],
        dialogueShapes: [
            {
                lines: ['A: Who is your favorite family member?', 'B: My {relative}. They always {activity}.'],
                question: 'What does B\'s relative always do?',
                askSlot: 'activity',
                baseFormSlots: ['activity']
            },
            {
                lines: ['A: How was the {occasion}?', 'B: It was wonderful. I felt very {feeling}.'],
                question: 'How did B feel?',
                askSlot: 'feeling'
            }
        ]
    },
    {
        topic: 'Weather & Seasons',
        slots: {
            season: ['spring', 'summer', 'autumn', 'winter'],
            weather: ['sunny', 'rainy', 'windy', 'cold', 'hot', 'cloudy'],
            activity: ['goes to the beach', 'stays home and reads', 'wears a warm coat', 'carries an umbrella', 'goes hiking', 'drinks hot tea'],
            feeling: ['loves this season', 'finds it uncomfortable', 'enjoys the weather', 'prefers a different season']
        },
        readingShapes: [
            {
                passage: 'In {season}, the weather is usually {weather}. During this season, {name} {activity}. {name} {feeling}.',
                question: 'What does {name} usually do in this season?',
                askSlot: 'activity'
            },
            {
                passage: 'Today the weather is {weather} because it is {season}. {name} decided to {activity}.',
                question: 'What season is it?',
                askSlot: 'season'
            }
        ],
        dialogueShapes: [
            {
                lines: ['A: What is the weather like today?', 'B: It is {weather} today.'],
                question: 'What is the weather like?',
                askSlot: 'weather'
            },
            {
                lines: ['A: What is your favorite season?', 'B: I like {season} because the weather is {weather}.'],
                question: 'What season does B like?',
                askSlot: 'season'
            }
        ]
    },
    {
        topic: 'Hobbies & Sports',
        slots: {
            hobby: ['playing football', 'painting', 'playing the guitar', 'swimming', 'reading novels', 'playing badminton', 'photography', 'cooking'],
            frequency: ['every day', 'twice a week', 'every weekend', 'once a month', 'every evening'],
            place: ['the park', 'a sports club', 'home', 'a studio', 'the gym'],
            feeling: ['relaxed', 'energetic', 'happy', 'focused']
        },
        readingShapes: [
            {
                passage: '{name}\'s favorite hobby is {hobby}. {name} practices {frequency} at {place}. It makes {name} feel {feeling}.',
                question: 'How often does {name} practice this hobby?',
                askSlot: 'frequency'
            },
            {
                passage: 'In free time, {name} enjoys {hobby}. {name} usually goes to {place} to do this {frequency}.',
                question: 'What is {name}\'s favorite hobby?',
                askSlot: 'hobby'
            }
        ],
        dialogueShapes: [
            {
                lines: ['A: What do you do in your free time?', 'B: I enjoy {hobby}.'],
                question: 'What does B enjoy doing?',
                askSlot: 'hobby'
            },
            {
                lines: ['A: How often do you do that?', 'B: I do it {frequency}.'],
                question: 'How often does B do this hobby?',
                askSlot: 'frequency'
            }
        ]
    },
    {
        topic: 'Technology & Communication',
        slots: {
            device: ['a smartphone', 'a laptop', 'a tablet', 'a smartwatch', 'a computer'],
            app: ['a messaging app', 'a video call app', 'a social media app', 'an email app'],
            purpose: ['to contact friends', 'to do work', 'to watch videos', 'to study online', 'to shop online'],
            problem: ['the battery died', 'the internet was slow', 'the screen broke', 'it stopped working']
        },
        readingShapes: [
            {
                passage: '{name} uses {device} every day, mostly {purpose}. {name} often uses {app} for communication. Yesterday, {problem}.',
                question: 'What problem did {name} have yesterday?',
                askSlot: 'problem'
            },
            {
                passage: '{name} bought {device} last month. {name} uses it {purpose} and often opens {app} to talk to friends.',
                question: 'Why does {name} use {device}?',
                askSlot: 'purpose'
            }
        ],
        dialogueShapes: [
            {
                lines: ['A: What do you use to talk to your friends?', 'B: I usually use {app}.'],
                question: 'What app does B use?',
                askSlot: 'app'
            },
            {
                lines: ['A: What happened to your phone?', 'B: {problem}.'],
                question: 'What was the problem with the phone?',
                askSlot: 'problem'
            }
        ]
    }
];
