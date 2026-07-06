const IELTS_SPEAKING_PROMPTS = [
    {
        id: 'sp_1',
        part1: ['Can you tell me a little about your hometown?', 'What do you like to do in your free time?', 'Do you prefer spending time indoors or outdoors? Why?'],
        part2: { cueCard: 'Describe a book you recently read.', points: ['what the book was about', 'why you decided to read it', 'how you felt about it', 'and explain whether you would recommend it to others'], prepSeconds: 60, speakSeconds: 120 },
        part3: ['Do you think reading habits have changed in recent years?', 'Should schools encourage children to read more?', 'What are the benefits of reading fiction compared to non-fiction?']
    },
    {
        id: 'sp_2',
        part1: ['What kind of work or studies are you currently doing?', 'Do you enjoy your job or studies? Why or why not?', 'What do you usually do to relax after a busy day?'],
        part2: { cueCard: 'Describe a skill you would like to learn.', points: ['what the skill is', 'why you want to learn it', 'how you would learn it', 'and explain how learning it would benefit you'], prepSeconds: 60, speakSeconds: 120 },
        part3: ['Why do some people find it difficult to learn new skills as adults?', 'Do you think schools should teach more practical skills?', 'How has technology changed the way people learn new skills?']
    },
    {
        id: 'sp_3',
        part1: ['What is your favorite type of weather? Why?', 'Do you like traveling to new places?', 'How often do you use public transportation?'],
        part2: { cueCard: 'Describe a memorable trip you have taken.', points: ['where you went', 'who you went with', 'what you did there', 'and explain why the trip was memorable'], prepSeconds: 60, speakSeconds: 120 },
        part3: ['How has tourism changed in your country over the past decade?', 'What are the benefits and drawbacks of mass tourism?', 'Do you think people should travel more within their own country?']
    },
    {
        id: 'sp_4',
        part1: ['Do you enjoy cooking?', 'What is a typical meal in your country?', 'Do you prefer eating at home or eating out?'],
        part2: { cueCard: 'Describe a meal you really enjoyed.', points: ['what the meal was', 'where you had it', 'who you were with', 'and explain why you enjoyed it so much'], prepSeconds: 60, speakSeconds: 120 },
        part3: ['How have eating habits changed in your country in recent years?', 'Do you think fast food is a serious problem for public health?', 'Should governments regulate the advertising of unhealthy food?']
    },
    {
        id: 'sp_5',
        part1: ['What kind of music do you usually listen to?', 'Did you learn to play any musical instrument as a child?', 'Do you think music is important in daily life?'],
        part2: { cueCard: 'Describe a piece of music or a song that is important to you.', points: ['what the song or music is', 'when you first heard it', 'what it reminds you of', 'and explain why it is important to you'], prepSeconds: 60, speakSeconds: 120 },
        part3: ['How has the music industry changed because of the internet?', 'Do you think music education should be compulsory in schools?', 'What role does music play in different cultures?']
    },
    {
        id: 'sp_6',
        part1: ['Do you use social media often?', 'What do you usually do with your friends?', 'Is it easy to make new friends in your city?'],
        part2: { cueCard: 'Describe a close friend of yours.', points: ['how you met this friend', 'what this friend is like', 'what you usually do together', 'and explain why this friendship is important to you'], prepSeconds: 60, speakSeconds: 120 },
        part3: ['Do you think technology has made it easier or harder to maintain friendships?', 'How do friendships differ between generations?', 'Is it possible to have a close friendship with someone you have never met in person?']
    },
    {
        id: 'sp_7',
        part1: ['What is the environment like in the area where you live?', 'Do you do anything to help protect the environment?', 'Do you think people in your country care about environmental issues?'],
        part2: { cueCard: 'Describe an environmental problem in your local area.', points: ['what the problem is', 'what causes it', 'who is affected by it', 'and explain what could be done to solve it'], prepSeconds: 60, speakSeconds: 120 },
        part3: ['Should individuals or governments be more responsible for protecting the environment?', 'What are the biggest environmental challenges facing the world today?', 'Do you think renewable energy will replace fossil fuels in the near future?']
    },
    {
        id: 'sp_8',
        part1: ['What did you want to be when you were a child?', 'What subjects were you good at in school?', 'Do you think your education prepared you well for your career?'],
        part2: { cueCard: 'Describe a teacher who has influenced you.', points: ['who this teacher was', 'what subject they taught', 'what made them memorable', 'and explain how they influenced you'], prepSeconds: 60, speakSeconds: 120 },
        part3: ['What qualities make a good teacher?', 'How has the role of teachers changed with new technology?', 'Should teachers be paid more than they currently are?']
    },
    {
        id: 'sp_9',
        part1: ['What kind of technology do you use most often?', 'Do you think you rely too much on your phone?', 'How has technology changed the way you communicate with your family?'],
        part2: { cueCard: 'Describe a piece of technology you find useful.', points: ['what it is', 'how you use it', 'how long you have had it', 'and explain why it is useful to you'], prepSeconds: 60, speakSeconds: 120 },
        part3: ['How has technology changed daily life over the past twenty years?', 'Do you think older generations find it harder to adapt to new technology?', 'What are the disadvantages of relying too heavily on technology?']
    },
    {
        id: 'sp_10',
        part1: ['Do you play any sports?', 'Did you play sports when you were a child?', 'Do you prefer watching sports or playing them?'],
        part2: { cueCard: 'Describe a sport you enjoy watching or playing.', points: ['what the sport is', 'how you got interested in it', 'how often you play or watch it', 'and explain why you enjoy it'], prepSeconds: 60, speakSeconds: 120 },
        part3: ['Why do you think some sports are more popular than others?', 'Should governments spend money to support professional sports teams?', 'How can schools encourage more children to be physically active?']
    },
    {
        id: 'sp_11',
        part1: ['What kinds of celebrations are important in your country?', 'Do you enjoy attending large gatherings or parties?', 'How do you usually celebrate your birthday?'],
        part2: { cueCard: 'Describe a celebration or festival you attended.', points: ['what the occasion was', 'where it took place', 'who you were with', 'and explain why it was memorable'], prepSeconds: 60, speakSeconds: 120 },
        part3: ['How have celebrations in your country changed over time?', 'Do you think traditional festivals are becoming less popular among young people?', 'What is the social importance of celebrations and festivals?']
    },
    {
        id: 'sp_12',
        part1: ['Have you traveled to many different places?', 'Do you prefer traveling alone or with others?', 'What is your favorite way to plan a trip?'],
        part2: { cueCard: 'Describe a place you would like to visit in the future.', points: ['where it is', 'why you want to go there', 'what you would do there', 'and explain why this place interests you'], prepSeconds: 60, speakSeconds: 120 },
        part3: ['How has international travel changed in recent decades?', 'Do you think tourism can have a negative effect on a destination?', 'Is it more valuable to travel to many places briefly or to know one place deeply?']
    }
];
