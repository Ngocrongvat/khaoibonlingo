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
      en: `${h.doAuxCap(f.pronoun.en)} ${f.pronoun.en.toLowerCase() === 'i' ? 'I' : f.pronoun.en.toLowerCase()} ${f.verb.forms.base} ${h.nounPhrase(f.noun)}`,
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
  },
  {
    id: 'past_continuous_aff',
    grammarPoint: 'Thì quá khứ tiếp diễn (khẳng định)',
    difficulty: 2,
    requiresConcreteObject: true,
    excludeStative: true,
    slots: ['pronoun', 'verb', 'noun'],
    build: (f, h) => ({
      en: `${f.pronoun.en} ${h.beVerbPast(f.pronoun.en)} ${f.verb.forms.ing} ${h.nounPhrase(f.noun)}`,
      vi: `${f.pronoun.vi} đã đang ${f.verb.vi} ${f.noun.vi.toLowerCase()}`
    })
  },
  {
    id: 'past_continuous_neg',
    grammarPoint: 'Thì quá khứ tiếp diễn (phủ định)',
    difficulty: 2,
    requiresConcreteObject: true,
    excludeStative: true,
    slots: ['pronoun', 'verb', 'noun'],
    build: (f, h) => ({
      en: `${f.pronoun.en} ${h.beVerbPast(f.pronoun.en)} not ${f.verb.forms.ing} ${h.nounPhrase(f.noun)}`,
      vi: `${f.pronoun.vi} đã không ${f.verb.vi} ${f.noun.vi.toLowerCase()} lúc đó`
    })
  },
  {
    id: 'present_perfect_aff',
    grammarPoint: 'Thì hiện tại hoàn thành (khẳng định)',
    difficulty: 3,
    requiresConcreteObject: true,
    slots: ['pronoun', 'verb', 'noun'],
    build: (f, h) => ({
      en: `${f.pronoun.en} ${h.presentPerfectAux(f.pronoun.en)} ${f.verb.forms.pastParticiple} ${h.nounPhrase(f.noun)}`,
      vi: `${f.pronoun.vi} đã ${f.verb.vi} ${f.noun.vi.toLowerCase()} rồi`
    })
  },
  {
    id: 'present_perfect_neg',
    grammarPoint: 'Thì hiện tại hoàn thành (phủ định)',
    difficulty: 3,
    requiresConcreteObject: true,
    slots: ['pronoun', 'verb', 'noun'],
    build: (f, h) => ({
      en: `${f.pronoun.en} ${h.presentPerfectAux(f.pronoun.en)} not ${f.verb.forms.pastParticiple} ${h.nounPhrase(f.noun)}`,
      vi: `${f.pronoun.vi} chưa ${f.verb.vi} ${f.noun.vi.toLowerCase()}`
    })
  },
  {
    id: 'present_perfect_question',
    grammarPoint: 'Thì hiện tại hoàn thành (câu hỏi)',
    difficulty: 3,
    requiresConcreteObject: true,
    slots: ['pronoun', 'verb', 'noun'],
    build: (f, h) => ({
      en: `${h.presentPerfectAux(f.pronoun.en).charAt(0).toUpperCase()}${h.presentPerfectAux(f.pronoun.en).slice(1)} ${f.pronoun.en.toLowerCase() === 'i' ? 'I' : f.pronoun.en.toLowerCase()} ${f.verb.forms.pastParticiple} ${h.nounPhrase(f.noun)}?`,
      vi: `${f.pronoun.vi} đã ${f.verb.vi} ${f.noun.vi.toLowerCase()} chưa`
    })
  },
  {
    id: 'future_going_to_aff',
    grammarPoint: 'Thì tương lai gần "going to" (khẳng định)',
    difficulty: 2,
    requiresConcreteObject: true,
    slots: ['pronoun', 'verb', 'noun'],
    build: (f, h) => ({
      en: `${f.pronoun.en} ${h.beVerb(f.pronoun.en)} going to ${f.verb.forms.base} ${h.nounPhrase(f.noun)}`,
      vi: `${f.pronoun.vi} sắp ${f.verb.vi} ${f.noun.vi.toLowerCase()}`
    })
  },
  {
    id: 'future_going_to_neg',
    grammarPoint: 'Thì tương lai gần "going to" (phủ định)',
    difficulty: 2,
    requiresConcreteObject: true,
    slots: ['pronoun', 'verb', 'noun'],
    build: (f, h) => ({
      en: `${f.pronoun.en} ${h.beVerb(f.pronoun.en)} not going to ${f.verb.forms.base} ${h.nounPhrase(f.noun)}`,
      vi: `${f.pronoun.vi} sẽ không ${f.verb.vi} ${f.noun.vi.toLowerCase()}`
    })
  },
  {
    id: 'zero_conditional',
    grammarPoint: 'Câu điều kiện loại 0',
    difficulty: 3,
    requiresConcreteObject: true,
    slots: ['pronoun', 'verb', 'noun', 'adjective'],
    build: (f, h) => ({
      en: `If ${f.pronoun.en.toLowerCase() === 'i' ? 'I' : f.pronoun.en.toLowerCase()} ${h.presentVerb(f.verb, f.pronoun.en)} ${h.nounPhrase(f.noun)}, ${f.pronoun.en.toLowerCase() === 'i' ? 'I' : f.pronoun.en.toLowerCase()} ${h.beVerb(f.pronoun.en)} ${f.adjective.en}`,
      vi: `Nếu ${f.pronoun.vi.toLowerCase()} ${f.verb.vi} ${f.noun.vi.toLowerCase()} thì ${f.pronoun.vi.toLowerCase()} ${f.adjective.vi}`
    })
  },
  {
    id: 'first_conditional',
    grammarPoint: 'Câu điều kiện loại 1',
    difficulty: 3,
    requiresConcreteObject: true,
    slots: ['pronoun', 'verb', 'noun', 'adjective'],
    build: (f, h) => ({
      en: `If ${f.pronoun.en.toLowerCase() === 'i' ? 'I' : f.pronoun.en.toLowerCase()} ${h.presentVerb(f.verb, f.pronoun.en)} ${h.nounPhrase(f.noun)}, ${f.pronoun.en.toLowerCase() === 'i' ? 'I' : f.pronoun.en.toLowerCase()} will be ${f.adjective.en}`,
      vi: `Nếu ${f.pronoun.vi.toLowerCase()} ${f.verb.vi} ${f.noun.vi.toLowerCase()} thì ${f.pronoun.vi.toLowerCase()} sẽ ${f.adjective.vi}`
    })
  },
  {
    id: 'passive_present_simple',
    grammarPoint: 'Câu bị động (thì hiện tại đơn)',
    difficulty: 3,
    requiresConcreteObject: true,
    slots: ['noun', 'verb', 'noun2'],
    build: (f, h) => {
      const subject = h.nounPhrase(f.noun);
      return {
        en: `${subject.charAt(0).toUpperCase()}${subject.slice(1)} is ${f.verb.forms.pastParticiple} by ${h.nounPhrase(f.noun2)}`,
        vi: `${f.noun.vi} bị ${f.noun2.vi.toLowerCase()} ${f.verb.vi}`
      };
    }
  },
  {
    id: 'superlative',
    grammarPoint: 'So sánh nhất',
    difficulty: 3,
    slots: ['noun', 'adjective'],
    build: (f, h) => {
      const subject = h.nounPhrase(f.noun);
      return {
        en: `${subject.charAt(0).toUpperCase()}${subject.slice(1)} is the ${h.superlativeForm(f.adjective.en)} of all`,
        vi: `${f.noun.vi} là ${f.adjective.vi.toLowerCase()} nhất`
      };
    }
  },
  {
    id: 'wh_question_what',
    grammarPoint: 'Câu hỏi Wh- với "What"',
    difficulty: 2,
    slots: ['pronoun', 'verb'],
    build: (f, h) => ({
      en: `What ${h.doAux(f.pronoun.en)} ${f.pronoun.en.toLowerCase() === 'i' ? 'I' : f.pronoun.en.toLowerCase()} ${f.verb.forms.base}?`,
      vi: `${f.pronoun.vi} ${f.verb.vi} cái gì?`
    })
  },
  {
    id: 'wh_question_where',
    grammarPoint: 'Câu hỏi Wh- với "Where"',
    difficulty: 2,
    requiresConcreteObject: true,
    slots: ['pronoun', 'verb', 'noun'],
    build: (f, h) => ({
      en: `Where ${h.doAux(f.pronoun.en)} ${f.pronoun.en.toLowerCase() === 'i' ? 'I' : f.pronoun.en.toLowerCase()} ${f.verb.forms.base} ${h.nounPhrase(f.noun)}?`,
      vi: `${f.pronoun.vi} ${f.verb.vi} ${f.noun.vi.toLowerCase()} ở đâu?`
    })
  },
  {
    id: 'wh_question_when',
    grammarPoint: 'Câu hỏi Wh- với "When"',
    difficulty: 2,
    requiresConcreteObject: true,
    slots: ['pronoun', 'verb', 'noun'],
    build: (f, h) => ({
      en: `When ${h.doAux(f.pronoun.en)} ${f.pronoun.en.toLowerCase() === 'i' ? 'I' : f.pronoun.en.toLowerCase()} ${f.verb.forms.base} ${h.nounPhrase(f.noun)}?`,
      vi: `Khi nào ${f.pronoun.vi.toLowerCase()} ${f.verb.vi} ${f.noun.vi.toLowerCase()}?`
    })
  },
  {
    id: 'wh_question_why',
    grammarPoint: 'Câu hỏi Wh- với "Why"',
    difficulty: 2,
    requiresConcreteObject: true,
    slots: ['pronoun', 'verb', 'noun'],
    build: (f, h) => ({
      en: `Why ${h.doAux(f.pronoun.en)} ${f.pronoun.en.toLowerCase() === 'i' ? 'I' : f.pronoun.en.toLowerCase()} ${f.verb.forms.base} ${h.nounPhrase(f.noun)}?`,
      vi: `Tại sao ${f.pronoun.vi.toLowerCase()} ${f.verb.vi} ${f.noun.vi.toLowerCase()}?`
    })
  },
  {
    id: 'modal_must',
    grammarPoint: 'Động từ khiếm khuyết "must"',
    difficulty: 2,
    requiresConcreteObject: true,
    slots: ['pronoun', 'verb', 'noun'],
    build: (f, h) => ({
      en: `${f.pronoun.en} must ${f.verb.forms.base} ${h.nounPhrase(f.noun)}`,
      vi: `${f.pronoun.vi} phải ${f.verb.vi} ${f.noun.vi.toLowerCase()}`
    })
  },
  {
    id: 'modal_should',
    grammarPoint: 'Động từ khiếm khuyết "should"',
    difficulty: 2,
    requiresConcreteObject: true,
    slots: ['pronoun', 'verb', 'noun'],
    build: (f, h) => ({
      en: `${f.pronoun.en} should ${f.verb.forms.base} ${h.nounPhrase(f.noun)}`,
      vi: `${f.pronoun.vi} nên ${f.verb.vi} ${f.noun.vi.toLowerCase()}`
    })
  },
  {
    id: 'modal_have_to',
    grammarPoint: 'Cấu trúc "have to / has to"',
    difficulty: 2,
    requiresConcreteObject: true,
    slots: ['pronoun', 'verb', 'noun'],
    build: (f, h) => ({
      en: `${f.pronoun.en} ${['He', 'She', 'It'].includes(f.pronoun.en) ? 'has' : 'have'} to ${f.verb.forms.base} ${h.nounPhrase(f.noun)}`,
      vi: `${f.pronoun.vi} phải ${f.verb.vi} ${f.noun.vi.toLowerCase()}`
    })
  },
  {
    id: 'too_adjective_to',
    grammarPoint: 'Cấu trúc "too...to"',
    difficulty: 3,
    requiresConcreteObject: true,
    slots: ['pronoun', 'adjective', 'verb', 'noun'],
    build: (f, h) => ({
      en: `${f.pronoun.en} ${h.beVerb(f.pronoun.en)} too ${f.adjective.en} to ${f.verb.forms.base} ${h.nounPhrase(f.noun)}`,
      vi: `${f.pronoun.vi} quá ${f.adjective.vi.toLowerCase()} để ${f.verb.vi} ${f.noun.vi.toLowerCase()}`
    })
  },
  {
    id: 'adjective_enough_to',
    grammarPoint: 'Cấu trúc "adjective enough to"',
    difficulty: 3,
    requiresConcreteObject: true,
    slots: ['pronoun', 'adjective', 'verb', 'noun'],
    build: (f, h) => ({
      en: `${f.pronoun.en} ${h.beVerb(f.pronoun.en)} ${f.adjective.en} enough to ${f.verb.forms.base} ${h.nounPhrase(f.noun)}`,
      vi: `${f.pronoun.vi} đủ ${f.adjective.vi.toLowerCase()} để ${f.verb.vi} ${f.noun.vi.toLowerCase()}`
    })
  }
];
