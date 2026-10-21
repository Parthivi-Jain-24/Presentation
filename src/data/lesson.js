export const demoLesson = {
  title: 'Motion and forces',
  source: 'Class 9 Science · Chapter 8',
  board: 'CBSE',
  grade: 'Class 9',
  subject: 'Physics',
  language: 'English',
  pages: 14,
  slides: [
    {
      type: 'cover',
      eyebrow: 'CLASS 9 · PHYSICS',
      title: 'Motion and forces',
      subtitle: 'How objects move, change direction, and respond to a push or pull.',
      notes: 'Open with a familiar example: a ball rolling across the classroom floor.',
      sourcePage: 1,
    },
    {
      type: 'outcomes',
      eyebrow: 'TODAY’S GOALS',
      title: 'Three ideas to take away',
      bullets: [
        'Describe motion using distance, time, and speed.',
        'Read a distance–time graph and explain its slope.',
        'Connect a change in motion to an applied force.',
      ],
      notes: 'Invite students to name one thing that can change how a moving object travels.',
      sourcePage: 2,
    },
    {
      type: 'concept',
      eyebrow: '01 · DESCRIBING MOTION',
      title: 'Speed measures distance over time',
      body: 'Speed tells us how much distance an object covers in a given time.',
      formula: 'speed = distance ÷ time',
      detail: 'A cyclist travels 60 m in 10 s. Their average speed is 6 m/s.',
      diagram: {
        kind: 'sequence', title: 'One speed calculation',
        nodes: [
          { label: 'Distance', detail: '60 metres covered' },
          { label: 'Divide by time', detail: '60 m ÷ 10 s' },
          { label: 'Average speed', detail: '6 metres per second' },
        ],
        caption: 'The units show what the answer measures.',
      },
      notes: 'Ask why the word “average” matters when a cyclist speeds up and slows down.',
      sourcePage: 3,
    },
    {
      type: 'animation',
      eyebrow: 'WATCH THE MODEL',
      title: 'A force changes an object’s motion',
      body: 'The same push changes a light cart’s speed more than a heavy cart’s speed.',
      formula: 'force = mass × acceleration',
      detail: 'Change the mass and compare how quickly the cart accelerates.',
      scene: 'physics_motion',
      simulation: {
        model: 'physics_motion', principle: 'At the same force, a larger mass produces less acceleration.',
        equation: 'a = F ÷ m',
        steps: ['Apply the same force', 'Compare cart acceleration', 'Explain the mass effect'],
        controls: [
          { key: 'force', label: 'Applied force', min: 1, max: 10, step: 1, value: 6, unit: 'N' },
          { key: 'mass', label: 'Cart mass', min: 1, max: 5, step: 1, value: 2, unit: 'kg' },
        ],
        assumption: 'The model holds the applied force constant while the cart mass changes.',
      },
      notes: 'Pause the animation. Have students predict what happens when the cart mass doubles.',
      sourcePage: 6,
    },
    {
      type: 'concept',
      eyebrow: '02 · READING GRAPHS',
      title: 'A steeper line means greater speed',
      body: 'On a distance–time graph, the slope shows how quickly distance changes.',
      formula: 'slope = change in distance ÷ change in time',
      detail: 'A horizontal line means the object is at rest.',
      diagram: {
        kind: 'parts', title: 'Reading a distance–time graph',
        nodes: [
          { label: 'Horizontal line', detail: 'Distance stays the same. The object is at rest.' },
          { label: 'Gentle slope', detail: 'Distance grows slowly. Speed is lower.' },
          { label: 'Steep slope', detail: 'Distance grows faster. Speed is higher.' },
        ],
        caption: 'Compare slope over the same time interval.',
      },
      notes: 'Point to the steeper section of the preview graph and ask which interval is faster.',
      sourcePage: 8,
    },
    {
      type: 'animation',
      eyebrow: 'WATCH THE MODEL',
      title: 'Distance–time graph slope shows speed',
      body: 'A moving object and its graph advance together.',
      formula: 'slope = speed',
      detail: 'If the object moves twice as fast, what happens to the line’s slope?',
      scene: 'physics_distance_graph',
      simulation: {
        model: 'physics_distance_graph', principle: 'The slope of a distance–time graph represents speed.',
        equation: 'slope = distance ÷ time',
        steps: ['Track the moving object', 'Plot distance over time', 'Compare the slopes'],
        controls: [{ key: 'objectSpeed', label: 'Object speed', min: 1, max: 5, step: 1, value: 3, unit: 'm/s' }],
      },
      notes: 'Pause at two different speed settings and compare the cart position with the line slope.',
      sourcePage: 8,
    },
    {
      type: 'worked',
      eyebrow: 'TRY IT TOGETHER',
      title: 'Find the average speed',
      question: 'A bus travels 150 km in 3 hours. What is its average speed?',
      answer: '150 km ÷ 3 h = 50 km/h',
      detail: 'Always include the unit. Here, kilometres cancel against hours in the ratio.',
      notes: 'Give students 30 seconds to solve before revealing the worked answer.',
      sourcePage: 10,
    },
    {
      type: 'recap',
      eyebrow: 'CHECK FOR UNDERSTANDING',
      title: 'Can you explain the motion?',
      bullets: [
        'What two measurements do we need to calculate average speed?',
        'What does a flat distance–time line tell us?',
        'How can a force change an object’s motion?',
      ],
      notes: 'Use the questions as an exit ticket, or ask students to answer in pairs.',
      sourcePage: 14,
    },
  ],
};

