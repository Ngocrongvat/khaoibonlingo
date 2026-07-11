const ExerciseGenerator = (() => {
    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function shuffleDifferent(arr) {
        if (arr.length < 2) return arr.slice();
        let attempt;
        let guard = 0;
        do {
            attempt = shuffle(arr);
            guard++;
        } while (JSON.stringify(attempt) === JSON.stringify(arr) && guard < 50);
        return attempt;
    }

    function pickRandom(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    // Picks from a pool of items (each with a numeric .difficulty), biased toward items
    // matching targetDifficulty exactly, so raising the target actually shifts content
    // harder instead of just capping how hard it's allowed to get.
    function pickWeightedByDifficulty(pool, targetDifficulty) {
        if (!pool.length) return undefined;
        const weighted = [];
        pool.forEach(item => {
            const distance = Math.abs(targetDifficulty - (item.difficulty || 1));
            const weight = distance === 0 ? 5 : (distance === 1 ? 2 : 1);
            for (let w = 0; w < weight; w++) weighted.push(item);
        });
        return pickRandom(weighted);
    }

    function genId() {
        return `gen_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    }

    function presentVerb(verb, pronounEn) {
        return ['He', 'She', 'It'].includes(pronounEn) ? verb.forms.thirdPerson : verb.forms.base;
    }

    function doAux(pronounEn) {
        return ['He', 'She', 'It'].includes(pronounEn) ? 'does' : 'do';
    }

    function doAuxCap(pronounEn) {
        return ['He', 'She', 'It'].includes(pronounEn) ? 'Does' : 'Do';
    }

    function beVerb(pronounEn) {
        if (pronounEn === 'I') return 'am';
        if (['He', 'She', 'It'].includes(pronounEn)) return 'is';
        return 'are';
    }

    // Words starting with a silent "h" (vowel sound) take "an" - matched by prefix so
    // multi-word nouns work too ("an honor roll", "an hour", not just the bare word).
    const SILENT_H_PREFIXES = ['hour', 'honest', 'honor', 'herb'];
    // Words starting with a vowel LETTER but a consonant SOUND ("yoo"/"w") still take "a".
    const CONSONANT_SOUND_PREFIXES = ['uni', 'use', 'user', 'usu', 'eu', 'one', 'once'];

    function article(word) {
        const w = word.toLowerCase();
        if (SILENT_H_PREFIXES.some(p => w.startsWith(p))) return 'an';
        if (CONSONANT_SOUND_PREFIXES.some(p => w.startsWith(p))) return 'a';
        return /^[aeiou]/.test(w) ? 'an' : 'a';
    }

    // Gerund/mass nouns (swimming, photography, social media...) read awkwardly with
    // "the" in a generic sentence ("learning the swimming") - this drops the article
    // for those, while ordinary countable nouns still get "the X" as usual.
    function nounPhrase(noun) {
        const lower = noun.en.toLowerCase();
        return noun.noArticle ? lower : `the ${lower}`;
    }

    function comparativeForm(adjective) {
        const word = adjective.toLowerCase();
        const vowels = 'aeiou';
        const core = word.endsWith('e') && word.length > 1 ? word.slice(0, -1) : word;
        let syllables = 0;
        let prevVowel = false;
        for (const ch of core) {
            // Treat 'y' as a vowel sound for syllable counting only (not for the
            // separate "-ier" ending check below) - otherwise compounds like
            // "trustworthy" undercount to 2 syllables and wrongly become "trustworthier"
            // instead of "more trustworthy".
            const isVowel = vowels.includes(ch) || ch === 'y';
            if (isVowel && !prevVowel) syllables++;
            prevVowel = isVowel;
        }
        syllables = Math.max(syllables, 1);

        // 3+ syllable words always use "more X" regardless of ending (e.g. "mandatory" ->
        // "more mandatory", never "mandatorier"). Only 2-syllable words ending in a
        // consonant + "y" fall through to the "-ier" rule (happy -> happier).
        if (syllables >= 3 || (syllables === 2 && !word.endsWith('y'))) return `more ${adjective}`;

        if (word.endsWith('y') && word.length > 1 && !vowels.includes(word[word.length - 2])) {
            return `${word.slice(0, -1)}ier`;
        }
        if (word.endsWith('e')) return `${word}r`;
        const last3 = word.slice(-3);
        if (last3.length === 3) {
            const [c1, v, c2] = last3;
            if (!vowels.includes(c1) && vowels.includes(v) && !vowels.includes(c2) && !'wxy'.includes(c2)) {
                return `${word}${c2}er`;
            }
        }
        return `${word}er`;
    }

    // Same syllable-counting rules as comparativeForm() above (kept in sync deliberately -
    // a word that takes "more X" also takes "most X", one that takes "-er" also takes
    // "-est"), just swapping the suffix/prefix pair.
    function superlativeForm(adjective) {
        const word = adjective.toLowerCase();
        const vowels = 'aeiou';
        const core = word.endsWith('e') && word.length > 1 ? word.slice(0, -1) : word;
        let syllables = 0;
        let prevVowel = false;
        for (const ch of core) {
            const isVowel = vowels.includes(ch) || ch === 'y';
            if (isVowel && !prevVowel) syllables++;
            prevVowel = isVowel;
        }
        syllables = Math.max(syllables, 1);

        if (syllables >= 3 || (syllables === 2 && !word.endsWith('y'))) return `most ${adjective}`;

        if (word.endsWith('y') && word.length > 1 && !vowels.includes(word[word.length - 2])) {
            return `${word.slice(0, -1)}iest`;
        }
        if (word.endsWith('e')) return `${word}st`;
        const last3 = word.slice(-3);
        if (last3.length === 3) {
            const [c1, v, c2] = last3;
            if (!vowels.includes(c1) && vowels.includes(v) && !vowels.includes(c2) && !'wxy'.includes(c2)) {
                return `${word}${c2}est`;
            }
        }
        return `${word}est`;
    }

    function beVerbPast(pronounEn) {
        return ['I', 'He', 'She', 'It'].includes(pronounEn) ? 'was' : 'were';
    }

    function presentPerfectAux(pronounEn) {
        return ['He', 'She', 'It'].includes(pronounEn) ? 'has' : 'have';
    }

    const HELPERS = { presentVerb, doAux, doAuxCap, beVerb, article, comparativeForm, superlativeForm, beVerbPast, presentPerfectAux, nounPhrase };

    const FREQUENCY_WORDS = ['always', 'usually', 'often', 'sometimes', 'rarely', 'never'];

    // Topics too abstract to work as the direct object of a verb (e.g. "eat the hour",
    // "carry the storm") - excluded only when a slot specifically needs a concrete object.
    // Originally just 2 topics; expanded after an audit found many more all-abstract
    // topics (emotions, finance, law, time) had been added since without ever being
    // added here, letting sentences like "wash the honesty" or "hold the inflation"
    // through.
    const ABSTRACT_NOUN_TOPICS = [
        'Numbers & Time', 'Weather & Seasons', 'Abstract Concepts', 'More Abstract Ideas',
        'Banking & Finance (More)', 'Banking, Investment & Insurance Terms', 'Money & Finance (Extended)',
        'Insurance & Risk', 'Emotions Expressions', 'Emotions & Feelings (Nouns)',
        'Emotions & Personality (More Nouns)', 'More Emotions Combos', 'More Emotions & Mind',
        'More Emotions & Social', 'Legal & Government', 'More Legal Terms',
        'Numbers (Extended)', 'Time & Calendar (Extended)', 'Time Concepts (More)',
        'Religion & Belief'
    ];

    // Explicit, hand-checked list of which nouns make real semantic sense as the direct
    // object of each verb (e.g. "drive" only the vehicles, not "drive the tree";
    // "study" only school materials, not "study the library" - you study AT a library,
    // not the library itself). Built noun-by-noun rather than by topic, since topics
    // like "School & Education" or "Health & Body" mix places, people, objects and
    // abstract states that don't all work with the same verb.
    //
    // Deliberately left out (unrestricted, falls through to the general concrete-noun
    // pool): like, love, hate, see, find - opinion/perception verbs that genuinely
    // tolerate almost any concrete noun as their object.
    const VERB_OBJECT_NOUNS = {
        have: ['Money', 'Cash', 'Bag', 'Receipt', 'Credit card', 'Head', 'Hand', 'Leg', 'Eye',
               'Pain', 'Rest', 'Medicine', 'Motorbike', 'Car', 'Bicycle', 'Computer', 'Phone',
               'Application', 'Password', 'Email', 'Dog', 'Cat', 'Bird', 'Fish',
               'Homework', 'Exam', 'Textbook', 'Pen', 'Notebook', 'Grade'],
        do: ['Homework', 'Exercise', 'Cooking', 'Painting', 'Singing', 'Dancing', 'Playing games', 'Photography'],
        study: ['Textbook', 'Homework', 'Exam'],
        play: ['Football'],
        read: ['Textbook', 'Email', 'Social media'],
        write: ['Email', 'Notebook'],
        watch: ['Screen', 'Football'],
        open: ['Bag', 'Application', 'Email', 'Textbook', 'Notebook'],
        close: ['Bag', 'Application', 'Email', 'Textbook', 'Notebook'],
        buy: ['Store', 'Bag', 'Motorbike', 'Car', 'Bicycle', 'Ticket', 'Computer', 'Phone',
              'Application', 'Textbook', 'Notebook', 'Pen', 'Medicine'],
        sell: ['Store', 'Bag', 'Motorbike', 'Car', 'Bicycle', 'Ticket', 'Computer', 'Phone',
               'Application', 'Textbook', 'Notebook', 'Pen'],
        give: ['Money', 'Cash', 'Bag', 'Computer', 'Phone', 'Textbook', 'Notebook', 'Pen',
               'Dog', 'Cat', 'Bird', 'Fish', 'Medicine'],
        take: ['Money', 'Cash', 'Bag', 'Medicine', 'Bus', 'Motorbike', 'Car', 'Airplane',
               'Train', 'Bicycle', 'Computer', 'Phone', 'Textbook', 'Notebook', 'Pen', 'Dog', 'Exam'],
        clean: ['Bus', 'Motorbike', 'Car', 'Bicycle', 'Airplane', 'Classroom', 'School', 'Screen'],
        wash: ['Dog', 'Cat', 'Bus', 'Motorbike', 'Car', 'Bicycle'],
        help: ['Doctor', 'Teacher', 'Student'],
        need: ['Money', 'Cash', 'Medicine', 'Rest', 'Bus', 'Motorbike', 'Car', 'Bicycle',
               'Computer', 'Phone', 'Application', 'Textbook', 'Notebook', 'Pen', 'Doctor'],
        want: ['Money', 'Cash', 'Motorbike', 'Car', 'Bicycle', 'Computer', 'Phone', 'Application',
               'Textbook', 'Notebook', 'Pen', 'Dog', 'Cat', 'Bird', 'Fish', 'Rest', 'Medicine'],
        know: ['Password', 'Application', 'Doctor', 'Teacher', 'Student', 'School', 'Grade'],
        believe: ['Doctor', 'Teacher'],
        remember: ['Password', 'Email', 'Ticket', 'Doctor', 'Teacher', 'Student', 'Homework', 'Exam', 'Grade'],
        forget: ['Password', 'Email', 'Ticket', 'Doctor', 'Teacher', 'Student', 'Homework', 'Exam', 'Grade'],
        understand: ['Textbook', 'Application', 'Internet', 'Doctor', 'Teacher', 'Homework', 'Exam'],
        learn: ['Textbook', 'Application', 'Swimming', 'Painting', 'Singing', 'Dancing', 'Photography', 'Cooking'],
        teach: ['Student', 'Swimming', 'Reading', 'Painting', 'Singing', 'Dancing', 'Cooking', 'Photography'],
        ask: ['Doctor', 'Teacher'],
        answer: ['Homework', 'Exam'],
        tell: ['Doctor', 'Teacher', 'Student'],
        lose: ['Money', 'Cash', 'Bag', 'Receipt', 'Credit card', 'Ticket', 'Computer', 'Phone',
               'Password', 'Dog', 'Cat', 'Bird', 'Fish', 'Textbook', 'Notebook', 'Pen', 'Homework'],
        start: ['Motorbike', 'Car', 'Airplane', 'Train', 'Computer', 'Application', 'Download', 'Update'],
        finish: ['Homework', 'Exam', 'Download', 'Update', 'Textbook', 'Cooking'],
        stop: ['Bus', 'Motorbike', 'Car', 'Train', 'Bicycle', 'Download', 'Update', 'Application'],
        try: ['Swimming', 'Cooking', 'Photography', 'Hiking', 'Fishing', 'Dancing', 'Singing', 'Application', 'Medicine'],
        meet: ['Doctor', 'Teacher', 'Student', 'Graduate'],
        visit: ['Hospital', 'School', 'Mountain', 'River', 'Forest', 'Sea', 'Airport', 'Train station', 'Store'],
        drive: ['Bus', 'Motorbike', 'Car', 'Train'],
        change: ['Password', 'Application', 'Battery', 'Screen', 'Money', 'Price'],
        return: ['Textbook', 'Notebook', 'Pen', 'Ticket', 'Bicycle', 'Money', 'Computer', 'Phone'],
        send: ['Email', 'Money'],
        receive: ['Email', 'Money', 'Discount'],
        call: ['Doctor', 'Teacher', 'Student'],
        pay: ['Money', 'Price', 'Cash', 'Ticket'],
        spend: ['Money'],
        save: ['Money', 'Cash'],
        carry: ['Bag', 'Textbook', 'Notebook', 'Pen'],
        hold: ['Bag', 'Phone', 'Dog', 'Cat', 'Bird'],
        break: ['Computer', 'Phone', 'Application', 'Bus', 'Motorbike', 'Car', 'Bicycle', 'Airplane'],
        fix: ['Computer', 'Phone', 'Application', 'Bus', 'Motorbike', 'Car', 'Bicycle', 'Airplane', 'Screen'],
        push: ['Car', 'Motorbike', 'Bicycle'],
        pull: ['Car', 'Motorbike', 'Bicycle'],
        bake: ['Cake', 'Bread', 'Cookie'],
        boil: ['Water', 'Egg', 'Rice', 'Soup'],
        fry: ['Egg', 'Chicken', 'Fish', 'Rice'],
        taste: ['Soup', 'Cake', 'Coffee', 'Wine'],
        serve: ['Dinner', 'Breakfast', 'Coffee', 'Student'],
        fold: ['Shirt', 'Pants', 'Blanket', 'Paper'],
        iron: ['Shirt', 'Pants', 'Dress', 'Uniform'],
        decorate: ['Room', 'House', 'Cake'],
        renovate: ['House', 'Kitchen', 'Bathroom', 'School'],
        stir: ['Soup', 'Coffee', 'Tea'],
        pour: ['Water', 'Milk', 'Juice', 'Tea', 'Coffee'],
        chop: ['Onion', 'Garlic', 'Meat'],
        slice: ['Bread', 'Meat', 'Cake'],
        peel: ['Potato', 'Apple', 'Banana', 'Orange'],
        download: ['Application', 'File', 'Update'],
        upload: ['File', 'Application'],
        install: ['Application'],
        click: ['Link'],
        type: ['Email', 'Message', 'Password'],
        delete: ['Email', 'File', 'Message', 'Account'],
        print: ['Document', 'Ticket'],
        scan: ['Document'],
        invest: ['Money'],
        negotiate: ['Price', 'Contract', 'Deal'],
        sign: ['Contract', 'Document', 'Receipt'],
        budget: ['Money'],
        compose: ['Song'],
        perform: ['Song'],
        record: ['Song', 'Voice'],
        sketch: ['Portrait'],
        throw: ['Ball', 'Football'],
        catch: ['Ball', 'Fish', 'Bus'],
        kick: ['Ball', 'Football'],
        hit: ['Ball'],
        score: ['Goal'],
        win: ['Match', 'Championship', 'Medal', 'Trophy'],
        translate: ['Document', 'Article', 'Speech'],
        announce: ['News'],
        publish: ['Article', 'Textbook'],
        broadcast: ['News', 'Signal'],
        borrow: ['Money', 'Bicycle', 'Car', 'Pen', 'Textbook'],
        lend: ['Money', 'Bicycle', 'Car', 'Pen'],
        rent: ['Car', 'Apartment', 'House', 'Bicycle'],
        transfer: ['Money', 'File'],
        calculate: ['Price', 'Distance'],
        measure: ['Distance', 'Height', 'Weight', 'Temperature'],
        weigh: ['Bag', 'Fish', 'Apple'],
        count: ['Money', 'Ticket'],
        organize: ['Party', 'File'],
        label: ['Box', 'Bag', 'File'],
        wrap: ['Gift', 'Box'],
        deliver: ['Pizza', 'Gift'],
        ship: ['Product'],
        graduate: ['School', 'University'],
        enroll: ['School', 'University', 'Course'],
        register: ['Course', 'School'],
        admit: ['Student'],
        approve: ['Contract', 'Document'],
        deny: ['Visa'],
        request: ['Refund', 'Discount'],
        donate: ['Money', 'Blood', 'Medicine'],
        contribute: ['Money', 'Idea'],
        fund: ['Project', 'School'],
        finance: ['Project', 'Car', 'House'],
        increase: ['Price', 'Salary', 'Budget'],
        decrease: ['Price', 'Salary', 'Budget'],
        raise: ['Price', 'Salary', 'Money', 'Hand'],
        lower: ['Price', 'Volume'],
        adjust: ['Price', 'Volume', 'Schedule', 'Temperature'],
        modify: ['Contract', 'Plan', 'Document'],
        upgrade: ['Computer', 'Phone', 'Application', 'Ticket'],
        refund: ['Money', 'Ticket'],
        reimburse: ['Money'],
        charge: ['Battery', 'Phone', 'Money'],
        bill: ['Client'],
        deduct: ['Money'],
        subtract: ['Number', 'Money'],
        add: ['Number', 'Money', 'Ingredient'],
        multiply: ['Number'],
        divide: ['Number', 'Money'],
        plant: ['Tree', 'Flower', 'Seed', 'Corn'],
        water: ['Tree', 'Flower'],
        harvest: ['Crop', 'Rice', 'Corn'],
        feed: ['Dog', 'Cat', 'Bird', 'Fish', 'Baby'],
        pet: ['Dog', 'Cat'],
        adopt: ['Dog', 'Cat', 'Baby', 'Child'],
        rescue: ['Dog', 'Cat', 'Bird'],
        sponsor: ['Student', 'Athlete'],
        supervise: ['Student'],
        manage: ['Store', 'Restaurant', 'Project'],
        promote: ['Product'],
        attend: ['School', 'Meeting', 'Wedding', 'Class', 'Concert'],
        host: ['Party', 'Guest'],
        invite: ['Guest', 'Student', 'Friend'],
        greet: ['Guest', 'Doctor', 'Teacher'],
        introduce: ['Guest', 'Student', 'Teacher'],
        thank: ['Doctor', 'Teacher', 'Student'],
        forgive: ['Student', 'Friend'],
        warn: ['Student', 'Doctor', 'Teacher'],
        notify: ['Student', 'Teacher', 'Client'],
        inform: ['Student', 'Teacher', 'Client'],
        confirm: ['Ticket', 'Reservation', 'Appointment'],
        cancel: ['Ticket', 'Reservation', 'Appointment', 'Meeting'],
        reserve: ['Ticket', 'Table', 'Room'],
        book: ['Ticket', 'Hotel', 'Room'],
        explore: ['Forest', 'Mountain', 'Cave'],
        investigate: ['Case', 'Crime'],
        examine: ['Document', 'Textbook'],
        inspect: ['Car', 'Bicycle', 'Document'],
        solve: ['Problem', 'Puzzle'],
        guess: ['Password', 'Number'],
        edit: ['Document', 'Article'],
        photograph: ['Dog', 'Cat', 'Mountain', 'Bird'],
        rehearse: ['Song', 'Speech'],
        assemble: ['Computer', 'Bicycle'],
        repair: ['Computer', 'Phone', 'Car', 'Bicycle'],
        polish: ['Shoes', 'Car'],
        unlock: ['Phone', 'Car', 'Bicycle'],
        lock: ['Door', 'Car', 'Bicycle'],
        pack: ['Bag', 'Suitcase'],
        unpack: ['Bag', 'Suitcase'],
        recommend: ['Restaurant', 'Textbook', 'Doctor'],
        describe: ['Dog', 'Cat', 'Mountain', 'Painting'],
        compare: ['Price', 'Product'],
        select: ['Student', 'Product', 'Application'],
        prepare: ['Dinner', 'Breakfast', 'Exam', 'Presentation'],
        avoid: ['Traffic', 'Exam'],
        protect: ['Student', 'Dog', 'Family'],
        collect: ['Money', 'Ticket'],
        eat: ['Rice', 'Bread', 'Noodles', 'Soup', 'Egg', 'Meat', 'Chicken', 'Fish', 'Apple', 'Banana', 'Cake', 'Candy', 'Cookie', 'Ice cream'],
        drink: ['Water', 'Tea', 'Coffee', 'Juice', 'Milk', 'Soda', 'Wine', 'Beer'],
        cook: ['Rice', 'Soup', 'Meat', 'Chicken', 'Egg', 'Noodles', 'Dinner', 'Breakfast'],
        wear: ['Shirt', 'Pants', 'Dress', 'Jacket', 'Shoes', 'Hat', 'Glasses', 'Ring', 'Watch', 'Uniform'],

        // Specialized/technical verbs added in a later audit pass - these commonly
        // produced nonsensical combinations when left to the general concrete-noun
        // pool (e.g. "estimate the stethoscope", "authorize the underwear") since they
        // need a specific semantic category of object, not just any concrete noun.
        estimate: ['Budget', 'Price', 'Distance', 'Weight', 'Risk assessment'],
        define: ['Vocabulary', 'Concept'],
        bewilder: ['Student', 'Customer', 'Audience', 'Child', 'Tourist'],
        conceive: ['Idea', 'Plan', 'Child'],
        condemn: ['Crime', 'Decision'],
        satisfy: ['Customer'],
        ensure: ['Safety'],
        emulate: ['Role model', 'Mentor'],
        extend: ['Deadline', 'Contract'],
        eclipse: ['Achievement'],
        concede: ['Point'],
        ascend: ['Mountain', 'Stairs'],
        comprise: ['Team'],
        confess: ['Crime'],
        appraise: ['Property', 'House', 'Painting', 'Jewelry'],
        omit: ['Fact'],
        govern: ['Nation'],
        deploy: ['Soldier', 'Software', 'Team'],
        confiscate: ['Weapon', 'Property', 'Phone'],
        prevent: ['Accident', 'Crime', 'Conflict'],
        inscribe: ['Ring'],
        classify: ['Document', 'Data', 'Species'],
        leverage: ['Skill', 'Network'],
        allocate: ['Budget', 'Fund', 'Task'],
        neglect: ['Duty', 'Child'],
        hypnotize: ['Audience', 'Volunteer'],
        demand: ['Payment', 'Explanation', 'Refund'],
        compensate: ['Employee', 'Customer'],
        initiate: ['Project'],
        scold: ['Child', 'Student', 'Dog'],
        enchant: ['Audience', 'Guest', 'Child'],
        intrigue: ['Audience', 'Journalist'],
        honor: ['Agreement', 'Tradition'],
        witness: ['Accident', 'Crime', 'Wedding'],
        exploit: ['Opportunity', 'Factory worker'],
        embezzle: ['Money', 'Fund', 'Budget'],
        appoint: ['Manager', 'Judge'],
        infer: ['Belief'],
        irrigate: ['Field', 'Crop', 'Farm'],
        demolish: ['House', 'Wall'],
        amend: ['Law', 'Contract', 'Rule'],
        constitute: ['Team'],
        abandon: ['Plan', 'Project', 'House', 'Idea'],
        assess: ['Risk', 'Danger'],
        fatigue: ['Athlete', 'Muscle'],
        designate: ['Area', 'Time zone'],
        forbid: ['Rule of law'],
        evade: ['Tax'],
        attain: ['Goal', 'Level'],
        inhabit: ['Island', 'Forest', 'Cave'],
        deprive: ['Child'],
        audit: ['Company', 'Budget'],
        authorize: ['Payment', 'Plan'],
        diversify: ['Business', 'Economy'],
        gratify: ['Customer', 'Fan'],
        fathom: ['Reason', 'Belief'],
        abolish: ['Law', 'Tax', 'Rule'],
        indoctrinate: ['Student', 'Soldier'],
        elude: ['Danger'],
        enact: ['Law'],
        litigate: ['Case'],
        liquidate: ['Company', 'Debt'],
        legislate: ['Law'],
        incriminate: ['Suspect', 'Witness'],
        inflict: ['Pain', 'Danger'],
        empower: ['Employee', 'Student', 'Community'],
        embody: ['Belief', 'Value'],
        incite: ['Conflict'],
        invalidate: ['Contract', 'Claim'],
        invoke: ['Rule of law', 'Right'],
        jeopardize: ['Safety'],
        exert: ['Pressure'],
        extort: ['Money'],
        exempt: ['Employee', 'Student'],
        facilitate: ['Meeting', 'Deal'],
        falsify: ['Document', 'Data'],
        incorporate: ['Idea', 'Belief'],
        intercept: ['Signal'],

        // Third audit pass - more specialized verbs found producing nonsensical
        // combinations against the general concrete-noun fallback (e.g. "fasten the
        // terrain", "convict the leek").
        fasten: ['Shirt', 'Seatbelt', 'Button', 'Zipper'],
        upset: ['Customer', 'Parent', 'Student'],
        challenge: ['Championship', 'Rule', 'Decision'],
        'fine-tune': ['Instrument', 'Scale'],
        tolerate: ['Pain'],
        maintain: ['Weight', 'Balance', 'Contract'],
        employ: ['Factory worker', 'Employee'],
        exile: ['Defendant'],
        instigate: ['Conflict'],
        handle: ['Task'],
        attribute: ['Success', 'Achievement'],
        enumerate: ['Fact', 'Reason'],
        restore: ['Order'],
        link: ['Account', 'Website'],
        characterize: ['Era', 'Character'],
        knot: ['Ribbon'],
        please: ['Customer', 'Audience'],
        embarrass: ['Child', 'Student'],
        injure: ['Leg'],
        puzzle: ['Scientist', 'Detective'],
        enforce: ['Law', 'Rule'],
        confuse: ['Student', 'Customer'],
        tease: ['Classmate', 'Child'],
        startle: ['Cat', 'Child'],
        haunt: ['House'],
        follow: ['Rule', 'Trend'],
        convey: ['Message'],
        license: ['Driver', 'Business'],
        deal: ['Card'],
        descend: ['Stairs', 'Mountain'],
        respect: ['Decision'],
        deport: ['Defendant'],
        prohibit: ['Weapon'],
        involve: ['Risk', 'Employee'],
        realize: ['Dream'],
        accelerate: ['Car'],
        invert: ['Order'],
        interrogate: ['Suspect', 'Witness'],
        maximize: ['Profit'],
        express: ['Opinion'],
        hang: ['Coat'],
        bind: ['Contract'],
        enlighten: ['Student', 'Audience'],
        displace: ['Population'],
        deduce: ['Answer key'],
        fumigate: ['House', 'Room'],
        envision: ['Plan'],
        infuse: ['Tea', 'Flavor'],
        formulate: ['Plan'],
        calibrate: ['Instrument', 'Scale'],
        bribe: ['Judge'],
        evaluate: ['Performance review', 'Student'],
        commercialize: ['Product', 'Invention'],
        exceed: ['Speed limit'],
        combat: ['Crime'],
        convict: ['Defendant', 'Suspect'],
        reduce: ['Weight'],
        betray: ['Friend'],
        dictate: ['Letter'],
        depict: ['Scene'],
        discourage: ['Student', 'Employee'],
        dishearten: ['Employee'],
        erect: ['Statue'],
        instill: ['Value', 'Confidence'],
        spare: ['Money'],
        delegate: ['Task'],
        administer: ['Medicine'],
        recognize: ['Achievement'],
        simplify: ['Task'],
        immunize: ['Child'],
        obtain: ['License', 'Permit'],
        elect: ['President'],
        bring: ['Umbrella', 'Gift'],

        // Fourth audit pass.
        mind: ['Task', 'Business'],
        support: ['Family', 'Team'],
        commend: ['Employee', 'Student'],
        terrify: ['Child', 'Audience'],
        conclude: ['Meeting', 'Speech'],
        articulate: ['Idea', 'Opinion'],
        cease: ['Meeting'],
        narrate: ['History'],
        overcome: ['Fear'],
        glimpse: ['Scene'],
        regard: ['Achievement'],
        plug: ['Cable'],
        intimidate: ['Witness', 'Student'],
        distribute: ['Pet food'],
        refresh: ['Memory'],
        hinder: ['Progress'],
        erode: ['Trust'],
        pursue: ['Goal', 'Dream'],
        entrust: ['Task'],
        encounter: ['Problem'],
        reach: ['Goal', 'Agreement'],
        fuel: ['Car', 'Economy'],
        dismiss: ['Employee', 'Claim'],
        disappoint: ['Fan', 'Parent'],
        miss: ['Opportunity'],
        assure: ['Customer', 'Client'],
        insult: ['Guest'],
        impede: ['Progress'],
        foster: ['Child'],
        mourn: ['Friend'],
        bombard: ['City'],
        fortify: ['Wall', 'City'],
        certify: ['Product', 'Document'],
        oppose: ['Plan', 'Law'],
        wipe: ['Screen', 'Table'],
        amaze: ['Audience'],
        clutch: ['Bag'],
        constrain: ['Budget'],
        bundle: ['Product'],
        harass: ['Employee', 'Colleague'],
        inherit: ['Money', 'Property'],
        commemorate: ['Anniversary'],
        astonish: ['Audience'],
        shoot: ['horror film'],
        infiltrate: ['Alarm system'],
        isolate: ['Variable'],
        lay: ['Egg'],
        distract: ['Student', 'Driver'],
        persuade: ['Customer'],
        steer: ['Car'],
        ignore: ['Warning', 'Advice'],
        nourish: ['Houseplant'],

        // Fifth audit pass.
        evoke: ['Memory'],
        justify: ['Decision'],
        plead: ['Case'],
        caution: ['Driver', 'Student'],
        evacuate: ['City'],
        bet: ['Money'],
        cherish: ['Memory'],
        disrupt: ['Meeting', 'Class'],
        caption: ['Photographer'],
        engulf: ['Pillar building'],
        implicate: ['Suspect'],
        champion: ['Right'],
        verify: ['Account', 'Identity'],
        burden: ['Employee', 'Student'],
        establish: ['Business', 'Rule'],
        bite: ['Apple'],
        fascinate: ['Child', 'Audience'],
        consult: ['Doctor', 'Lawyer'],
        demonstrate: ['Skill', 'Product'],
        colonize: ['Planet'],
        brand: ['Product'],
        bolster: ['Confidence', 'Economy'],
        humiliate: ['Student', 'Employee'],
        amuse: ['Child', 'Audience'],
        withdraw: ['Money'],
        resume: ['Job description'],
        sort: ['Data'],
        dissolve: ['Sugar', 'Salt'],
        question: ['Suspect', 'Witness'],
        analyze: ['Data'],
        applaud: ['Performance review'],
        brighten: ['Room'],
        occupy: ['Pillar building'],
        produce: ['Crop'],
        load: ['Truck'],
        offer: ['Discount', 'Job description'],
        imprison: ['Defendant'],
        enhance: ['Performance review'],
        consolidate: ['Debt'],
        commission: ['Report'],
        dismantle: ['Washing machine'],
        waste: ['Money'],
        assert: ['Right'],
        resemble: ['Parent'],
        surprise: ['Guest'],
        expel: ['Student'],
        blast: ['Speaker'],
        afford: ['Car', 'House'],
        liberate: ['Defendant'],
        brief: ['Employee'],
        endure: ['Pain'],
        foresee: ['Problem'],
        cheat: ['Exam'],
        seek: ['Advice'],
        undergo: ['Surgery'],
        divert: ['Traffic'],
        dominate: ['Market'],

        // Sixth audit pass.
        captivate: ['Audience'],
        nominate: ['Employee'],
        detain: ['Suspect', 'Defendant'],
        immobilize: ['Leg'],
        congratulate: ['Student'],
        signal: ['Driver'],
        delight: ['Customer', 'Audience'],
        elevate: ['Mood swing'],
        coax: ['Child', 'Cat'],
        arrange: ['Meeting', 'Patio furniture'],
        alert: ['Driver'],
        breed: ['Dog', 'Cattle'],
        capture: ['Suspect'],
        destroy: ['Pillar building'],
        influence: ['Decision', 'Opinion'],
        denounce: ['Decision'],
        list: ['Ingredient'],
        contest: ['Decision'],
        construct: ['Pillar building'],
        reassure: ['Customer'],
        anticipate: ['Problem'],
        contemplate: ['Decision'],
        endanger: ['Wildlife'],
        entertain: ['Guest', 'Audience'],
        base: ['Decision'],
        guarantee: ['Quality control'],
        endorse: ['Product'],
        compile: ['Report', 'Data'],
        bless: ['Child'],
        entice: ['Customer'],
        'double-check': ['Answer key'],
        alter: ['Document'],
        locate: ['Suspect'],
        target: ['Customer', 'Market'],
        accomplish: ['Goal', 'Task'],
        finalize: ['Plan', 'Deal'],
        punish: ['Student', 'Defendant'],
        insulate: ['House'],
        offend: ['Guest'],
        convince: ['Customer'],
        advertise: ['Product'],
        favor: ['Plan'],
        assign: ['Task', 'Homework'],
        instruct: ['Student', 'Employee'],
        represent: ['Client'],
        franchise: ['Business'],
        blame: ['Employee'],

        // Seventh audit pass.
        interview: ['Employee', 'Witness'],
        postpone: ['Meeting'],
        rob: ['Bank account'],
        lease: ['Car'],
        tackle: ['Problem'],
        dust: ['Patio furniture'],
        annoy: ['Classmate'],
        state: ['Opinion'],
        seal: ['Deal'],
        coach: ['Team'],
        limit: ['Speed limit'],
        possess: ['Skill'],
        judge: ['Performance review'],
        urge: ['Student'],
        engrave: ['Ring'],
        rank: ['Student'],
        replace: ['Battery'],
        join: ['Team'],
        launch: ['Product'],
        film: ['Scene'],
        torture: ['Defendant'],
        guide: ['Tourist'],
        accompany: ['Child'],
        inject: ['Vaccine'],
        ingest: ['Medicine'],
        survive: ['Accident'],
        stimulate: ['Economy'],
        owe: ['Money'],
        flee: ['Country of origin'],
        swap: ['Stadium seat'],
        immerse: ['Student'],
        permit: ['Student'],

        // Eighth audit pass.
        accuse: ['Suspect', 'Defendant'],
        excuse: ['Student'],
        document: ['Report'],
        command: ['Team'],
        comfort: ['Child'],
        hire: ['Employee'],
        conceal: ['Weapon'],
        mark: ['Exam'],
        defeat: ['Team'],
        trap: ['Mouse'],
        differentiate: ['Product'],
        name: ['Child'],
        pick: ['Team'],
        interrupt: ['Meeting'],
        illuminate: ['Room'],
        minimize: ['Risk'],
        tempt: ['Child'],
        attack: ['Team'],
        internalize: ['Value'],
        convert: ['Currency'],
        grab: ['Bag'],
        spell: ['Vocabulary'],
        bid: ['Deal'],
        extradite: ['Suspect'],
        mold: ['Clay'],
        energize: ['Team'],
        press: ['Button'],
        order: ['Dinner'],
        animate: ['Scene'],
        soothe: ['Pain'],
        clarify: ['Rule'],

        // Ninth audit pass.
        extract: ['Data'],
        emphasize: ['Rule'],
        motivate: ['Employee', 'Student'],
        harm: ['Wildlife'],
        excite: ['Guest'],
        charm: ['Customer', 'Audience'],
        halt: ['Meeting'],
        land: ['Job description'],
        draw: ['Blueprint plan'],
        insure: ['Car', 'House'],
        impress: ['Judge'],
        sustain: ['Economy'],
        zip: ['Bag'],
        inaugurate: ['President'],
        restrict: ['Speed limit'],
        sow: ['Crop'],
        deceive: ['Customer'],
        navigate: ['Car'],
        discuss: ['Plan'],
        ban: ['Weapon'],
        dose: ['Medicine'],
        assume: ['Risk'],
        predict: ['Weather station'],
        contain: ['Virus'],
        identify: ['Suspect', 'Problem'],
        notice: ['Problem'],
        reward: ['Employee', 'Student'],
        own: ['House', 'Car'],
        adore: ['Child'],
        overtake: ['Car'],
        overlook: ['Problem'],
        discover: ['Planet'],
        disable: ['Alarm system'],
        inspire: ['Student', 'Team'],

        // Tenth audit pass.
        absorb: ['Data'],
        observe: ['Wildlife'],
        activate: ['Alarm system'],
        forge: ['Document'],
        correct: ['Data'],
        defend: ['Client'],
        reject: ['Plan'],
        suspect: ['Employee'],
        groom: ['Dog'],
        damage: ['Property'],
        pass: ['Exam'],
        prefer: ['Product'],
        guard: ['Border'],
        fetch: ['Water'],
        tickle: ['Child'],
        chase: ['Dog'],
        claim: ['Discount'],
        enthrall: ['Audience'],
        legitimize: ['Business'],
        interest: ['Student'],
        shape: ['Clay'],
        strike: ['Match'],
        bully: ['Classmate'],
        trace: ['Ancestor'],
        confront: ['Employee'],
        exhaust: ['Athlete'],
        hoard: ['Medicine'],
        glorify: ['Achievement'],
        enrage: ['Customer'],
        clone: ['Cattle'],
        annul: ['Contract'],

        // Eleventh audit pass.
        clear: ['Debt'],
        exclude: ['Employee'],
        cheer: ['Team'],
        acknowledge: ['Achievement'],
        tour: ['Museum'],
        note: ['Meeting'],
        decide: ['Case'],
        treat: ['Employee'],
        allow: ['Student'],
        propose: ['Plan'],
        undermine: ['Confidence'],
        dig: ['Garden'],
        cast: ['Ballot'],
        design: ['Product'],
        attract: ['Customer', 'Tourist'],
        promise: ['Discount'],
        complete: ['Task'],
        view: ['Document'],
        include: ['Employee'],
        dispatch: ['Team'],
        spot: ['Suspect'],
        wake: ['Child']
    };

    // Curated {adjective, verb} pairs for "because" sentences that actually make causal
    // sense (e.g. "nervous because I have the exam", not a random adjective glued to a
    // random reason). The noun still comes from VERB_OBJECT_NOUNS for the chosen verb,
    // so variety is preserved while every combination stays coherent.
    // Each entry also pins its own noun subset (tighter than the verb's full
    // VERB_OBJECT_NOUNS list) so the specific reason stays plausible - e.g. "lonely"
    // only with losing a pet, not any of "lose"'s valid objects like a password.
    const CAUSAL_REASONS = [
        { adjective: 'tired', verb: 'do', nouns: ['Homework', 'Exercise'] },
        { adjective: 'nervous', verb: 'have', nouns: ['Exam'] },
        { adjective: 'happy', verb: 'see', nouns: ['Dog', 'Cat', 'Bird'] },
        { adjective: 'sad', verb: 'lose', nouns: ['Dog', 'Cat'] },
        { adjective: 'worried', verb: 'forget', nouns: ['Password', 'Homework', 'Exam'] },
        { adjective: 'excited', verb: 'visit', nouns: ['Mountain', 'Sea', 'Forest', 'Airport'] },
        { adjective: 'angry', verb: 'lose', nouns: ['Phone', 'Money', 'Ticket'] },
        { adjective: 'grateful', verb: 'receive', nouns: ['Money', 'Discount'] },
        { adjective: 'busy', verb: 'have', nouns: ['Homework', 'Exam'] },
        { adjective: 'scared', verb: 'see', nouns: ['Dog'] },
        { adjective: 'lonely', verb: 'lose', nouns: ['Dog', 'Cat'] },
        { adjective: 'surprised', verb: 'receive', nouns: ['Discount', 'Email', 'Money'] },
        { adjective: 'patient', verb: 'teach', nouns: ['Student'] },
        { adjective: 'friendly', verb: 'help', nouns: ['Student', 'Doctor'] },
        { adjective: 'calm', verb: 'do', nouns: ['Exercise'] },
        { adjective: 'proud', verb: 'finish', nouns: ['Homework', 'Exam'] },
        { adjective: 'careful', verb: 'drive', nouns: ['Car', 'Motorbike', 'Bus'] },
        { adjective: 'careless', verb: 'break', nouns: ['Phone', 'Computer'] },
        { adjective: 'brave', verb: 'visit', nouns: ['Hospital', 'Mountain'] },
        { adjective: 'generous', verb: 'give', nouns: ['Money', 'Cash'] },
        { adjective: 'polite', verb: 'ask', nouns: ['Doctor', 'Teacher'] },
        { adjective: 'hardworking', verb: 'study', nouns: ['Textbook', 'Homework', 'Exam'] },
        { adjective: 'clever', verb: 'understand', nouns: ['Textbook', 'Homework', 'Exam'] },
        { adjective: 'smart', verb: 'fix', nouns: ['Computer', 'Phone'] },
        { adjective: 'rich', verb: 'buy', nouns: ['Car', 'Motorbike', 'Computer', 'Phone'] },
        { adjective: 'poor', verb: 'lose', nouns: ['Money', 'Cash'] },
        { adjective: 'healthy', verb: 'do', nouns: ['Exercise'] }
    ];

    function pickVocab(category, maxDifficulty, weakSet, requireConcreteObject, excludeStative) {
        let pool;
        if (category === 'frequency') {
            pool = VOCAB_BANK.adverbs.filter(a => FREQUENCY_WORDS.includes(a.en));
        } else {
            pool = (VOCAB_BANK[category] || []).filter(v => (v.difficulty || 1) <= maxDifficulty);
            if (!pool.length) pool = VOCAB_BANK[category] || [];
        }
        if (requireConcreteObject) {
            if (category === 'verbs') {
                const transitiveOnly = pool.filter(v => v.takesObject !== false);
                if (transitiveOnly.length) pool = transitiveOnly;
            } else if (category === 'nouns') {
                // Gerund/activity nouns (swimming, hiking...) only make sense as an object
                // for the specific verbs already covered by VERB_OBJECT_NOUNS (do/try/learn/
                // teach/play/watch); as a bare object of any other verb ("see hiking") they
                // read wrong, so the unrestricted fallback pool excludes them too.
                const concreteOnly = pool.filter(v => !ABSTRACT_NOUN_TOPICS.includes(v.topic) && !v.noArticle);
                if (concreteOnly.length) pool = concreteOnly;
            }
        }
        if (excludeStative && category === 'verbs') {
            const nonStative = pool.filter(v => !v.stative);
            if (nonStative.length) pool = nonStative;
        }
        if (weakSet && weakSet.size) {
            const weakPool = pool.filter(v => weakSet.has(v.en));
            if (weakPool.length && Math.random() < 0.5) return pickRandom(weakPool);
        }
        return pickWeightedByDifficulty(pool, maxDifficulty);
    }

    function slotToCategory(slotName) {
        if (slotName === 'noun' || slotName === 'noun2') return 'nouns';
        if (slotName === 'verb') return 'verbs';
        if (slotName === 'adjective') return 'adjectives';
        if (slotName === 'pronoun') return 'pronouns';
        if (slotName === 'frequency') return 'frequency';
        return 'nouns';
    }

    function generateSentenceInstance(difficulty, weakSet) {
        const candidates = GRAMMAR_PATTERNS.filter(p => p.difficulty <= difficulty);
        const template = pickWeightedByDifficulty(candidates.length ? candidates : GRAMMAR_PATTERNS, difficulty);
        const fillers = {};
        const usedNouns = new Set();
        const requireConcreteObject = !!template.requiresConcreteObject;
        const excludeStative = !!template.excludeStative;

        // "Because" sentences pick a curated {adjective, verb, nouns} triple so the
        // reason is causally coherent (e.g. "nervous because I have the exam"), instead
        // of gluing together three independently random slots. The noun is still
        // randomized within that triple's own list, so it varies across generations.
        if (template.id === 'because_reason') {
            const reason = pickRandom(CAUSAL_REASONS);
            const reasonVerb = VOCAB_BANK.verbs.find(v => v.en === reason.verb);
            // Only commit adjective+verb+noun together as the matched triple the reason
            // actually describes - if the verb can't be found (e.g. a restricted/custom
            // vocab pool without it), leave ALL THREE unset rather than fixing the noun
            // to this reason's list while the verb slot falls through to a random pick
            // below, which would pair the reason's noun with an unrelated verb.
            if (reasonVerb) {
                fillers.adjective = VOCAB_BANK.adjectives.find(a => a.en === reason.adjective);
                fillers.verb = reasonVerb;
                const reasonNounPool = (VOCAB_BANK.nouns || []).filter(v => reason.nouns.includes(v.en));
                if (reasonNounPool.length) fillers.noun = pickRandom(reasonNounPool);
            }
        }

        template.slots.forEach(slotName => {
            if (fillers[slotName]) return;
            const category = slotToCategory(slotName);
            let entry;

            // Personality/emotion adjectives (all of CAUSAL_REASONS) don't read naturally
            // with "It" ("It is brave" / "It is proud") - restrict to person pronouns.
            if (slotName === 'pronoun' && template.id === 'because_reason') {
                const personPool = VOCAB_BANK.pronouns.filter(p => p.en !== 'It');
                if (personPool.length) entry = pickRandom(personPool);
            }

            // For comparisons ("X is more ... than Y"), prefer pairing nouns from the
            // same topic so the two sides are actually comparable (e.g. two animals,
            // not a dog vs. an airport).
            if (!entry && slotName === 'noun2' && fillers.noun) {
                const sameTopicPool = (VOCAB_BANK.nouns || []).filter(v =>
                    v.topic === fillers.noun.topic && v.en !== fillers.noun.en
                );
                if (sameTopicPool.length) entry = pickWeightedByDifficulty(sameTopicPool, difficulty);
            }

            // For "verb + the noun" object slots, restrict the noun to the explicit list
            // that makes semantic sense with the verb already chosen (e.g. "drive" -> only
            // vehicles, not "drive the tree"), instead of any concrete noun regardless of
            // meaning. Not difficulty-filtered: every noun in the bank is difficulty 2, so
            // gating on difficulty here would make this pool empty whenever an easier
            // sentence (difficulty 1) is requested. Verbs without an entry here (the
            // broad opinion verbs like/love/hate/see/find) fall through to the general pool.
            if (!entry && slotName === 'noun' && requireConcreteObject && fillers.verb) {
                const explicitNouns = VERB_OBJECT_NOUNS[fillers.verb.en.toLowerCase()];
                if (explicitNouns && explicitNouns.length) {
                    const explicitPool = (VOCAB_BANK.nouns || []).filter(v => explicitNouns.includes(v.en));
                    if (explicitPool.length) entry = pickWeightedByDifficulty(explicitPool, difficulty);
                }
            }

            if (!entry) {
                let attempts = 0;
                do {
                    entry = pickVocab(category, difficulty, weakSet, requireConcreteObject, excludeStative);
                    attempts++;
                } while (slotName === 'noun2' && usedNouns.has(entry.en) && attempts < 10);
            }

            if (slotName.startsWith('noun')) usedNouns.add(entry.en);
            fillers[slotName] = entry;
        });

        const { en, vi } = template.build(fillers, HELPERS);
        const wordsUsed = Object.values(fillers).map(f => f.en);
        return { en, vi, grammarPoint: template.grammarPoint, difficulty: template.difficulty, wordsUsed, templateId: template.id };
    }

    function identifyCategory(wordLower) {
        const categories = ['nouns', 'adjectives', 'verbs', 'adverbs', 'pronouns'];
        for (const cat of categories) {
            if (VOCAB_BANK[cat].some(v => v.en.toLowerCase() === wordLower)) return cat;
        }
        return null;
    }

    function buildTranslate(instance) {
        const words = instance.en.split(' ');
        const distractorPool = VOCAB_BANK.nouns.map(n => n.en.toLowerCase())
            .concat(VOCAB_BANK.verbs.map(v => v.forms.base));
        const distractors = shuffle(distractorPool.filter(w => !words.includes(w))).slice(0, 2);
        return {
            id: genId(), type: 'translate', source: instance.vi, target: instance.en,
            options: shuffleDifferent([...words, ...distractors]), correct: words,
            meta: { grammarPoint: instance.grammarPoint, difficulty: instance.difficulty }
        };
    }

    function buildOrdering(instance) {
        const words = instance.en.split(' ');
        // source (the Vietnamese meaning) is what renderLesson() shows as the prompt -
        // without it the prompt falls back to `sentence`, i.e. the English ANSWER
        // itself, letting users re-assemble by sight with zero learning value (same
        // answer-leak fixed across the curriculum data in data.js).
        return {
            id: genId(), type: 'ordering', sentence: instance.en, source: instance.vi,
            shuffled: shuffleDifferent(words), correct: words,
            meta: { grammarPoint: instance.grammarPoint, difficulty: instance.difficulty }
        };
    }

    function buildPronunciation(instance) {
        return {
            id: genId(), type: 'pronunciation', question: 'Hãy đọc to câu này thật chuẩn:', target: instance.en,
            meta: { grammarPoint: instance.grammarPoint, difficulty: instance.difficulty }
        };
    }

    function buildDictation(instance) {
        return {
            id: genId(), type: 'dictation', question: 'Nghe và gõ lại chính xác câu bạn nghe được:', target: instance.en,
            meta: { grammarPoint: instance.grammarPoint, difficulty: instance.difficulty }
        };
    }

    function buildListening(instance, weakSet) {
        const variants = new Set([instance.en]);
        let guard = 0;
        while (variants.size < 4 && guard < 30) {
            guard++;
            const alt = generateSentenceInstance(instance.difficulty, weakSet);
            variants.add(alt.en);
        }
        const options = shuffle(Array.from(variants));
        return {
            id: genId(), type: 'listening', question: 'Nghe và chọn câu đúng',
            options, correct: options.indexOf(instance.en),
            meta: { grammarPoint: instance.grammarPoint, difficulty: instance.difficulty }
        };
    }

    function buildFillBlank(instance) {
        // Use the actual filler values (instance.wordsUsed) rather than re-splitting the
        // sentence by spaces, so multi-word nouns ("ice cream", "credit card") get blanked
        // out as one atomic phrase instead of a single word inside them going missing
        // ("There is an ___ foil" instead of "There is an ___" for "aluminum foil").
        const candidates = (instance.wordsUsed || []).filter(w => {
            const cat = identifyCategory(w.toLowerCase());
            return cat === 'nouns' || cat === 'adjectives';
        });
        if (!candidates.length) return null;
        const chosenPhrase = pickRandom(candidates);
        const chosenLower = chosenPhrase.toLowerCase();
        const cat = identifyCategory(chosenLower);

        const escaped = chosenLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, 'i');
        if (!regex.test(instance.en)) return null;
        const blankedSentence = instance.en.replace(regex, '___');

        const rawPool = difficultyCappedPool(VOCAB_BANK[cat], instance.difficulty, 3).map(v => v.en.toLowerCase()).filter(w => w !== chosenLower);
        const distractors = shuffle(rawPool).slice(0, 3);
        const options = shuffle([chosenLower, ...distractors]);

        return {
            id: genId(), type: 'fill_blank',
            question: 'Điền từ còn thiếu vào chỗ trống:',
            sentence: blankedSentence,
            options, correct: options.indexOf(chosenLower),
            meta: { grammarPoint: instance.grammarPoint, difficulty: instance.difficulty, answer: chosenLower }
        };
    }

    // De-duplicates a distractor pool by case-insensitive display text, and excludes
    // anything matching the answer, so multiple-choice options never show the same
    // text twice (can happen when two different vocab entries share a translation).
    function dedupeDistractorPool(texts, answerText) {
        const seen = new Set([answerText.toLowerCase().trim()]);
        const pool = [];
        texts.forEach(t => {
            const key = t.toLowerCase().trim();
            if (seen.has(key)) return;
            seen.add(key);
            pool.push(t);
        });
        return pool;
    }

    function buildSynonym(difficulty) {
        const pair = pickRandom(VOCAB_BANK.synonyms);
        const combinedPool = VOCAB_BANK.adjectives.concat(VOCAB_BANK.verbs)
            .filter(v => v.en.toLowerCase() !== pair.word.toLowerCase());
        const cappedPool = difficultyCappedPool(combinedPool, difficulty, 3).map(v => v.en);
        const distractorPool = dedupeDistractorPool(cappedPool, pair.synonym);
        const distractors = shuffle(distractorPool).slice(0, 3);
        const options = shuffle([pair.synonym, ...distractors]);
        return {
            id: genId(), type: 'synonym',
            question: `Từ nào đồng nghĩa với '${pair.word}'?`,
            options, correct: options.indexOf(pair.synonym),
            meta: { answer: pair.synonym, difficulty }
        };
    }

    function buildMatching(difficulty, weakSet) {
        const categories = ['nouns', 'verbs', 'adjectives'];
        const pairs = [];
        const seenEn = new Set();
        const seenVi = new Set();
        let guard = 0;
        while (pairs.length < 5 && guard < 60) {
            guard++;
            const cat = categories[guard % categories.length];
            const entry = pickVocab(cat, difficulty, weakSet);
            if (!entry) continue;
            const enKey = entry.en.toLowerCase();
            const viKey = entry.vi.toLowerCase();
            if (seenEn.has(enKey) || seenVi.has(viKey)) continue;
            seenEn.add(enKey);
            seenVi.add(viKey);
            pairs.push({ id: genId(), en: entry.en, vi: entry.vi });
        }
        if (pairs.length < 2) return null;
        return {
            id: genId(), type: 'matching',
            question: 'Ghép từ tiếng Anh với nghĩa tiếng Việt tương ứng',
            pairs,
            meta: { difficulty }
        };
    }

    // Restricts a distractor pool to entries at or below the target difficulty first
    // (so an easy question doesn't show far-harder words as wrong answers), falling back
    // to the full pool only if that leaves too few candidates to fill the options.
    function difficultyCappedPool(pool, difficulty, minCount) {
        const capped = pool.filter(v => (v.difficulty || 1) <= difficulty);
        return capped.length >= minCount ? capped : pool;
    }

    function buildMeaning(difficulty, weakSet) {
        const cat = pickRandom(['nouns', 'verbs', 'adjectives']);
        const entry = pickVocab(cat, difficulty, weakSet);
        const rawPool = difficultyCappedPool(VOCAB_BANK[cat].filter(v => v.en !== entry.en), difficulty, 3).map(v => v.vi);
        const pool = dedupeDistractorPool(rawPool, entry.vi);
        const distractors = shuffle(pool).slice(0, 3);
        const options = shuffle([entry.vi, ...distractors]);
        return {
            id: genId(), type: 'meaning',
            question: `Từ '${entry.en}' có nghĩa là gì?`,
            options, correct: options.indexOf(entry.vi),
            meta: { answer: entry.vi, wordEn: entry.en, difficulty }
        };
    }

    function buildMultipleChoice(difficulty, weakSet) {
        const cat = pickRandom(['nouns', 'adjectives']);
        const entry = pickVocab(cat, difficulty, weakSet);
        const rawPool = difficultyCappedPool(VOCAB_BANK[cat].filter(v => v.en !== entry.en), difficulty, 3).map(v => v.en);
        const pool = dedupeDistractorPool(rawPool, entry.en);
        const distractors = shuffle(pool).slice(0, 3);
        const options = shuffle([entry.en, ...distractors]);
        return {
            id: genId(), type: 'multiple_choice',
            question: `How do you say '${entry.vi}'?`,
            options, correct: options.indexOf(entry.en),
            meta: { answer: entry.en, difficulty }
        };
    }

    // Fills every {slotName} placeholder in `text` from `filledSlots`, plus {name} from
    // the separately-picked name - a single combined replace pass so a slot named
    // "name" in a topic's own pool (there isn't one, but this keeps the two namespaces
    // from ever silently colliding) can never shadow the person's name.
    function fillSlots(text, name, filledSlots) {
        return text.replace(/\{name\}/g, name).replace(/\{(\w+)\}/g, (match, key) => {
            return Object.prototype.hasOwnProperty.call(filledSlots, key) ? filledSlots[key] : match;
        });
    }

    // Builds a reading/dialogue exercise from a topic's combinatorial shape+slot-pool
    // definition (see data/topic-passages.js) instead of a single fixed static text -
    // a handful of shapes x several slot pools per topic yields thousands of distinct,
    // grammatically-valid outputs, comfortably covering "hundreds per topic" without
    // storing that many literal passages.
    function buildFromTopicShape(shape, topicDef) {
        const name = pickRandom(TOPIC_NAME_POOL);
        // Some dialogue shapes speak a verb-phrase slot after "I"/"They" instead of the
        // third-person subject the reading shapes use it with (e.g. Daily Life's
        // "morningActivity" is "brushes their teeth" for reading but needs "brush my
        // teeth" for "B: ... then I ___") - topicDef.baseForms holds the matching
        // first-person/bare form for exactly those slots, listed per-shape in
        // baseFormSlots, so only the shapes that actually need it look there.
        const poolFor = (key) => {
            if (shape.baseFormSlots && shape.baseFormSlots.includes(key) && topicDef.baseForms && topicDef.baseForms[key]) {
                return topicDef.baseForms[key];
            }
            return topicDef.slots[key];
        };
        const filledSlots = {};
        Object.keys(topicDef.slots).forEach(key => {
            filledSlots[key] = pickRandom(poolFor(key));
        });
        const correctValue = filledSlots[shape.askSlot];
        const distractorPool = poolFor(shape.askSlot).filter(v => v !== correctValue);
        const distractors = shuffle(distractorPool).slice(0, 3);
        const options = shuffle([correctValue, ...distractors]);
        const fill = (s) => fillSlots(s, name, filledSlots);
        return { fill, options, correct: options.indexOf(correctValue), name, filledSlots };
    }

    function buildReading(difficulty) {
        // Mix the small set of hand-written static passages with the much larger
        // topic-based combinatorial pool - weighted toward the topic pool (5:1) since
        // it's where the real variety comes from, while keeping the original
        // hand-crafted passages in circulation too.
        const useTopicPool = typeof TOPIC_PASSAGES !== 'undefined' && TOPIC_PASSAGES.length && Math.random() < 0.85;
        if (useTopicPool) {
            const topicDef = pickRandom(TOPIC_PASSAGES);
            const shape = pickRandom(topicDef.readingShapes);
            const built = buildFromTopicShape(shape, topicDef);
            return {
                id: genId(), type: 'reading',
                passage: built.fill(shape.passage), question: built.fill(shape.question),
                options: built.options, correct: built.correct,
                meta: { topic: topicDef.topic, difficulty }
            };
        }
        const pool = READING_TEMPLATES.filter(r => r.difficulty <= difficulty);
        const tpl = pickWeightedByDifficulty(pool.length ? pool : READING_TEMPLATES, difficulty);
        const name = pickRandom(NAME_POOL);
        const fill = (s) => s.replace(/\{name\}/g, name);
        return {
            id: genId(), type: 'reading',
            passage: fill(tpl.passage), question: fill(tpl.question),
            options: tpl.options.map(fill), correct: tpl.correct,
            meta: { templateId: tpl.id, difficulty: tpl.difficulty }
        };
    }

    function buildDialogue(difficulty) {
        const useTopicPool = typeof TOPIC_PASSAGES !== 'undefined' && TOPIC_PASSAGES.length && Math.random() < 0.85;
        if (useTopicPool) {
            const topicDef = pickRandom(TOPIC_PASSAGES);
            const shape = pickRandom(topicDef.dialogueShapes);
            const built = buildFromTopicShape(shape, topicDef);
            return {
                id: genId(), type: 'dialogue',
                lines: shape.lines.map(built.fill), question: built.fill(shape.question),
                options: built.options, correct: built.correct,
                meta: { topic: topicDef.topic, difficulty }
            };
        }
        const pool = DIALOGUE_TEMPLATES.filter(d => d.difficulty <= difficulty);
        const tpl = pickWeightedByDifficulty(pool.length ? pool : DIALOGUE_TEMPLATES, difficulty);
        return {
            id: genId(), type: 'dialogue',
            lines: tpl.lines, question: tpl.question,
            options: tpl.options, correct: tpl.correct,
            meta: { templateId: tpl.id, difficulty: tpl.difficulty }
        };
    }

    function buildListeningComprehension(difficulty) {
        const pool = LISTENING_TEMPLATES.filter(t => t.difficulty <= difficulty);
        const tpl = pickWeightedByDifficulty(pool.length ? pool : LISTENING_TEMPLATES, difficulty);
        const qIdx = Math.floor(Math.random() * tpl.questions.length);
        const q = tpl.questions[qIdx];
        return {
            id: genId(), type: 'listening_comprehension',
            kind: tpl.kind,
            text: tpl.text || null,
            lines: tpl.lines || null,
            audioText: tpl.audioText,
            question: q.q,
            acceptedAnswers: q.acceptedAnswers,
            meta: { templateId: tpl.id, questionIdx: qIdx, difficulty: tpl.difficulty, topic: tpl.topic }
        };
    }

    function generateExercise(type, difficulty, weakSet) {
        switch (type) {
            case 'translate': return buildTranslate(generateSentenceInstance(difficulty, weakSet));
            case 'ordering': return buildOrdering(generateSentenceInstance(difficulty, weakSet));
            case 'pronunciation': return buildPronunciation(generateSentenceInstance(difficulty, weakSet));
            case 'dictation': return buildDictation(generateSentenceInstance(difficulty, weakSet));
            case 'listening': return buildListening(generateSentenceInstance(difficulty, weakSet), weakSet);
            case 'fill_blank': {
                let attempts = 0, result = null;
                while (!result && attempts < 10) {
                    result = buildFillBlank(generateSentenceInstance(difficulty, weakSet));
                    attempts++;
                }
                return result || buildMultipleChoice(difficulty, weakSet);
            }
            case 'synonym': return buildSynonym(difficulty);
            case 'meaning': return buildMeaning(difficulty, weakSet);
            case 'multiple_choice': return buildMultipleChoice(difficulty, weakSet);
            case 'matching': return buildMatching(difficulty, weakSet) || buildMultipleChoice(difficulty, weakSet);
            case 'reading': return buildReading(difficulty);
            case 'dialogue': return buildDialogue(difficulty);
            case 'listening_comprehension': return buildListeningComprehension(difficulty);
            default: return buildMultipleChoice(difficulty, weakSet);
        }
    }

    const ALL_TYPES = ['multiple_choice', 'translate', 'ordering', 'listening', 'pronunciation', 'fill_blank', 'dictation', 'synonym', 'meaning', 'matching', 'reading', 'dialogue', 'listening_comprehension'];

    function generateBatch(count, difficulty, weakSet) {
        const batch = [];
        for (let i = 0; i < count; i++) {
            const type = ALL_TYPES[i % ALL_TYPES.length];
            const ex = generateExercise(type, difficulty, weakSet);
            if (ex) batch.push(ex);
        }
        return batch;
    }

    return { generateExercise, generateBatch, generateSentenceInstance, ALL_TYPES };
})();

window.ExerciseGenerator = ExerciseGenerator;
