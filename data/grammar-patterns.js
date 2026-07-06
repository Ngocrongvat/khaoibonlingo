// Sentence templates: each builds an {en, vi} pair from slot fillers (pronoun/verb/noun/adjective/adverb).
// Word order is defined explicitly per template (English and Vietnamese differ), never auto-derived.
// Conjugation helpers are in exercise-generator.js; templates only describe structure + slot needs.
const GRAMMAR_PATTERNS = [
  {
    id: 'present_simple_aff',
    grammarPoint: 'Thì hiện tại đơn (khẳng định)',
    difficulty: 1,
    requiresConcreteObject: true,
    slots: ['pronoun', 'verb', 'noun'],
    build: (f, h) => ({
      en: `${f.pronoun.en} ${h.presentVerb(f.verb, f.pronoun.en)} ${h.nounPhrase(f.noun)}`,
      vi: `${f.pronoun.vi} ${f.verb.vi} ${f.noun.vi.toLowerCase()}`
    })
  },
  {
    id: 'present_simple_neg',
    grammarPoint: 'Thì hiện tại đơn (phủ định)',
    difficulty: 1,
    requiresConcreteObject: true,
    slots: ['pronoun', 'verb', 'noun'],
    build: (f, h) => ({
      en: `${f.pronoun.en} ${h.doAux(f.pronoun.en)} not ${f.verb.forms.base} ${h.nounPhrase(f.noun)}`,
      vi: `${f.pronoun.vi} không ${f.verb.vi} ${f.noun.vi.toLowerCase()}`
    })
  },
  {
    id: 'present_simple_question',
    grammarPoint: 'Thì hiện tại đơn (câu hỏi)',
    difficulty: 1,
    requiresConcreteObject: true,
    slots: ['pronoun', 'verb', 'noun'],
    build: (f, h) => ({
      en: `${h.doAuxCap(f.pronoun.en)} ${f.pronoun.en} ${f.verb.forms.base} ${h.nounPhrase(f.noun)}`,
      vi: `${f.pronoun.vi} có ${f.verb.vi} ${f.noun.vi.toLowerCase()} không`
    })
  },
  {
    id: 'to_be_adjective',
    grammarPoint: 'Động từ "to be" + tính từ',
    difficulty: 1,
    slots: ['pronoun', 'adjective'],
    build: (f, h) => ({
      en: `${f.pronoun.en} ${h.beVerb(f.pronoun.en)} ${f.adjective.en}`,
      vi: `${f.pronoun.vi} ${f.adjective.vi}`
    })
  },
  {
    id: 'there_is_a',
    grammarPoint: 'Cấu trúc "There is/are"',
    difficulty: 1,
    slots: ['noun'],
    build: (f, h) => ({
      en: `There is ${h.article(f.noun.en)} ${f.noun.en.toLowerCase()}`,
      vi: `Có một ${f.noun.vi.toLowerCase()}`
    })
  },
  {
    id: 'imperative',
    grammarPoint: 'Câu mệnh lệnh',
    difficulty: 1,
    requiresConcreteObject: true,
    slots: ['verb', 'noun'],
    build: (f, h) => ({
      en: `${f.verb.forms.base.charAt(0).toUpperCase()}${f.verb.forms.base.slice(1)} ${h.nounPhrase(f.noun)}`,
      vi: `Hãy ${f.verb.vi} ${f.noun.vi.toLowerCase()}`
    })
  },
  {
    id: 'present_continuous',
    grammarPoint: 'Thì hiện tại tiếp diễn',
    difficulty: 2,
    requiresConcreteObject: true,
    excludeStative: true,
    slots: ['pronoun', 'verb', 'noun'],
    build: (f, h) => ({
      en: `${f.pronoun.en} ${h.beVerb(f.pronoun.en)} ${f.verb.forms.ing} ${h.nounPhrase(f.noun)}`,
      vi: `${f.pronoun.vi} đang ${f.verb.vi} ${f.noun.vi.toLowerCase()}`
    })
  },
  {
    id: 'past_simple_aff',
    grammarPoint: 'Thì quá khứ đơn (khẳng định)',
    difficulty: 2,
    requiresConcreteObject: true,
    slots: ['pronoun', 'verb', 'noun'],
    build: (f, h) => ({
      en: `${f.pronoun.en} ${f.verb.forms.past} ${h.nounPhrase(f.noun)}`,
      vi: `${f.pronoun.vi} đã ${f.verb.vi} ${f.noun.vi.toLowerCase()}`
    })
  },
  {
    id: 'past_simple_neg',
    grammarPoint: 'Thì quá khứ đơn (phủ định)',
    difficulty: 2,
    requiresConcreteObject: true,
    slots: ['pronoun', 'verb', 'noun'],
    build: (f, h) => ({
      en: `${f.pronoun.en} did not ${f.verb.forms.base} ${h.nounPhrase(f.noun)}`,
      vi: `${f.pronoun.vi} đã không ${f.verb.vi} ${f.noun.vi.toLowerCase()}`
    })
  },
  {
    id: 'modal_can',
    grammarPoint: 'Động từ khiếm khuyết "can"',
    difficulty: 2,
    requiresConcreteObject: true,
    slots: ['pronoun', 'verb', 'noun'],
    build: (f, h) => ({
      en: `${f.pronoun.en} can ${f.verb.forms.base} ${h.nounPhrase(f.noun)}`,
      vi: `${f.pronoun.vi} có thể ${f.verb.vi} ${f.noun.vi.toLowerCase()}`
    })
  },
  {
    id: 'future_will',
    grammarPoint: 'Thì tương lai đơn với "will"',
    difficulty: 2,
    requiresConcreteObject: true,
    slots: ['pronoun', 'verb', 'noun'],
    build: (f, h) => ({
      en: `${f.pronoun.en} will ${f.verb.forms.base} ${h.nounPhrase(f.noun)} tomorrow`,
      vi: `${f.pronoun.vi} sẽ ${f.verb.vi} ${f.noun.vi.toLowerCase()} vào ngày mai`
    })
  },
  {
    id: 'adverb_frequency',
    grammarPoint: 'Trạng từ chỉ tần suất',
    difficulty: 2,
    requiresConcreteObject: true,
    slots: ['pronoun', 'frequency', 'verb', 'noun'],
    build: (f, h) => ({
      en: `${f.pronoun.en} ${f.frequency.en} ${h.presentVerb(f.verb, f.pronoun.en)} ${h.nounPhrase(f.noun)}`,
      vi: `${f.pronoun.vi} ${f.frequency.vi} ${f.verb.vi} ${f.noun.vi.toLowerCase()}`
    })
  },
  {
    id: 'comparative',
    grammarPoint: 'So sánh hơn',
    difficulty: 3,
    slots: ['noun', 'adjective', 'noun2'],
    build: (f, h) => ({
      en: `The ${f.noun.en.toLowerCase()} is ${h.comparativeForm(f.adjective.en)} than ${h.nounPhrase(f.noun2)}`,
      vi: `${f.noun.vi} thì ${f.adjective.vi} hơn ${f.noun2.vi.toLowerCase()}`
    })
  },
  {
    id: 'because_reason',
    grammarPoint: 'Liên từ chỉ nguyên nhân "because"',
    difficulty: 3,
    requiresConcreteObject: true,
    slots: ['pronoun', 'adjective', 'verb', 'noun'],
    build: (f, h) => ({
      en: `${f.pronoun.en} ${h.beVerb(f.pronoun.en)} ${f.adjective.en} because ${f.pronoun.en === 'I' ? 'I' : f.pronoun.en.toLowerCase()} ${h.presentVerb(f.verb, f.pronoun.en)} ${h.nounPhrase(f.noun)}`,
      vi: `${f.pronoun.vi} ${f.adjective.vi} vì ${f.pronoun.vi.toLowerCase()} ${f.verb.vi} ${f.noun.vi.toLowerCase()}`
    })
  }
];