const subjectFacts = {
  Mathematics: {
    intro: 'Break the idea into smaller steps, then look for a pattern.',
    activity: 'Change one value and watch the graph respond.',
    scene: 'math',
    formula: 'y = x² − 4',
  },
  Physics: {
    intro: 'Describe what changes, what stays constant, and what causes the change.',
    activity: 'Change the starting conditions and compare the result.',
    scene: 'physics',
    formula: 'force = mass × acceleration',
  },
  Chemistry: {
    intro: 'Look at how particles are arranged and how they interact.',
    activity: 'Compare the particle arrangement before and after the change.',
    scene: 'chemistry',
    formula: 'H₂O · two hydrogen atoms, one oxygen atom',
  },
  Biology: {
    intro: 'Follow the parts of the system and notice how each part contributes.',
    activity: 'Trace one cycle through the system from start to finish.',
    scene: 'biology',
    formula: 'input → process → outcome',
  },
  English: {
    intro: 'Notice how each part of the sentence contributes to its meaning.',
    activity: 'Move one word and see how the sentence structure changes.',
    scene: 'english',
    formula: 'subject + verb + object',
  },
  'Social studies': {
    intro: 'Place events in context and connect a decision to its effects.',
    activity: 'Move through the timeline and compare each turning point.',
    scene: 'social',
    formula: 'place + people + time',
  },
  Robotics: {
    intro: 'Break the task into inputs, decisions, and actions.',
    activity: 'Change a sensor value and watch the robot adjust its path.',
    scene: 'robotics',
    formula: 'sense → decide → act',
  },
};

export function sceneForSubject(subject, topic = '') {
  const lower = topic.toLowerCase();
  if (subject === 'Mathematics') return /equation|solve for|balance|variable/.test(lower) ? 'math_balance' : 'math_graph';
  if (subject === 'Physics') {
    if (/wave|sound|frequency|wavelength|amplitude/.test(lower)) return 'physics_wave';
    if (/circuit|current|voltage|resistance|resistor/.test(lower)) return 'physics_circuit';
    if (/distance[–-]?time|distance and time|time-distance|slope/.test(lower)) return 'physics_distance_graph';
    return 'physics_motion';
  }
  if (subject === 'Chemistry') return /solid|liquid|gas|particle|temperature|melting|boiling/.test(lower) ? 'chemistry_particles' : 'chemistry_reaction';
  if (subject === 'Biology') return /cell|nucleus|membrane|organelle/.test(lower) ? 'biology_cell' : 'biology_cycle';
  if (subject === 'Social studies') return 'social_timeline';
  return subjectFacts[subject]?.scene || 'physics_motion';
}

