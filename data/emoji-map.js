// Reusable EMOJI dictionary (en word -> emoji) for context-first, kid-facing lessons.
// EMOJI-FIRST: kids recognise a clear emoji instantly, far better than an abstract SVG.
// This is the coverage oracle for topic classification AND the picture source for the
// data-driven theme builder (data/theme-lessons.js). Keys are lowercase singular English.
// Exposed as window.EmojiMap.{ EMOJI, get(word), has(word), coverage(words) }.
(function () {
    'use strict';

    // Grouped for maintenance; flattened at the end. Kid-relevant concrete nouns.
    var GROUPS = {
        animals: {
            cat: '🐱', dog: '🐶', puppy: '🐶', kitten: '🐱', elephant: '🐘', lion: '🦁',
            tiger: '🐯', monkey: '🐵', gorilla: '🦍', horse: '🐴', pony: '🐴', cow: '🐮',
            ox: '🐂', buffalo: '🐃', pig: '🐷', sheep: '🐑', goat: '🐐', deer: '🦌',
            rabbit: '🐰', bunny: '🐰', mouse: '🐭', rat: '🐀', hamster: '🐹', squirrel: '🐿️',
            fox: '🦊', wolf: '🐺', bear: '🐻', panda: '🐼', koala: '🐨', sloth: '🦥',
            camel: '🐫', giraffe: '🦒', zebra: '🦓', rhino: '🦏', rhinoceros: '🦏',
            hippo: '🦛', hippopotamus: '🦛', kangaroo: '🦘', bat: '🦇', hedgehog: '🦔',
            snake: '🐍', lizard: '🦎', crocodile: '🐊', turtle: '🐢', tortoise: '🐢',
            dinosaur: '🦕', dragon: '🐉',
        },
        birds: {
            bird: '🐦', chicken: '🐔', hen: '🐔', rooster: '🐓', chick: '🐤', duck: '🦆',
            goose: '🦢', swan: '🦢', turkey: '🦃', peacock: '🦚', parrot: '🦜', owl: '🦉',
            eagle: '🦅', flamingo: '🦩', penguin: '🐧', dove: '🕊️', pigeon: '🕊️',
        },
        sea: {
            fish: '🐟', shark: '🦈', whale: '🐳', dolphin: '🐬', octopus: '🐙', squid: '🦑',
            crab: '🦀', lobster: '🦞', shrimp: '🦐', prawn: '🦐', jellyfish: '🎐',
            seal: '🦭', starfish: '⭐', shell: '🐚',
        },
        insects: {
            bee: '🐝', bug: '🐛', caterpillar: '🐛', butterfly: '🦋', ant: '🐜',
            ladybug: '🐞', spider: '🕷️', mosquito: '🦟', fly: '🪰', cricket: '🦗',
            snail: '🐌', worm: '🪱', beetle: '🪲', scorpion: '🦂',
        },
        fruit: {
            apple: '🍎', pear: '🍐', orange: '🍊', tangerine: '🍊', lemon: '🍋', lime: '🍋',
            banana: '🍌', watermelon: '🍉', grape: '🍇', grapes: '🍇', strawberry: '🍓',
            blueberry: '🫐', cherry: '🍒', cherries: '🍒', peach: '🍑', mango: '🥭',
            pineapple: '🍍', coconut: '🥥', kiwi: '🥝', tomato: '🍅', avocado: '🥑',
            melon: '🍈',
        },
        vegetable: {
            carrot: '🥕', corn: '🌽', potato: '🥔', sweetpotato: '🍠', eggplant: '🍆',
            aubergine: '🍆', cucumber: '🥒', pepper: '🫑', chili: '🌶️', broccoli: '🥦',
            lettuce: '🥬', cabbage: '🥬', onion: '🧅', garlic: '🧄', mushroom: '🍄',
            pea: '🫛', peas: '🫛', bean: '🫘', beans: '🫘', ginger: '🫚',
        },
        food: {
            rice: '🍚', noodle: '🍜', noodles: '🍜', pasta: '🍝', spaghetti: '🍝',
            bread: '🍞', baguette: '🥖', croissant: '🥐', pancake: '🥞', waffle: '🧇',
            pizza: '🍕', hamburger: '🍔', burger: '🍔', sandwich: '🥪', taco: '🌮',
            burrito: '🌯', hotdog: '🌭', fries: '🍟', popcorn: '🍿', egg: '🥚',
            cheese: '🧀', meat: '🍖', steak: '🥩', bacon: '🥓', chicken_leg: '🍗',
            fish_food: '🐟', sushi: '🍣', dumpling: '🥟', soup: '🍲', stew: '🍲',
            salad: '🥗', cake: '🍰', cupcake: '🧁', pie: '🥧', cookie: '🍪',
            chocolate: '🍫', candy: '🍬', lollipop: '🍭', doughnut: '🍩', donut: '🍩',
            icecream: '🍦', honey: '🍯', jam: '🍓', butter: '🧈', salt: '🧂',
        },
        drink: {
            water: '💧', milk: '🥛', juice: '🧃', coffee: '☕', tea: '🍵', cup: '☕',
            soda: '🥤', cola: '🥤', beer: '🍺', wine: '🍷', bottle: '🍼', smoothie: '🥤',
            coconut_drink: '🥥',
        },
        body: {
            eye: '👁️', eyes: '👀', ear: '👂', nose: '👃', mouth: '👄', lip: '👄',
            lips: '👄', tooth: '🦷', teeth: '🦷', tongue: '👅', hand: '✋', finger: '👆',
            thumb: '👍', fist: '✊', arm: '💪', leg: '🦵', foot: '🦶', feet: '🦶',
            knee: '🦵', hair: '💇', brain: '🧠', heart: '❤️', bone: '🦴', face: '😀',
        },
        family: {
            baby: '👶', child: '🧒', boy: '👦', girl: '👧', man: '👨', woman: '👩',
            mother: '👩', mom: '👩', mum: '👩', father: '👨', dad: '👨', parent: '👪',
            parents: '👪', family: '👪', grandmother: '👵', grandma: '👵',
            grandfather: '👴', grandpa: '👴', brother: '👦', sister: '👧', couple: '💑',
            people: '👥', friend: '🧑‍🤝‍🧑',
        },
        clothing: {
            shirt: '👕', 't-shirt': '👕', tshirt: '👕', dress: '👗', skirt: '👗',
            jeans: '👖', trousers: '👖', pants: '👖', shorts: '🩳', coat: '🧥',
            jacket: '🧥', sweater: '🧶', scarf: '🧣', glove: '🧤', gloves: '🧤',
            hat: '👒', cap: '🧢', crown: '👑', shoe: '👟', shoes: '👟', boot: '👢',
            boots: '👢', sandal: '🩴', sock: '🧦', socks: '🧦', tie: '👔', bikini: '👙',
            glasses: '👓', sunglasses: '🕶️', ring: '💍', bag: '👜', backpack: '🎒',
            umbrella: '☂️', purse: '👛', wallet: '👛',
        },
        vehicle: {
            car: '🚗', taxi: '🚕', bus: '🚌', truck: '🚚', van: '🚐', ambulance: '🚑',
            'fire truck': '🚒', firetruck: '🚒', 'police car': '🚓', tractor: '🚜',
            bicycle: '🚲', bike: '🚲', motorcycle: '🏍️', motorbike: '🏍️', scooter: '🛵',
            train: '🚆', tram: '🚊', subway: '🚇', metro: '🚇', boat: '⛵', ship: '🚢',
            sailboat: '⛵', ferry: '⛴️', canoe: '🛶', airplane: '✈️', plane: '✈️',
            helicopter: '🚁', rocket: '🚀', ufo: '🛸', anchor: '⚓', wheel: '🛞',
        },
        place: {
            house: '🏠', home: '🏠', building: '🏢', office: '🏢', school: '🏫',
            hospital: '🏥', bank: '🏦', hotel: '🏨', shop: '🏪', store: '🏪',
            factory: '🏭', castle: '🏰', church: '⛪', mosque: '🕌', temple: '🛕',
            stadium: '🏟️', park: '🏞️', mountain: '⛰️', volcano: '🌋', beach: '🏖️',
            island: '🏝️', desert: '🏜️', bridge: '🌉', city: '🏙️', farm: '🚜',
            tent: '⛺', station: '🚉', airport: '🛫', road: '🛣️',
        },
        furniture: {
            chair: '🪑', sofa: '🛋️', couch: '🛋️', bed: '🛏️', table: '🪑', desk: '🪑',
            door: '🚪', window: '🪟', lamp: '💡', light: '💡', mirror: '🪞',
            bathtub: '🛁', bath: '🛁', toilet: '🚽', shower: '🚿', clock: '⏰',
            picture: '🖼️', frame: '🖼️', candle: '🕯️', vase: '🏺', broom: '🧹',
            basket: '🧺', box: '📦',
        },
        kitchen: {
            plate: '🍽️', bowl: '🥣', spoon: '🥄', fork: '🍴', knife: '🔪',
            chopsticks: '🥢', pan: '🍳', pot: '🍲', kettle: '🫖', teapot: '🫖',
            'frying pan': '🍳', jar: '🫙', can: '🥫', bottle: '🍾', glass: '🥛',
            mug: '☕', scissors: '✂️',
        },
        object: {
            book: '📚', notebook: '📓', pen: '🖊️', pencil: '✏️', crayon: '🖍️',
            ruler: '📏', eraser: '🧽', paper: '📄', scissors_obj: '✂️', glue: '🩹',
            ball: '⚽', balloon: '🎈', kite: '🪁', toy: '🧸', teddy: '🧸', doll: '🪆',
            key: '🔑', lock: '🔒', bell: '🔔', clock: '⏰', watch: '⌚', phone: '📱',
            telephone: '☎️', computer: '💻', laptop: '💻', keyboard: '⌨️', mouse_pc: '🖱️',
            television: '📺', tv: '📺', radio: '📻', camera: '📷', battery: '🔋',
            flashlight: '🔦', candle: '🕯️', umbrella: '☂️', map: '🗺️', compass: '🧭',
            gift: '🎁', present: '🎁', money: '💰', coin: '🪙', card: '💳', letter: '✉️',
            envelope: '✉️', stamp: '📮', newspaper: '📰', magnet: '🧲', rope: '🪢',
            magnifier: '🔍', thermometer: '🌡️', syringe: '💉', pill: '💊', bandage: '🩹',
        },
        nature: {
            sun: '☀️', moon: '🌙', star: '⭐', cloud: '☁️', rain: '🌧️', rainbow: '🌈',
            snow: '❄️', snowflake: '❄️', snowman: '⛄', storm: '⛈️', thunder: '🌩️',
            lightning: '⚡', wind: '🌬️', tornado: '🌪️', fog: '🌫️', fire: '🔥',
            water: '💧', drop: '💧', wave: '🌊', ocean: '🌊', sea: '🌊', river: '🏞️',
            tree: '🌳', palm: '🌴', 'palm tree': '🌴', cactus: '🌵', bush: '🌿',
            grass: '🌱', plant: '🪴', leaf: '🍃', clover: '🍀', flower: '🌸',
            rose: '🌹', tulip: '🌷', sunflower: '🌻', daisy: '🌼', blossom: '🌸',
            mushroom: '🍄', rock: '🪨', stone: '🪨', earth: '🌍', world: '🌍',
            globe: '🌍', planet: '🪐', comet: '☄️',
        },
        weather: {
            hot: '🥵', cold: '🥶', sunny: '☀️', rainy: '🌧️', cloudy: '☁️',
            windy: '🌬️', stormy: '⛈️', snowy: '❄️', umbrella: '☂️',
        },
        sport: {
            soccer: '⚽', football: '⚽', basketball: '🏀', baseball: '⚾',
            tennis: '🎾', volleyball: '🏐', rugby: '🏉', 'ping pong': '🏓',
            badminton: '🏸', hockey: '🏒', cricket_sport: '🏏', golf: '⛳',
            bowling: '🎳', boxing: '🥊', skiing: '⛷️', skating: '⛸️',
            swimming: '🏊', surfing: '🏄', cycling: '🚴', running: '🏃',
            climbing: '🧗', fishing: '🎣', dart: '🎯', medal: '🏅', trophy: '🏆',
            skateboard: '🛹', dumbbell: '🏋️',
        },
        music: {
            music: '🎵', song: '🎶', guitar: '🎸', piano: '🎹', violin: '🎻',
            trumpet: '🎺', saxophone: '🎷', drum: '🥁', drums: '🥁', flute: '🪈',
            microphone: '🎤', headphone: '🎧', headphones: '🎧', bell: '🔔',
            accordion: '🪗', banjo: '🪕', maracas: '🪇',
        },
        job: {
            teacher: '👩‍🏫', doctor: '👨‍⚕️', nurse: '👩‍⚕️', farmer: '👨‍🌾', cook: '👨‍🍳',
            chef: '👨‍🍳', police: '👮', 'police officer': '👮', firefighter: '👨‍🚒',
            fireman: '👨‍🚒', pilot: '👨‍✈️', astronaut: '👨‍🚀', scientist: '👨‍🔬',
            artist: '👨‍🎨', painter: '👨‍🎨', singer: '👩‍🎤', engineer: '👷',
            worker: '👷', builder: '👷', mechanic: '👨‍🔧', judge: '👨‍⚖️',
            student: '👨‍🎓', soldier: '💂', king: '🤴', queen: '👸', prince: '🤴',
            princess: '👸', detective: '🕵️', dancer: '💃', guard: '💂',
            waiter: '🧑‍🍳', driver: '🧑', clown: '🤡', wizard: '🧙', fairy: '🧚',
        },
        toy: {
            teddy: '🧸', 'teddy bear': '🧸', doll: '🪆', kite: '🪁', balloon: '🎈',
            'building blocks': '🧱', block: '🧱', dice: '🎲', puzzle: '🧩',
            'yo-yo': '🪀', 'toy car': '🚗', drum: '🥁',
        },
        color: {
            red: '🟥', orange_color: '🟧', yellow: '🟨', green: '🟩', blue: '🟦',
            purple: '🟪', brown: '🟫', black: '⬛', white: '⬜', pink: '🌸',
        },
        misc: {
            time: '🕐', clock: '⏰', calendar: '📅', birthday: '🎂', party: '🎉',
            flag: '🚩', heart: '❤️', smile: '😄', tear: '😢', angry: '😠',
            sleep: '😴', ghost: '👻', monster: '👾', robot: '🤖', alien: '👽',
            crown: '👑', diamond: '💎', gem: '💎', key: '🔑', star: '⭐',
            rainbow: '🌈', magic: '✨', sparkle: '✨', bomb: '💣', trash: '🗑️',
        },
        country: {
            vietnam: '🇻🇳', america: '🇺🇸', usa: '🇺🇸', england: '🏴', britain: '🇬🇧',
            uk: '🇬🇧', japan: '🇯🇵', china: '🇨🇳', korea: '🇰🇷', france: '🇫🇷',
            germany: '🇩🇪', italy: '🇮🇹', spain: '🇪🇸', russia: '🇷🇺', india: '🇮🇳',
            thailand: '🇹🇭', canada: '🇨🇦', australia: '🇦🇺', brazil: '🇧🇷',
            mexico: '🇲🇽', egypt: '🇪🇬', greece: '🇬🇷',
        },

        // ---- CONTEXT concept groups (added for the no-picture themes) -------------------
        // These are the "CONTEXT" bucket from the topic classification: kid concepts that
        // aren't concrete objects (numbers, feelings, days, months...). They live LAST on
        // purpose — flattening is first-wins, so nothing above can be overwritten and the
        // existing picture themes keep their exact word buckets.
        number: {
            zero: '0️⃣', one: '1️⃣', two: '2️⃣', three: '3️⃣', four: '4️⃣', five: '5️⃣',
            six: '6️⃣', seven: '7️⃣', eight: '8️⃣', nine: '9️⃣', ten: '🔟',
        },
        emotion: {
            happy: '😊', sad: '😢', tired: '😴', scared: '😨', surprised: '😲',
            excited: '🤩', proud: '😌', shy: '😳', joy: '😊', fear: '😨',
            sadness: '😢', surprise: '😲', cry: '😭', tears: '😢', laugh: '😂',
            laughter: '😂', hug: '🤗', kiss: '😘', handshake: '🤝',
            frown: '😦',
            // NOTE: no `wave` here. `nature` claims it first (🌊 the ocean wave), and
            // flattening is first-wins, so an emotion entry could never win — listing it
            // would only look like a waving hand was available when it is not.
        },
        shape: {
            circle: '⭕', square: '🟦', triangle: '🔺', rectangle: '▭', oval: '⬭',
            line: '➖', point: '🔘', angle: '📐', curve: '〰️',
        },
        school: {
            homework: '📝', exam: '📄', test: '📄', textbook: '📚', classroom: '🚪',
            library: '🏛️', lesson: '📖', grade: '💯', ruler: '📏', eraser: '🧽',
            backpack: '🎒', blackboard: '📋', whiteboard: '📋',
        },
        season: { spring: '🌸', summer: '🌞', autumn: '🍂', fall: '🍂', winter: '⛄' },
        // Weekdays/months have no literal emoji — these are MNEMONIC anchors (a picture the
        // child links to the name), which is how the day/month drills stay visual.
        weekday: {
            monday: '📚', tuesday: '✏️', wednesday: '🎨', thursday: '🎵',
            friday: '🎉', saturday: '⚽', sunday: '🏠',
        },
        month: {
            january: '❄️', february: '💝', march: '🌱', april: '🌧️', may: '🌺',
            june: '☀️', july: '🏖️', august: '🌻', september: '🍎', october: '🎃',
            november: '🍂', december: '🎄',
        },
        time: {
            morning: '🌅', noon: '🌞', afternoon: '🌤️', evening: '🌆', night: '🌙',
            midnight: '🌚', hour: '⏰', minute: '⏱️', second: '⏲️', week: '📅',
            weekend: '🎠', calendar: '🗓️', today: '📆', birthday: '🎂',
        },
        celebration: {
            fireworks: '🎆', festival: '🎊', celebration: '🎊', wedding: '💒',
            holiday: '🏖️', ceremony: '🎓',
        },
    };

    // Flatten (first definition wins = earlier group is more canonical). Also record which
    // semantic group each key belongs to, so words can be bucketed into clean themes.
    var EMOJI = {};
    var KEY2GROUP = {};
    Object.keys(GROUPS).forEach(function (g) {
        var m = GROUPS[g];
        Object.keys(m).forEach(function (k) {
            if (!(k in EMOJI)) {
                EMOJI[k] = m[k];
                KEY2GROUP[k] = g;
            }
        });
    });

    function norm(w) {
        return String(w == null ? '' : w)
            .toLowerCase()
            .trim();
    }

    // Resolve a word to the EMOJI key it matches (with light morphology), or null.
    function resolveKey(word) {
        var w = norm(word);
        if (!w) return null;
        if (EMOJI[w]) return w;
        var noart = w.replace(/^(a|an|the)\s+/, '');
        if (noart !== w && EMOJI[noart]) return noart;
        if (/ies$/.test(w) && EMOJI[w.slice(0, -3) + 'y']) return w.slice(0, -3) + 'y';
        if (/es$/.test(w) && EMOJI[w.slice(0, -2)]) return w.slice(0, -2);
        if (/s$/.test(w) && EMOJI[w.slice(0, -1)]) return w.slice(0, -1);
        return null;
    }

    function get(word) {
        var k = resolveKey(word);
        return k ? EMOJI[k] : null;
    }

    function has(word) {
        return resolveKey(word) != null;
    }

    // The semantic group a word belongs to (animals/birds/fruit/vehicle/...), or null.
    function groupOf(word) {
        var k = resolveKey(word);
        return k ? KEY2GROUP[k] : null;
    }

    // Fraction (0..1) of a word list that resolves to an emoji.
    function coverage(words) {
        if (!Array.isArray(words) || words.length === 0) return 0;
        var hit = 0;
        for (var i = 0; i < words.length; i++) if (has(words[i])) hit++;
        return hit / words.length;
    }

    var api = {
        EMOJI: EMOJI, GROUPS: GROUPS, KEY2GROUP: KEY2GROUP,
        get: get, has: has, coverage: coverage, groupOf: groupOf, resolveKey: resolveKey,
    };
    if (typeof window !== 'undefined') window.EmojiMap = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