function cleanTitle(fileName) {
  return (fileName || 'Uploaded chapter')
    .replace(/\.pdf$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pickSentences(sourceText) {
  const cleaned = (sourceText || '')
    .replace(/\s+/g, ' ')
    .replace(/\b\d+\s*\|\s*\d+\b/g, ' ')
    .trim();
  return cleaned
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 45 && sentence.length < 260)
    .slice(0, 12);
}

function sentencesByPage(pageTexts, text, pages) {
  if (pageTexts?.length) {
    return pageTexts.flatMap((page) => pickSentences(page.text).map((sentence) => ({ text: sentence, page: page.number })));
  }
  return pickSentences(text).slice(0, Math.max(1, pages)).map((sentence) => ({ text: sentence, page: null }));
}

export function buildLessonFromDocument({ text, pageTexts, fileName, pages = 1, board, grade, subject, language }) {
  const title = cleanTitle(fileName);
  const facts = subjectFacts[subject] || subjectFacts.Physics;
  const sourceItems = sentencesByPage(pageTexts, text, pages);
  const topicItems = sourceItems.length
    ? sourceItems.slice(0, 3)
    : [
        { text: `Start with the main idea in ${title}.`, page: null },
        { text: `Look at the details that explain ${title}.`, page: null },
        { text: `Use a short example to check understanding.`, page: null },
      ];
  const topics = topicItems.map((item) => item.text);
  const firstSourcePage = sourceItems.find((item) => item.page)?.page || null;
  const slides = [
    {
      type: 'cover', eyebrow: `${board.toUpperCase()} · ${grade.toUpperCase()} · ${subject.toUpperCase()}`,
      title, subtitle: `A guided lesson built from your chapter, with an interactive ${subject.toLowerCase()} model.`,
      notes: 'Check the generated title and lesson context before presenting.', sourcePage: firstSourcePage,
    },
    {
      type: 'outcomes', eyebrow: 'LESSON MAP', title: 'What students will explore',
      bullets: [
        `Explain a key idea from ${title}.`,
        `Use chapter details to explain the idea with a ${subject.toLowerCase()} example.`,
        'Apply the idea in one short example.',
      ], notes: 'Use these draft outcomes as a starting point and adjust them to your class.', sourcePage: firstSourcePage,
    },
    ...topicItems.map((item, index) => ({
      type: 'concept', eyebrow: `KEY IDEA ${String(index + 1).padStart(2, '0')}`,
      title: index === 0 ? 'Start with the central idea' : `Explore the next idea`,
      body: item.text,
      detail: item.page ? `Source page ${item.page} of ${pages}.` : 'Add a source page after reviewing the original chapter.',
      notes: 'Confirm that this extracted passage preserves the meaning of the original chapter.',
      sourcePage: item.page,
    })),
    {
      type: 'summary', eyebrow: 'CHAPTER SUMMARY', title: 'The chapter in three ideas',
      bullets: topics.slice(0, 3),
      notes: 'Review these extracted points against the original pages before presenting the summary.',
      sourcePage: topicItems.find((item) => item.page)?.page || null,
      sourcePages: [...new Set(topicItems.map((item) => item.page).filter(Boolean))],
    },
    {
      type: 'animation', eyebrow: 'INTERACTIVE MODEL', title: `${subject} in motion`,
      body: facts.intro, formula: facts.formula, detail: facts.activity, scene: facts.scene,
      notes: 'This is a subject-specific starter model. Check that it fits the chapter before teaching.',
      sourcePage: null,
    },
    {
      type: 'worked', eyebrow: 'PRACTICE', title: 'Apply the idea',
      question: 'How does one example from the chapter show the central idea?',
      answer: 'Point to a detail in the PDF, then explain what it shows.',
      detail: 'Teacher prompt: choose a suitable example from the original chapter before presenting.',
      notes: 'The prompt is generated from the uploaded document and needs teacher review.',
      sourcePage: null,
    },
    {
      type: 'recap', eyebrow: 'EXIT TICKET', title: 'Check for understanding',
      bullets: [
        `Explain the main idea in your own words.`,
        `What evidence in the chapter supports that explanation?`,
        `Where could you use this idea outside the classroom?`,
      ], notes: 'Edit these questions to match the lesson outcome and student reading level.', sourcePage: topicItems.filter((item) => item.page).at(-1)?.page || null,
    },
  ];

  return {
    title,
    source: `${fileName} · ${pages} pages`,
    board, grade, subject, language, pages, slides,
  };
}

export const sampleLessons = [
  { id: 'sample-motion', lesson: demoLesson },
  {
    id: 'sample-cell',
    lesson: buildLessonFromDocument({
      fileName: 'Cell structure.pdf', pages: 12, board: 'CBSE', grade: 'Class 8', subject: 'Biology', language: 'English',
      pageTexts: [
        { number: 1, text: 'The cell is the basic structural and functional unit of living organisms.' },
        { number: 3, text: 'The cell membrane controls what enters and leaves the cell. The nucleus contains genetic material and helps control cell activities.' },
        { number: 6, text: 'Mitochondria release energy from food through cellular respiration.' },
      ],
      text: 'The cell is the basic structural and functional unit of living organisms. The cell membrane controls what enters and leaves the cell. The nucleus contains genetic material and helps control cell activities. Mitochondria release energy from food through cellular respiration.',
    }),
  },
  {
    id: 'sample-equations',
    lesson: buildLessonFromDocument({
      fileName: 'Linear equations.pdf', pages: 10, board: 'CBSE', grade: 'Class 7', subject: 'Mathematics', language: 'English',
      pageTexts: [
        { number: 1, text: 'A linear equation describes a relationship whose graph is a straight line.' },
        { number: 3, text: 'A variable represents an unknown value. To solve an equation, use equal operations on both sides.' },
        { number: 5, text: 'For example, x plus 7 equals 15, so x equals 8.' },
      ],
      text: 'A linear equation describes a relationship whose graph is a straight line. A variable represents an unknown value. To solve an equation, use equal operations on both sides. For example, x plus 7 equals 15, so x equals 8.',
    }),
  },
];
