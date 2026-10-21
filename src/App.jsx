import { useEffect, useRef, useState } from 'react';
import {
  ArrowDownToLine, ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown,
  ChevronLeft, ChevronRight, ChevronUp, CircleHelp, Clapperboard, ClipboardList,
  Clock3, FileText, GraduationCap, Layers2, MoreHorizontal, PanelRight,
  PencilLine, Play, Plus, Presentation, Sparkles,
  Trash2, UploadCloud, X,
} from 'lucide-react';
import SimulationPlayer from './components/SimulationPlayer.jsx';
import SimulationLab from './components/SimulationLab.jsx';
import { demoLesson, sampleLessons } from './data/lesson.js';
import { api, setAccessToken } from './lib/api.js';
import { getSubjectTheme, isBiologySubject, normalizeSubject } from './lib/subjectTheme.js';

const SUBJECTS = ['Mathematics', 'EVS', 'Science', 'Physics', 'Chemistry', 'Biology', 'English', 'Social studies', 'History', 'Geography', 'Political Science', 'Economics', 'Robotics'];
const BOARDS = ['CBSE', 'ICSE', 'State board', 'IB'];
const GRADES = Array.from({ length: 12 }, (_, index) => `Class ${index + 1}`);
const LANGUAGES = ['English', 'Hindi'];
const STORY_RENDER_VERSION = 5;
function simulationControlsForScene(scene) {
  const controls = {
    math: [{ key: 'coefficient', label: 'Curve factor', min: 0.5, max: 3, step: 0.5, value: 1.5, unit: 'a' }],
    math_graph: [{ key: 'slope', label: 'Slope', min: -3, max: 3, step: 0.5, value: 1, unit: '' }, { key: 'intercept', label: 'Intercept', min: -5, max: 5, step: 1, value: 0, unit: '' }],
    math_balance: [{ key: 'offset', label: 'Value to isolate', min: 1, max: 12, step: 1, value: 7, unit: '' }],
    math_groups: [{ key: 'groups', label: 'Number of groups', min: 1, max: 8, step: 1, value: 5, unit: '' }, { key: 'perGroup', label: 'Items in each group', min: 1, max: 6, step: 1, value: 4, unit: '' }],
    math_sharing: [{ key: 'totalItems', label: 'Items to share', min: 2, max: 30, step: 1, value: 18, unit: '' }, { key: 'recipients', label: 'People sharing', min: 2, max: 10, step: 1, value: 9, unit: '' }],
    physics: [{ key: 'mass', label: 'Cart mass', min: 1, max: 5, step: 1, value: 2, unit: 'kg' }],
    physics_motion: [{ key: 'force', label: 'Applied force', min: 1, max: 10, step: 1, value: 6, unit: 'N' }, { key: 'mass', label: 'Cart mass', min: 1, max: 5, step: 1, value: 2, unit: 'kg' }],
    physics_distance_graph: [{ key: 'objectSpeed', label: 'Object speed', min: 1, max: 5, step: 1, value: 3, unit: 'm/s' }],
    physics_wave: [{ key: 'frequency', label: 'Frequency', min: 1, max: 5, step: 1, value: 2, unit: 'Hz' }],
    physics_circuit: [{ key: 'voltage', label: 'Voltage', min: 1, max: 12, step: 1, value: 6, unit: 'V' }, { key: 'resistance', label: 'Resistance', min: 1, max: 12, step: 1, value: 3, unit: 'Ω' }],
    chemistry: [{ key: 'bondAngle', label: 'Bond angle', min: 60, max: 180, step: 10, value: 105, unit: '°' }],
    chemistry_particles: [{ key: 'temperature', label: 'Temperature', min: 1, max: 10, step: 1, value: 4, unit: 'relative' }],
    chemistry_reaction: [{ key: 'reactionRate', label: 'Reaction rate', min: 1, max: 5, step: 1, value: 3, unit: '×' }],
    biology: [{ key: 'cycleRate', label: 'Cycle rate', min: 1, max: 5, step: 1, value: 2, unit: '×' }],
    biology_cell: [{ key: 'cellPhase', label: 'Cell phase', min: 1, max: 5, step: 1, value: 2, unit: '' }],
    biology_cycle: [{ key: 'cycleRate', label: 'Cycle rate', min: 1, max: 5, step: 1, value: 2, unit: '×' }],
    social: [{ key: 'timelineSpeed', label: 'Timeline pace', min: 1, max: 5, step: 1, value: 2, unit: '×' }],
    social_timeline: [{ key: 'timelineSpeed', label: 'Timeline pace', min: 1, max: 5, step: 1, value: 2, unit: '×' }],
    english: [{ key: 'focus', label: 'Sentence part', min: 0, max: 2, step: 1, value: 0, unit: '' }],
    robotics: [{ key: 'sensorThreshold', label: 'Sensor threshold', min: 1, max: 10, step: 1, value: 5, unit: '' }],
  };
  return controls[scene] || [];
}

function sourcePageLabel(slide) {
  const pages = slide.sourcePages?.length ? slide.sourcePages : slide.sourcePage ? [slide.sourcePage] : [];
  if (!pages.length) return '';
  return pages.length === 1 ? `PAGE ${pages[0]}` : `PAGES ${pages.join(', ')}`;
}

function sourceFigureFor(slide, sourceImages = []) {
  const pages = (slide.sourcePages?.length ? slide.sourcePages : slide.sourcePage ? [slide.sourcePage] : []).map(Number);
  const matches = sourceImages.filter((image) => (image.pages || []).some((page) => pages.includes(Number(page))));
  if (!matches.length) return null;
  const normalizeTerms = (text) => new Set((String(text || '').toLowerCase().match(/[a-z0-9]+/g) || []).filter((word) => word.length > 3)
    .map((word) => word.endsWith('s') ? word.slice(0, -1) : word));
  const titleTerms = normalizeTerms(slide.title);
  const visualTerms = normalizeTerms(slide.simulation?.visual?.title);
  const bodyTerms = normalizeTerms(`${slide.body || ''} ${slide.formula || ''} ${(slide.sections || []).map((section) => `${section.heading || ''} ${section.body || ''} ${section.detail || ''}`).join(' ')}`);
  const score = (image) => [...normalizeTerms(image.caption)].reduce((total, word) => total
    + (titleTerms.has(word) ? 3 : 0) + (visualTerms.has(word) ? 2 : 0) + (bodyTerms.has(word) ? 1 : 0), 0);
  const ranked = [...matches].sort((left, right) => score(right) - score(left));
  return score(ranked[0]) > 0 ? ranked[0] : null;
}

function isLegacyIdeaMap(slide) {
  const simulation = slide?.simulation || {};
  const oldMapAnimation = slide?.type === 'animation' && simulation.model === 'generated'
    && (simulation.equation === 'Source-linked topic map'
      || simulation.equation === 'Cited textbook figure and chapter details'
      || String(simulation.assumption || '').includes('Qualitative source map')
      || slide._sourceMapFallback === true);
  return oldMapAnimation || slide?.eyebrow === 'CHAPTER LEARNING MAP'
    || String(slide?.title || '').trim().toLowerCase() === 'ideas in this chapter';
}

function chapterDetailFromSlides(slides, title = 'Chapter details', existingMap = null) {
  const candidates = slides.filter((slide) => slide && slide.type !== 'cover'
    && !isLegacyIdeaMap(slide) && slide.layout !== 'chapter_detail'
    && !['outcomes', 'summary', 'recap'].includes(slide.type));
  const sections = [];
  const seen = new Set();
  for (const slide of candidates) {
    const heading = String(slide.title || '').trim();
    const details = [slide.body, slide.detail, slide.formula,
      ...(slide.simulation?.steps || []),
      ...(slide.simulation?.visual?.objects || []).map((object) => object.detail || object.label)]
      .map((value) => String(value || '').replace(/^(?:Mira asks|Pip notices|Together):\s*/i, '').replace(/\s+/g, ' ').trim())
      .filter((value) => value && !/^(?:explore|inspect|review) the (?:source|chapter) details?/i.test(value)
        && !/^select a source detail|^source detail\s*→|^review the cited page/i.test(value));
    const uniqueDetails = [...new Set(details)];
    const body = uniqueDetails.filter((value) => value.length > 40).slice(0, 2).join(' ');
    const key = `${heading.toLowerCase()}|${body.toLowerCase()}`;
    if (!heading || !body || seen.has(key)) continue;
    seen.add(key);
    const sourcePages = slide.sourcePages?.length ? slide.sourcePages : slide.sourcePage ? [slide.sourcePage] : [];
    sections.push({ heading, body: body.slice(0, 700), detail: '', sourcePages: sourcePages.slice(0, 3) });
    if (sections.length >= 4) break;
  }
  if (sections.length < 2 && existingMap) {
    const simulation = existingMap.simulation || {};
    const sourceDetails = (simulation.visual?.objects || []).map((object) => object.detail || object.label)
      .map((value) => String(value || '').replace(/\s+/g, ' ').trim())
      .filter((value) => value.length > 45);
    if (sourceDetails.length) {
      sections.push({ heading: String(existingMap.title || title), body: sourceDetails.slice(0, 2).join(' ').slice(0, 700),
        detail: '', sourcePages: existingMap.sourcePages || (existingMap.sourcePage ? [existingMap.sourcePage] : []) });
    }
  }
  if (!sections.length) return null;
  return {
    type: 'summary', layout: 'chapter_detail', eyebrow: 'CHAPTER OVERVIEW', title,
    body: 'Key explanations and examples from the chapter, with their source pages.',
    sections,
    sourcePages: [...new Set(sections.flatMap((section) => section.sourcePages || []))],
    notes: 'This overview is condensed from cited lesson explanations. Check each source passage before teaching.',
  };
}

function upgradeLegacyStoryMaps(lesson) {
  if (!lesson?.slides?.length) return lesson;
  const slides = lesson.slides;
  const existingDetail = slides.find((slide) => slide.layout === 'chapter_detail');
  const oldMapSlide = slides.find(isLegacyIdeaMap);
  const legacyDialogue = slides.some((slide) => slide.type === 'animation'
    && slide.simulation?.visual?.story && !slide.simulation.visual.story.sourceVisual);
  const needsChapterDetail = Number(lesson.chapterDetailVersion || 0) < 1;
  if (!oldMapSlide && !legacyDialogue && !needsChapterDetail) return lesson;

  const detail = existingDetail || chapterDetailFromSlides(slides, 'Chapter details', oldMapSlide);
  let insertedDetail = Boolean(existingDetail);
  const migrated = [];
  for (const slide of slides) {
    if (isLegacyIdeaMap(slide)
      || (slide.type === 'animation' && slide.simulation?.visual?.story && !slide.simulation.visual.story.sourceVisual)) {
      if (!insertedDetail && detail) {
        migrated.push(detail);
        insertedDetail = true;
      }
      continue;
    }
    if (slide.layout === 'chapter_detail') {
      if (!insertedDetail && detail) migrated.push(detail);
      insertedDetail = true;
      continue;
    }
    migrated.push(slide);
  }
  if (!insertedDetail && detail) migrated.splice(Math.min(1, migrated.length), 0, detail);
  const simulationCount = migrated.filter((slide) => slide.type === 'animation').length;
  return { ...lesson, slides: migrated, chapterDetailVersion: 1,
    chapterCoverage: lesson.chapterCoverage ? { ...lesson.chapterCoverage, simulationCount } : lesson.chapterCoverage };
}

function upgradeStoryAnimationLayout(lesson) {
  if (!lesson?.slides?.length) return lesson;
  let changed = false;
  const isBiology = isBiologySubject(lesson.subject);
  const slides = lesson.slides.map((slide) => {
    const story = slide.simulation?.visual?.story;
    if (slide.type !== 'animation' || !story || (story.sourceVisual && story.layoutVersion >= STORY_RENDER_VERSION)
      || (story.layoutVersion === STORY_RENDER_VERSION
      && (!isBiology || (story.subject === 'Biology' && !story.characters?.length)))) return slide;
    changed = true;
    const panels = isBiology ? (story.panels || []).map((panel, index) => ({
      ...panel,
      beat: ['NOTICE', 'TRACE', 'EXPLAIN'][index] || panel.beat,
      dialogue: String(panel.dialogue || '').replace(/^(?:Mira asks|Pip notices|Together):\s*/i, ''),
    })) : story.panels;
    return {
      ...slide,
      simulation: {
        ...slide.simulation,
        controls: isBiology ? [{ key: 'stage', label: 'Focus step', min: 0, max: Math.max(0, Math.min(2, (story.panels || []).length - 1)), step: 1, value: 0, unit: '' }] : slide.simulation.controls,
        visual: { ...slide.simulation.visual, story: {
          ...story, subject: isBiology ? 'Biology' : story.subject,
          characters: isBiology ? [] : story.characters,
          panels, layoutVersion: STORY_RENDER_VERSION,
        } },
      },
      eyebrow: isBiology ? 'BIOLOGY FIELD NOTE' : slide.eyebrow,
      formula: isBiology ? 'Observe → connect → explain' : slide.formula,
      detail: isBiology ? 'Use the highlighted source detail to explain the structure, relationship, or process.' : slide.detail,
    };
  });
  return changed ? { ...lesson, slides } : lesson;
}

function needsStoryAnimationUpgrade(lesson) {
  return Boolean(lesson?.slides?.some((slide) => slide.type === 'animation'
    && slide.simulation?.visual?.story && !slide.simulation.visual.story.sourceVisual));
}

function hasLegacyStoryMaps(lesson) {
  return Boolean(lesson?.slides?.some((slide) => isLegacyIdeaMap(slide)
    || (slide.type === 'animation' && slide.simulation?.visual?.story && !slide.simulation.visual.story.sourceVisual))
    || (lesson?.slides?.length && Number(lesson.chapterDetailVersion || 0) < 1));
}

function GuideCharacter({ message, compact = false, subject }) {
  const character = subject === 'Robotics' ? '🧑‍🔧'
    : ['Mathematics', 'English', 'Social studies'].includes(subject) ? '🧑‍🏫' : '🧑‍🔬';
  return (
    <div className={`guide-character ${compact ? 'compact' : ''}`} role="img" aria-label="Animated learning guide">
      <span className="guide-person" aria-hidden="true">{character}</span>
      {!compact && <span className="guide-message">{message || 'Let’s explore this idea.'}</span>}
    </div>
  );
}

function ChapterDiagram({ diagram, subject }) {
  if (!diagram?.nodes?.length) return null;
  const nodes = diagram.nodes.slice(0, 5).map((node) => typeof node === 'string' ? { label: node } : node);
  const isCycle = diagram.kind === 'cycle';
  return (
    <section className={`chapter-diagram diagram-${diagram.kind || 'sequence'}`} aria-label={diagram.title || 'Chapter diagram'}>
      <div className="diagram-header">
        <div><small>VISUAL EXPLANATION</small><strong>{diagram.title || 'Chapter diagram'}</strong></div>
        <GuideCharacter compact subject={subject} />
      </div>
      <div className="diagram-flow">
        {nodes.map((node, index) => (
          <div className="diagram-item-wrap" key={`${node.label}-${index}`}>
            <div className="diagram-node" style={{ '--node-index': index }}>
              <span className="diagram-node-number">{String(index + 1).padStart(2, '0')}</span>
              <strong>{node.label}</strong>
              {node.detail && <small>{node.detail}</small>}
            </div>
            {index < nodes.length - 1 && <span className="diagram-link" aria-hidden="true">{diagram.kind === 'parts' ? <Plus size={13} /> : <ChevronRight size={16} />}</span>}
          </div>
        ))}
      </div>
      {isCycle && <div className="diagram-loop" aria-hidden="true"><span />The sequence repeats</div>}
      {diagram.caption && <p className="diagram-caption">{diagram.caption}</p>}
    </section>
  );
}

function IconButton({ children, onClick, title, className = '', disabled = false }) {
  return <button className={`icon-button ${className}`} title={title} aria-label={title} onClick={onClick} disabled={disabled}>{children}</button>;
}

function Sidebar({ onNewLesson, onOpenHelp, onOpenLibrary, onOpenCurriculum, onOpenSimulations, recentLessons, activeLessonId, currentLesson, onSelectRecent, currentUser, onSignOut }) {
  const [active, setActive] = useState('Studio');
  const recent = [
    { id: activeLessonId, lesson: currentLesson },
    ...recentLessons.filter((item) => item.id !== activeLessonId),
  ].slice(0, 3);
  return (
    <aside className="sidebar">
      <div className="brand-lockup">
        <div className="brand-mark"><BookOpen size={17} strokeWidth={2.4} /></div>
        <span>classroom<span className="brand-light">studio</span></span>
        <button className="sidebar-collapse" aria-label="Collapse sidebar"><PanelRight size={16} /></button>
      </div>
      <div className="workspace-switcher">
        <div className="workspace-avatar">{(currentUser?.displayName || 'C').slice(0, 1).toUpperCase()}</div>
        <div className="workspace-copy"><strong>{currentUser?.workspace?.name || 'Classroom workspace'}</strong><span>Teacher workspace</span></div>
        <ChevronDown size={15} className="quiet-icon" />
      </div>
      <div className="side-section-label">WORKSPACE</div>
      <nav className="side-nav" aria-label="Workspace">
        <button className={`side-nav-item ${active === 'Studio' ? 'active' : ''}`} onClick={() => setActive('Studio')}><Clapperboard size={17} /><span>Lesson studio</span><span className="nav-shortcut">⌘ 1</span></button>
        <button className={`side-nav-item ${active === 'Simulations' ? 'active' : ''}`} onClick={() => { setActive('Simulations'); onOpenSimulations(); }}><Sparkles size={17} /><span>Simulation lab</span></button>
        <button className="side-nav-item" onClick={onOpenLibrary}><Layers2 size={17} /><span>My lessons</span><span className="nav-count">{recentLessons.length}</span></button>
        <button className="side-nav-item" onClick={onOpenCurriculum}><GraduationCap size={17} /><span>Curriculum map</span></button>
      </nav>
      <div className="side-section-label library-label">RECENT LESSONS <button aria-label="More lesson options"><MoreHorizontal size={16} /></button></div>
      <div className="recent-lessons">{recent.map(({ id, lesson }) => (
        <button className={`recent-item ${id === activeLessonId ? 'selected' : ''}`} key={id} onClick={() => { setActive('Studio'); onSelectRecent(id); }}>
          <span className={`recent-dot ${lesson.subject === 'Biology' ? 'biology-dot' : lesson.subject === 'Mathematics' ? 'math-dot' : 'physics-dot'}`} />
          <span className="recent-text"><strong>{lesson.title}</strong><small>{lesson.grade} · {lesson.subject}</small></span>
          {id === activeLessonId && <span className="recent-more"><MoreHorizontal size={15} /></span>}
        </button>
      ))}</div>
      <button className="side-new-button" onClick={onNewLesson}><Plus size={16} /> New lesson</button>
      <div className="sidebar-bottom">
        <div className="storage-card"><div className="storage-icon"><Sparkles size={16} /></div><div><strong>Good teaching starts here</strong><p>Turn a chapter into a lesson your class can explore.</p></div><button aria-label="Dismiss tip"><X size={13} /></button></div>
        <button className="side-nav-item help-item" onClick={onOpenHelp}><CircleHelp size={17} /><span>Help & feedback</span></button>
        <button className="profile-row" onClick={onSignOut} title="Sign out"><div className="profile-avatar">{(currentUser?.displayName || 'C').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</div><span><strong>{currentUser?.displayName || 'Teacher'}</strong><small>Sign out</small></span><MoreHorizontal size={16} className="quiet-icon" /></button>
      </div>
    </aside>
  );
}

function AppHeader({ onNewLesson, onOpenSimulations, onExport, onPresent, onUndo, onRedo, canUndo, canRedo, exporting, syncLabel }) {
  return (
    <header className="app-header">
      <div className="breadcrumbs"><span>My workspace</span><ChevronRight size={14} /><strong>Lesson studio</strong></div>
      <div className="header-actions">
        <span className="save-state"><span className="save-indicator"><Check size={11} /></span>{syncLabel}</span>
        <button className="header-button" onClick={onNewLesson}><Plus size={15} /> New lesson</button>
        <button className="header-button simlab-header-button" onClick={onOpenSimulations} aria-label="Open simulation lab"><Sparkles size={15} /><span>Simulation lab</span></button>
        <button className="header-button present-button" onClick={onPresent}><Play size={14} fill="currentColor" /> Present</button>
        <button className="export-button" onClick={onExport} disabled={exporting}>
          {exporting ? <span className="spinner" /> : <ArrowDownToLine size={15} />}
          {exporting ? 'Preparing…' : 'Export PPTX'}
          {!exporting && <ChevronDown size={13} className="export-chevron" />}
        </button>
      </div>
    </header>
  );
}

function LessonHeading({ lesson, onEditTitle }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(lesson.title);
  useEffect(() => setValue(lesson.title), [lesson.title]);
  const finish = () => { setEditing(false); if (value.trim()) onEditTitle(value.trim()); };
  return (
    <div className="lesson-heading">
      <div className="lesson-title-row">
        {editing ? <input autoFocus className="title-edit" value={value} onChange={(event) => setValue(event.target.value)} onBlur={finish} onKeyDown={(event) => event.key === 'Enter' && finish()} /> : <h1>{lesson.title}<button className="inline-edit" title="Rename lesson" onClick={() => setEditing(true)}><PencilLine size={14} /></button></h1>}
        <span className="draft-pill"><span /> Draft</span>
      </div>
      <div className="lesson-meta">
        <span><GraduationCap size={14} /> {lesson.grade}</span><span className="meta-divider" />
        <span><BookOpen size={14} /> {lesson.subject}</span><span className="meta-divider" />
        <span><FileText size={14} /> {lesson.source}</span><span className="meta-divider" />
        <span><Clock3 size={14} /> {lesson.slides.length} slides</span>
      </div>
    </div>
  );
}

function SlideRail({ slides, lesson, activeIndex, onSelect, onAdd, onDelete, onMove }) {
  const covered = new Set(slides.flatMap((slide) => slide.sourcePages?.length ? slide.sourcePages : slide.sourcePage ? [slide.sourcePage] : []));
  const referenced = [...covered].filter((page) => Number(page) >= 1 && Number(page) <= (lesson.pages || 1)).length;
  const referenceRatio = Math.round((referenced / Math.max(1, lesson.pages || 1)) * 100);
  return (
    <aside className="slide-rail">
      <div className="rail-heading"><span>SLIDES <em>{String(slides.length).padStart(2, '0')}</em></span><IconButton title="Insert after selected slide" onClick={() => onAdd(activeIndex + 1)}><Plus size={16} /></IconButton></div>
      <div className="slide-list">
        {slides.map((slide, index) => (
          <div className={`slide-list-row ${index === activeIndex ? 'selected' : ''}`} key={`${slide.type}-${index}`}>
            <button className="slide-thumbnail-button" onClick={() => onSelect(index)} aria-label={`Open slide ${index + 1}: ${slide.title}`}>
              <span className={`slide-thumb ${slide.type === 'cover' ? 'thumb-cover' : ''} ${slide.type === 'animation' ? 'thumb-animation' : ''}`}>
                <span className="thumb-heading" />
                <span className="thumb-line long" /><span className="thumb-line medium" />
                {slide.type === 'animation' ? <span className="thumb-sim"><span /></span> : slide.type === 'outcomes' || slide.type === 'recap' || slide.type === 'summary' ? <span className="thumb-bullets"><i /><i /><i /></span> : <span className="thumb-block" />}
              </span>
              <span className="slide-number">{String(index + 1).padStart(2, '0')}</span>
              <span className="slide-name">{slide.title}</span>
            </button>
            {index === activeIndex && <div className="slide-row-actions">
              <button onClick={() => onMove(index, index - 1)} disabled={index === 0} aria-label="Move slide up" title="Move slide up"><ChevronUp size={12} /></button>
              <button onClick={() => onMove(index, index + 1)} disabled={index === slides.length - 1} aria-label="Move slide down" title="Move slide down"><ChevronDown size={12} /></button>
              {slides.length > 1 && <button className="delete-slide-action" onClick={onDelete} aria-label="Delete current slide" title="Delete slide"><Trash2 size={12} /></button>}
            </div>}
            <button className="insert-between" onClick={() => onAdd(index + 1)} aria-label={`Insert a slide after slide ${index + 1}`} title={`Insert a slide after slide ${index + 1}`}><Plus size={11} /></button>
          </div>
        ))}
      </div>
      <button className="add-slide-row" onClick={() => onAdd(activeIndex + 1)}><Plus size={14} /> Insert after selected</button>
      <div className="rail-footer"><ClipboardList size={15} /><span>Source pages mapped</span><strong>{referenced}/{lesson.pages || 1}</strong><div className="coverage-track"><i style={{ width: `${referenceRatio}%` }} /></div></div>
    </aside>
  );
}

function StageSlide({ slide, lesson, sourceImages = [], progress, playing, params, onPlayingChange, onProgressChange, onParamsChange }) {
  const storyAnimation = Boolean(slide.simulation?.visual?.story);
  const sourceAnimation = Boolean(slide.simulation?.visual?.story?.sourceVisual);
  const biology = isBiologySubject(lesson.subject);
  const sourceFigure = slide.type === 'animation' || slide.layout === 'chapter_detail' ? sourceFigureFor(slide, sourceImages) : null;
  const theme = getSubjectTheme(lesson.subject);
  const slideIndex = Math.max(0, lesson.slides.findIndex((item) => item === slide));
  const slideAccents = [theme.teal, theme.coral, theme.purple, theme.green, theme.gold];
  const slideStyle = {
    '--slide-paper': `#${theme.paper}`, '--slide-ink': `#${theme.ink}`,
    '--slide-accent': `#${slideAccents[slideIndex % slideAccents.length]}`, '--slide-muted': `#${theme.muted}`,
    '--slide-highlight': `#${theme.mint}`, '--slide-line': `#${theme.line}`,
  };
  return (
    <div className={`slide-page ${slide.type === 'cover' ? 'cover-page' : ''}`} data-subject={normalizeSubject(lesson.subject)} style={slideStyle}>
      <div className="paper-grain" />
      {slide.imageUrl ? (
        <img className="slide-native-image" src={slide.imageUrl} alt={slide.title || lesson.title || 'Presentation slide'} draggable="false" />
      ) : slide.type === 'cover' ? (
        <div className="cover-content">
          <div className="cover-copy"><div className="cover-kicker"><span /> {slide.eyebrow}</div><h2>{slide.title}</h2><p>{slide.subtitle}</p><div className="cover-rule" /><div className="cover-footer"><span>{lesson.board}</span><b>·</b><span>{lesson.grade}</span><b>·</b><span>{lesson.subject}</span></div></div>
          <div className="cover-orbit orbit-one" /><div className="cover-orbit orbit-two" /><div className="cover-core"><BookOpen size={28} /></div>
          <div className="cover-annotation annotation-a">LEARN BY EXPLORING</div><div className="cover-annotation annotation-b">A LESSON PLAN</div>
        </div>
      ) : slide.type === 'animation' ? (
        <div className="animation-page-content">
          <div className="page-eyebrow"><span className="eyebrow-dot" />{slide.eyebrow || (sourceAnimation ? 'CHAPTER VISUAL' : biology && storyAnimation ? 'BIOLOGY FIELD NOTE' : storyAnimation ? 'CHAPTER MODEL' : 'INTERACTIVE MODEL')}</div>
          <h2>{slide.title}</h2>
          <p className="page-lede">{slide.body}</p>
          <div className={`animation-layout ${sourceFigure ? 'has-source-figure' : ''}`}>
            <SimulationPlayer scene={slide.scene} simulation={slide.simulation} sourceFigure={sourceFigure} progress={progress} playing={playing} onProgressChange={onProgressChange} onPlayingChange={onPlayingChange} params={params} onParamsChange={onParamsChange} />
            <div className="animation-caption"><div className="caption-mark"><Sparkles size={15} /></div><small>{sourceAnimation ? 'SOURCE VISUAL' : biology && storyAnimation ? 'SOURCE DIAGRAM' : storyAnimation ? 'CHAPTER MODEL' : 'KEY IDEA'}</small><span>{slide.formula || `Explore a ${lesson.subject.toLowerCase()} model`}</span><small>{sourceAnimation ? 'INSPECT THE CHAPTER DETAIL' : biology && storyAnimation ? 'EXPLAIN THE EVIDENCE' : storyAnimation ? 'FOLLOW THE MODEL' : 'PAUSE & PREDICT'}</small><p>{slide.detail}</p>{sourceFigure && (slide.simulation?.visual?.style === 'source_figure' ? <div className="source-figure-note">{sourceFigure.caption || `TEXTBOOK FIGURE · PAGE ${sourceFigure.pages?.[0] || ''}`}</div> : <figure className="source-figure-card"><img src={`data:${sourceFigure.data}`} alt={`Figure cropped from the uploaded textbook, page ${sourceFigure.pages?.[0] || ''}`} /><figcaption>TEXTBOOK FIGURE · PAGE {sourceFigure.pages?.[0] || ''}</figcaption></figure>)}<div className="caption-tag">{sourceFigure ? 'CITED BOOK FIGURE' : sourceAnimation ? 'CHAPTER-SPECIFIC VISUAL' : biology && storyAnimation ? 'STATIC BIOLOGY DIAGRAM' : storyAnimation ? 'CHAPTER MODEL' : 'SIMULATION'} · {lesson.subject.toUpperCase()}</div></div>
          </div>
          {sourcePageLabel(slide) && <div className="source-label">SOURCE · {lesson.source || lesson.title} · {sourcePageLabel(slide)}</div>}
        </div>
      ) : (
        <div className="ordinary-page-content">
          <div className="page-eyebrow"><span className="eyebrow-dot" />{slide.eyebrow || 'LESSON'}</div>
          <h2>{slide.title}</h2>
          {slide.layout === 'chapter_detail' ? (
            <div className={`chapter-detail-layout ${sourceFigure ? 'with-source-figure' : ''}`}>
              <div className="chapter-detail-sections">{(slide.sections || []).map((section, index) => (
                <section className="chapter-detail-section" key={`${section.heading}-${index}`}>
                  <span className="chapter-detail-index">{String(index + 1).padStart(2, '0')}</span>
                  <div><h3>{section.heading}</h3><p>{section.body}</p>{section.detail && <p className="chapter-detail-extra">{section.detail}</p>}
                    {section.sourcePages?.length > 0 && <small>BOOK PAGES {section.sourcePages.join(', ')}</small>}
                  </div>
                </section>
              ))}</div>
              {sourceFigure && <figure className="chapter-detail-figure"><img src={`data:${sourceFigure.data}`} alt={`Figure cropped from the uploaded textbook, page ${sourceFigure.pages?.[0] || ''}`} /><figcaption>{sourceFigure.caption || `TEXTBOOK FIGURE · PAGE ${sourceFigure.pages?.[0] || ''}`}</figcaption></figure>}
            </div>
          ) : slide.type === 'outcomes' || slide.type === 'recap' || slide.type === 'summary' ? (
            <div className="learning-list">{(slide.bullets || []).map((bullet, index) => <div className="learning-row" key={`${bullet}-${index}`}><span className="learning-index">0{index + 1}</span><span>{bullet}</span><ChevronRight size={17} /></div>)}</div>
          ) : slide.type === 'worked' ? (
            <div className="worked-layout"><p className="worked-question">{slide.question}</p><div className="answer-card"><span className="answer-check"><Check size={16} /></span><div><small>WORKED ANSWER</small><strong>{slide.answer}</strong></div></div><p className="worked-detail">{slide.detail}</p></div>
          ) : slide.layout === 'compare' ? (
            <div className="compare-layout">
              <p>{slide.body}</p>
              <div className="compare-columns">
                <section><small>{slide.leftTitle || 'First idea'}</small><p>{slide.leftBody || slide.body}</p></section>
                <section><small>{slide.rightTitle || 'Contrasting idea'}</small><p>{slide.rightBody || slide.detail}</p></section>
              </div>
              <p className="concept-detail">{slide.detail}</p>
            </div>
          ) : slide.layout === 'process' ? (
            <div className="process-layout">
              <p>{slide.body}</p>
              {slide.diagram ? <ChapterDiagram diagram={slide.diagram} subject={lesson.subject} /> : <div className="process-steps">{(slide.bullets?.length ? slide.bullets : [slide.body, slide.detail]).filter(Boolean).slice(0, 5).map((step, index) => <div key={`${step}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span><p>{step}</p>{index < Math.min(4, (slide.bullets?.length || 2) - 1) && <ChevronRight size={15} />}</div>)}</div>}
              <p className="concept-detail">{slide.detail}</p>
            </div>
          ) : slide.layout === 'definition' ? (
            <div className={`definition-layout ${slide.diagram ? 'explainer-with-diagram' : ''}`}>
              <div className="explainer-copy"><span>KEY TERM · {slide.term || slide.title}</span><p>{slide.body}</p>{slide.detail && <div>{slide.detail}</div>}</div>
              {slide.diagram && <ChapterDiagram diagram={slide.diagram} subject={lesson.subject} />}
            </div>
          ) : slide.layout === 'evidence' ? (
            <div className={`evidence-layout ${slide.diagram ? 'explainer-with-diagram' : ''}`}>
              <div className="explainer-copy"><div className="evidence-quote">“{slide.body}”</div>{slide.formula && <strong className="evidence-formula">{slide.formula}</strong>}<p>{slide.detail}</p></div>
              {slide.diagram && <ChapterDiagram diagram={slide.diagram} subject={lesson.subject} />}
            </div>
          ) : (
            <div className={`concept-layout ${slide.diagram ? 'concept-with-diagram' : ''}`}>
              <div className="concept-copy"><p className="concept-body">{slide.body}</p>{slide.formula && <div className="formula-card"><span>KEY RELATIONSHIP</span><strong>{slide.formula}</strong><div className="formula-decoration"><span>01</span><span>02</span><span>03</span></div></div>}<p className="concept-detail">{slide.detail}</p>{slide.sourcePage && <div className="concept-source"><FileText size={13} /> CHAPTER SOURCE · PAGE {slide.sourcePage}</div>}</div>
              {slide.diagram && <ChapterDiagram diagram={slide.diagram} subject={lesson.subject} />}
            </div>
          )}
          {sourcePageLabel(slide) && <div className="source-label">SOURCE · {lesson.source || lesson.title} · {sourcePageLabel(slide)}</div>}
        </div>
      )}
      <div className="page-number">{String((lesson.slides.findIndex((item) => item === slide) + 1) || 1).padStart(2, '0')} <span>/ {String(lesson.slides.length).padStart(2, '0')}</span></div>
    </div>
  );
}

function CanvasToolbar({ activeIndex, total, onPrevious, onNext, onPresent }) {
  return (
    <div className="canvas-toolbar">
      <div className="canvas-mode"><span className="mode-icon"><Presentation size={15} /></span><span>Slide canvas</span><ChevronDown size={13} /></div>
      <div className="canvas-pager"><IconButton title="Previous slide" onClick={onPrevious} disabled={activeIndex === 0}><ChevronLeft size={16} /></IconButton><span>{String(activeIndex + 1).padStart(2, '0')} <i>/</i> {String(total).padStart(2, '0')}</span><IconButton title="Next slide" onClick={onNext} disabled={activeIndex >= total - 1}><ChevronRight size={16} /></IconButton></div>
      <div className="canvas-tools"><span className="zoom-label">Fit</span><span className="zoom-separator" /><IconButton title="Present current slide" onClick={onPresent}><Presentation size={15} /></IconButton><IconButton title="More slide options"><MoreHorizontal size={17} /></IconButton></div>
    </div>
  );
}

function Inspector({ slide, activeIndex, lesson, onUpdate, params, onParamsChange, tab, setTab }) {
  const setBullets = (text) => onUpdate('bullets', text.split('\n').map((line) => line.trim()).filter(Boolean));
  const controls = slide.simulation?.controls || simulationControlsForScene(slide.scene || 'physics');
  const storyAnimation = Boolean(slide.simulation?.visual?.story);
  return (
    <aside className="inspector">
      <div className="inspector-heading"><div><span>SLIDE {String(activeIndex + 1).padStart(2, '0')}</span><strong>Properties</strong></div><IconButton title="Inspector options"><MoreHorizontal size={17} /></IconButton></div>
      <div className="inspector-tabs"><button className={tab === 'Content' ? 'active' : ''} onClick={() => setTab('Content')}><PencilLine size={13} /> Content</button><button className={tab === 'Animate' ? 'active' : ''} onClick={() => setTab('Animate')}><Sparkles size={13} /> Animate</button><button className={tab === 'Notes' ? 'active' : ''} onClick={() => setTab('Notes')}><FileText size={13} /> Notes</button></div>
      <div className="inspector-body">
        {tab === 'Content' && <>
          <label className="property-label">Slide title<input value={slide.title || ''} onChange={(event) => onUpdate('title', event.target.value)} /></label>
          {(slide.body !== undefined || slide.type === 'cover') && <label className="property-label">{slide.type === 'cover' ? 'Subtitle' : 'Body text'}<textarea rows="4" value={slide.body ?? slide.subtitle ?? ''} onChange={(event) => onUpdate(slide.type === 'cover' ? 'subtitle' : 'body', event.target.value)} /></label>}
          {slide.bullets && <label className="property-label">List items <span className="label-hint">One per line</span><textarea rows="5" value={slide.bullets.join('\n')} onChange={(event) => setBullets(event.target.value)} /></label>}
          {slide.formula !== undefined && <label className="property-label">Key relationship<input value={slide.formula} onChange={(event) => onUpdate('formula', event.target.value)} /></label>}
          {slide.diagram && <>
            <label className="property-label">Diagram title<input value={slide.diagram.title || ''} onChange={(event) => onUpdate('diagram', { ...slide.diagram, title: event.target.value })} /></label>
            <label className="property-label">Diagram nodes <span className="label-hint">One per line. Use a vertical bar to add a detail.</span><textarea rows="5" value={(slide.diagram.nodes || []).map((node) => typeof node === 'string' ? node : `${node.label || ''}${node.detail ? ` | ${node.detail}` : ''}`).join('\n')} onChange={(event) => onUpdate('diagram', { ...slide.diagram, nodes: event.target.value.split('\n').map((line) => { const [label, ...detail] = line.split('|'); return { label: label.trim(), detail: detail.join('|').trim() }; }).filter((node) => node.label) })} /></label>
            {slide.diagram.caption !== undefined && <label className="property-label">Diagram cue<textarea rows="2" value={slide.diagram.caption || ''} onChange={(event) => onUpdate('diagram', { ...slide.diagram, caption: event.target.value })} /></label>}
          </>}
          {slide.question !== undefined && <><label className="property-label">Question<textarea rows="3" value={slide.question} onChange={(event) => onUpdate('question', event.target.value)} /></label><label className="property-label">Answer<textarea rows="2" value={slide.answer} onChange={(event) => onUpdate('answer', event.target.value)} /></label></>}
          {slide.detail !== undefined && <label className="property-label">Supporting detail<textarea rows="3" value={slide.detail} onChange={(event) => onUpdate('detail', event.target.value)} /></label>}
          {slide.layout === 'compare' && <><label className="property-label">Left column<input value={slide.leftTitle || ''} onChange={(event) => onUpdate('leftTitle', event.target.value)} /></label><label className="property-label">Left explanation<textarea rows="3" value={slide.leftBody || ''} onChange={(event) => onUpdate('leftBody', event.target.value)} /></label><label className="property-label">Right column<input value={slide.rightTitle || ''} onChange={(event) => onUpdate('rightTitle', event.target.value)} /></label><label className="property-label">Right explanation<textarea rows="3" value={slide.rightBody || ''} onChange={(event) => onUpdate('rightBody', event.target.value)} /></label></>}
          <label className="property-label page-reference-input">Source page<input type="number" min="1" max={lesson.pages || 1} value={slide.sourcePage ?? ''} onChange={(event) => onUpdate('sourcePage', event.target.value ? Number(event.target.value) : null)} /></label>
          <div className="source-property"><span className="source-property-icon"><FileText size={14} /></span><div><small>CHAPTER REFERENCE</small><strong>{lesson.source || lesson.title}</strong><span>{sourcePageLabel(slide) || 'No page reference'} · {lesson.pages || 1} pages in source</span></div></div>
        </>}
        {tab === 'Animate' && <>
          {slide.type === 'animation' ? <>
            <div className="scene-property"><div className="scene-preview"><span className="scene-pulse" /><Sparkles size={16} /></div><div><small>{storyAnimation ? 'STORY ANIMATION' : 'CHAPTER MODEL'}</small><strong>{slide.simulation?.visual?.title || `${lesson.subject} · ${(slide.simulation?.model || slide.scene || 'model').replaceAll('_', ' ')}`}</strong><span>{storyAnimation ? (slide.simulation?.model === 'math_arithmetic' ? 'Interactive counters · rendered locally' : 'Three illustrated beats · rendered locally') : slide.simulation?.principle || slide.title}</span></div></div>
            <div className="field-divider" />
            <div className="property-label range-property"><span>Playback speed <b>{(params.speed || 1).toFixed(1)}×</b></span><input type="range" min="0.5" max="2" step="0.1" value={params.speed || 1} onChange={(event) => onParamsChange({ ...params, speed: Number(event.target.value) })} /><div className="range-labels"><span>Slow</span><span>Fast</span></div></div>
            {controls.map((control) => {
              const value = params[control.key] ?? control.value;
              const displayValue = control.options?.find((option) => Number(option.value) === Number(value))?.label || value;
              const subtraction = Number(params.operation ?? 0) === 1;
              const max = control.key === 'operandB' && subtraction ? Number(params.operandA ?? 7) : control.max;
              const changeControl = (nextValue) => {
                const next = { ...params, [control.key]: nextValue };
                if (control.key === 'operation' && nextValue === 1) next.operandB = Math.min(Number(params.operandB ?? 5), Number(params.operandA ?? 7));
                if (control.key === 'operandA' && subtraction) next.operandB = Math.min(Number(params.operandB ?? 5), nextValue);
                onParamsChange(next);
              };
              return <label className="property-label range-property" key={control.key}><span>{control.label} <b>{displayValue} {control.unit}</b></span>{control.options ? <select className="control-select" value={value} onChange={(event) => changeControl(Number(event.target.value))}>{control.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <><input type="range" min={control.min} max={max} step={control.step} value={Math.min(value, max)} onChange={(event) => changeControl(Number(event.target.value))} /><div className="range-labels"><span>{control.min} {control.unit}</span><span>{max} {control.unit}</span></div></>}</label>;
            })}
            <div className="render-info"><span><Check size={13} /> {storyAnimation ? 'Story art in the studio and PPTX' : 'Animated in the studio and PPTX'}</span><p>{slide.simulation?.assumption || 'This model is illustrative. Review it against the cited chapter pages.'}</p></div>
          </> : <div className="empty-animation"><div><Sparkles size={19} /></div><strong>No chapter simulation</strong><p>Custom simulations are generated by the local model from an uploaded chapter PDF.</p></div>}
        </>}
        {tab === 'Notes' && <>
          <div className="notes-tip"><span><Sparkles size={14} /></span><p>Teacher notes travel with your slides when you export the PowerPoint.</p></div>
          <label className="property-label">Presenter notes<textarea className="notes-editor" rows="9" value={slide.notes || ''} onChange={(event) => onUpdate('notes', event.target.value)} placeholder="Add teaching prompts or context for this slide…" /></label>
          <div className="note-reference"><FileText size={14} /><span>Source page <strong>{slide.sourcePage || 'Not set'}</strong></span></div>
        </>}
      </div>
      <div className="inspector-footer"><span className="footer-dot" /><span>Edits sync to your workspace</span><button title="More options"><MoreHorizontal size={16} /></button></div>
    </aside>
  );
}

function UploadDialog({ onClose, onBuild, onSyllabusSaved }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState('lesson');
  const [error, setError] = useState('');
  const [syllabi, setSyllabi] = useState([]);
  const [localCorpus, setLocalCorpus] = useState(null);
  const [deletingSyllabus, setDeletingSyllabus] = useState('');
  const [generationStatus, setGenerationStatus] = useState(null);
  const [checkingGenerationStatus, setCheckingGenerationStatus] = useState(true);
  const [board, setBoard] = useState('CBSE');
  const [grade, setGrade] = useState('');
  const [subject, setSubject] = useState('');
  const [language, setLanguage] = useState('English');

  useEffect(() => {
    let active = true;
    api.generationStatus()
      .then((status) => { if (active) setGenerationStatus(status); })
      .catch(() => { if (active) setGenerationStatus({ configured: false, unavailable: true }); })
      .finally(() => { if (active) setCheckingGenerationStatus(false); });
    api.syllabi().then((result) => {
      if (active) {
        setSyllabi(result.items || []);
        setLocalCorpus(result.localCorpus || null);
      }
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const loadFile = (pickedFile) => {
    if (!pickedFile) return;
    if (pickedFile.type !== 'application/pdf' && !pickedFile.name.toLowerCase().endsWith('.pdf')) {
      setError('Choose a PDF file to continue.'); return;
    }
    if (pickedFile.size > 50 * 1024 * 1024) {
      setError('This file is larger than 50 MB. Choose a smaller chapter PDF.'); return;
    }
    setFile(pickedFile); setError('');
  };
  const handleDrop = (event) => { event.preventDefault(); loadFile(event.dataTransfer.files?.[0]); };
  const submit = async () => {
    if (!file || !grade || !subject || (mode === 'lesson' && !generationStatus?.configured)) return;
    setSubmitting(true); setError('');
    try {
      if (mode === 'syllabus') {
        const saved = await onSyllabusSaved({ file, board, grade, subject });
        setSyllabi((items) => [saved, ...items.filter((item) => item.id !== saved.id)]);
      } else {
        await onBuild({ file, board, grade, subject, language });
      }
      onClose();
    }
    catch (exception) { setError(exception.message || 'We could not upload this PDF. Please try again.'); }
    finally { setSubmitting(false); }
  };

  const removeSyllabus = async (id) => {
    setDeletingSyllabus(id);
    try { await api.deleteSyllabus(id); setSyllabi((items) => items.filter((item) => item.id !== id)); }
    catch (exception) { setError(exception.message || 'Could not remove this syllabus reference.'); }
    finally { setDeletingSyllabus(''); }
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    if (nextMode === 'lesson') {
      if (board === 'All boards') setBoard('CBSE');
      if (grade === 'All classes') setGrade('');
      if (subject === 'All subjects') setSubject('');
    }
  };
  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="new-lesson-dialog" role="dialog" aria-modal="true" aria-labelledby="new-lesson-title">
        <div className="dialog-head"><div className="dialog-icon"><UploadCloud size={18} /></div><button className="dialog-close" onClick={onClose} aria-label="Close dialog" disabled={submitting}><X size={18} /></button><div className="dialog-eyebrow">LOCAL MODEL · NO API KEY</div><h2 id="new-lesson-title">{mode === 'lesson' ? 'Create a new lesson' : 'Add a syllabus reference'}</h2><p>{mode === 'lesson' ? 'Upload a chapter PDF and set the classroom context.' : 'Save syllabus pages so matching chapter lessons can follow their class scope and vocabulary.'}</p></div>
        <div className="dialog-content">
          <div className="upload-mode-tabs" role="tablist" aria-label="PDF purpose">
            <button type="button" role="tab" aria-selected={mode === 'lesson'} className={mode === 'lesson' ? 'selected' : ''} onClick={() => switchMode('lesson')}>Create lesson</button>
            <button type="button" role="tab" aria-selected={mode === 'syllabus'} className={mode === 'syllabus' ? 'selected' : ''} onClick={() => switchMode('syllabus')}>Add syllabus</button>
          </div>
          <div className={`dropzone ${file ? 'has-file' : ''}`} onDragOver={(event) => event.preventDefault()} onDrop={handleDrop} onClick={() => !file && inputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && inputRef.current?.click()}>
            <input ref={inputRef} type="file" accept="application/pdf,.pdf" hidden onChange={(event) => loadFile(event.target.files?.[0])} />
            {file ? <><div className="file-icon"><FileText size={19} /></div><div className="uploaded-file"><strong>{file.name}</strong><span>{Math.max(1, Math.round(file.size / 1024))} KB · ready to upload</span></div><button className="remove-file" aria-label="Remove file" onClick={(event) => { event.stopPropagation(); setFile(null); setError(''); if (inputRef.current) inputRef.current.value = ''; }}><X size={15} /></button></> : <><div className="upload-circle"><UploadCloud size={20} /></div><strong>Drop your {mode === 'lesson' ? 'chapter' : 'syllabus'} PDF here</strong><span>or <em>browse files</em> · up to 50 MB</span><small>PDF · Text extraction and OCR run locally</small></>}
          </div>
          {error && <div className="upload-message error"><CircleHelp size={14} /><span>{error}</span></div>}
          {mode === 'lesson' && !checkingGenerationStatus && generationStatus?.configured === false && <div className="upload-message warning"><CircleHelp size={14} /><span>{generationStatus.unavailable ? 'The local model is unreachable. Start the platform with Docker Compose and wait for the first model download to finish.' : 'The local model is still starting. Wait for its download to finish before creating a lesson.'}</span></div>}
          {mode === 'lesson' && checkingGenerationStatus && <div className="upload-message"><span className="spinner" /><span>Checking the local model…</span></div>}
          <div className="context-grid">
            <label>Board<select value={board} onChange={(event) => setBoard(event.target.value)}>{(mode === 'syllabus' ? [...BOARDS, 'All boards'] : BOARDS).map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Class<select value={grade} onChange={(event) => setGrade(event.target.value)}><option value="">Select class</option>{(mode === 'syllabus' ? [...GRADES, 'All classes'] : GRADES).map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Subject<select value={subject} onChange={(event) => setSubject(event.target.value)}><option value="">Select subject</option>{(mode === 'syllabus' ? [...SUBJECTS, 'All subjects'] : SUBJECTS).map((value) => <option key={value}>{value}</option>)}</select></label>
            {mode === 'lesson' && <label>Language<select value={language} onChange={(event) => setLanguage(event.target.value)}>{LANGUAGES.map((value) => <option key={value} value={value} disabled={value === 'Hindi'}>{value === 'Hindi' ? 'Hindi · coming soon' : value}</option>)}</select></label>}
          </div>
          {mode === 'lesson' && <p className="subject-guidance">The local model uses the chapter and any matching syllabus references. Verified simulations and source-linked illustrations cite the PDF; when a simulation cannot be verified, the lesson keeps a detailed explanation from the cited chapter pages.</p>}
          {mode === 'syllabus' && <><p className="subject-guidance">Your syllabus references and the built-in local curriculum library are retrieved as context for matching lessons. This grounds generation; it does not retrain the model weights.</p>{localCorpus?.documents > 0 && <p className="subject-guidance">Built-in NCERT library: {localCorpus.documents} PDFs · {localCorpus.classes.join(', ')} · {localCorpus.subjects.join(', ')}.</p>}<div className="syllabus-reference-list"><strong>Saved references</strong>{syllabi.length ? syllabi.map((item) => <div className="syllabus-reference-item" key={item.id}><span><b>{item.sourceName}</b><small>{item.board} · {item.grade} · {item.subject} · {item.pages} pages</small></span><button type="button" onClick={() => removeSyllabus(item.id)} disabled={deletingSyllabus === item.id} aria-label={`Remove ${item.sourceName}`}>{deletingSyllabus === item.id ? <span className="spinner" /> : <Trash2 size={13} />}</button></div>) : <span className="syllabus-empty">No syllabus references saved yet.</span>}</div></>}
          <div className="privacy-note"><span className="privacy-lock">✓</span><span>{mode === 'lesson' ? 'The chapter PDF and matching syllabus text are processed by the local model service in your Docker platform; no hosted model API key is used.' : 'The original syllabus PDF and extracted pages are saved in this private workspace for lesson generation.'}</span></div>
        </div>
        <div className="dialog-footer"><button className="text-button" onClick={onClose}>Cancel</button><button className="dialog-submit" disabled={!file || !grade || !subject || submitting || (mode === 'lesson' && (checkingGenerationStatus || !generationStatus?.configured))} onClick={submit}>{submitting ? <span className="spinner" /> : <Sparkles size={15} />} {submitting ? 'Uploading…' : mode === 'lesson' ? 'Build lesson' : 'Save syllabus'} <ArrowRight size={15} /></button></div>
      </div>
    </div>
  );
}

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('register');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('My classroom');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result = mode === 'register'
        ? await api.signUp({ email, password, displayName, workspaceName })
        : await api.signIn(email, password);
      setAccessToken(result.accessToken);
      onAuthenticated(result.user);
    } catch (exception) {
      setError(exception.status === 0 ? 'Cannot connect to Classroom Studio. Start the platform services and try again.' : exception.message);
    } finally { setBusy(false); }
  };
  return (
    <main className="auth-screen">
      <section className="auth-card">
        <div className="auth-brand"><span className="brand-mark"><BookOpen size={18} /></span><span>classroom<span className="brand-light">studio</span></span></div>
        <div className="dialog-eyebrow">TEACHING WORKSPACE</div>
        <h1>{mode === 'register' ? 'Set up your classroom' : 'Welcome back'}</h1>
        <p className="auth-lede">Create lessons from your chapter material and keep your classroom work in one secure workspace.</p>
        <form onSubmit={submit}>
          {mode === 'register' && <>
            <label>Your name<input required maxLength="120" autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Parthivi Jain" /></label>
            <label>Workspace name<input required maxLength="160" value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} placeholder="My classroom" /></label>
          </>}
          <label>Email address<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@school.edu" /></label>
          <label>Password<input required type="password" minLength="12" maxLength="256" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === 'register' ? 'At least 12 characters' : 'Your password'} /></label>
          {error && <div className="auth-error"><CircleHelp size={15} />{error}</div>}
          <button className="auth-submit" disabled={busy}>{busy ? <span className="spinner" /> : null}{mode === 'register' ? 'Create workspace' : 'Sign in'} <ArrowRight size={15} /></button>
        </form>
        <div className="auth-switch">{mode === 'register' ? 'Already have an account?' : 'New to Classroom Studio?'} <button onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setError(''); }}> {mode === 'register' ? 'Sign in' : 'Create an account'}</button></div>
        <div className="auth-footnote"><span className="privacy-lock">✓</span>Private workspace · Secure session · Teacher review built in</div>
      </section>
    </main>
  );
}

function PresentMode({ lesson, sourceImages, activeIndex, setActiveIndex, onClose, progress, playing, onPlayingChange, onProgressChange, params, onParamsChange }) {
  const slide = lesson.slides[activeIndex];
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') setActiveIndex((index) => Math.min(lesson.slides.length - 1, index + 1));
      if (event.key === 'ArrowLeft') setActiveIndex((index) => Math.max(0, index - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lesson.slides.length, setActiveIndex, onClose]);
  return (
    <div className="present-overlay">
      <div className="present-top"><span><Presentation size={15} /> Presenter view <i>·</i> {lesson.title}</span><button onClick={onClose}><X size={15} /> Exit presentation <kbd>ESC</kbd></button></div>
      <div className="present-stage"><StageSlide slide={slide} lesson={lesson} sourceImages={sourceImages} progress={progress} playing={playing} params={params} onPlayingChange={onPlayingChange} onProgressChange={onProgressChange} onParamsChange={onParamsChange} /></div>
      <button className="present-arrow previous" disabled={activeIndex === 0} onClick={() => setActiveIndex((index) => Math.max(index - 1, 0))}><ChevronLeft size={22} /></button>
      <button className="present-arrow next" disabled={activeIndex === lesson.slides.length - 1} onClick={() => setActiveIndex((index) => Math.min(index + 1, lesson.slides.length - 1))}><ChevronRight size={22} /></button>
      <div className="present-counter">{String(activeIndex + 1).padStart(2, '0')} / {String(lesson.slides.length).padStart(2, '0')}</div>
    </div>
  );
}

function HelpDialog({ onClose, lesson, lessonId, activeIndex, onSendFeedback }) {
  const [category, setCategory] = useState('accuracy');
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setSending(true); setMessage('');
    try {
      await onSendFeedback({ lessonId, lessonTitle: lesson.title, slideIndex: activeIndex, category, details });
      setSent(true); setDetails('');
    } catch (error) { setMessage(error.message || 'Feedback could not be sent. Try again.'); }
    finally { setSending(false); }
  };
  return <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="help-dialog"><button className="dialog-close" onClick={onClose}><X size={18} /></button><div className="dialog-icon help-dialog-icon"><CircleHelp size={18} /></div><div className="dialog-eyebrow">QUICK GUIDE</div><h2>From chapter to classroom</h2><div className="help-steps"><div><span>01</span><p><strong>Bring a chapter</strong>Upload a text-based PDF or open the sample lesson.</p></div><div><span>02</span><p><strong>Shape the lesson</strong>Edit slide copy, add teacher notes, and explore the subject model.</p></div><div><span>03</span><p><strong>Teach or export</strong>Present from the studio or download an animated PowerPoint.</p></div></div><form className="feedback-form" onSubmit={submit}><div className="dialog-eyebrow">REPORT A LESSON ISSUE</div><p>Send a note about <strong>{lesson.title}</strong>, slide {activeIndex + 1}. Reports are saved for quality review.</p><label>Issue type<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="accuracy">Accuracy or wording</option><option value="source">Source reference</option><option value="simulation">Simulation</option><option value="other">Other</option></select></label><label>What should we review?<textarea rows="3" required maxLength="2000" value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Describe what looks wrong or could be improved…" /></label>{message && <div className="auth-error"><CircleHelp size={14} />{message}</div>}{sent && <div className="feedback-success"><Check size={14} /> Feedback saved for review.</div>}<button className="dialog-submit feedback-submit" disabled={sending || !details.trim()}>{sending ? <span className="spinner" /> : <ArrowRight size={14} />}{sent ? 'Send another report' : sending ? 'Sending…' : 'Send feedback'}</button></form><button className="dialog-submit help-ok" onClick={onClose}>Done <Check size={15} /></button></div></div>;
}

function LibraryDialog({ currentLesson, activeLessonId, recentLessons, presentationJobs, onClose, onSelect, onPresent, onDownload }) {
  const lessons = [{ id: activeLessonId, lesson: currentLesson }, ...recentLessons.filter((entry) => entry.id !== activeLessonId)];
  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="library-dialog" role="dialog" aria-modal="true" aria-labelledby="library-title">
        <button className="dialog-close" onClick={onClose} aria-label="Close library"><X size={18} /></button>
        <div className="dialog-icon"><Layers2 size={18} /></div><div className="dialog-eyebrow">YOUR WORKSPACE</div><h2 id="library-title">My lessons</h2><p className="library-description">Your saved workspace lessons and sample lessons.</p>
        <div className="library-list">{lessons.map(({ id, lesson: item }, index) => {
          const isSaved = !id.startsWith('sample-');
          const exportJob = presentationJobs[id];
          const exportReady = exportJob?.state === 'succeeded';
          const exportPending = ['queued', 'processing', 'retrying'].includes(exportJob?.state);
          return <div className={`library-entry ${id === activeLessonId ? 'current' : ''}`} key={`${id}-${index}`}>
            <button className={`library-card ${id === activeLessonId ? 'current' : ''}`} onClick={() => onSelect(id)}>
              <span className={`library-card-mark ${item.subject === 'Biology' ? 'biology-mark' : item.subject === 'Mathematics' ? 'math-mark' : ''}`}><BookOpen size={16} /></span>
              <span className="library-card-copy"><strong>{item.title}</strong><small>{item.grade} · {item.subject} · {item.pages} pages</small></span>
              {id === activeLessonId ? <span className="current-label">OPEN</span> : <ChevronRight size={15} className="library-chevron" />}
            </button>
            <div className="library-presentation-row">
              <span className="library-presentation-label"><Presentation size={13} /><span>PowerPoint</span><small>{!isSaved ? 'Sample lesson' : exportReady ? 'Ready in workspace' : exportPending ? 'Preparing…' : exportJob?.state === 'failed' ? 'Export failed' : 'Not exported yet'}</small></span>
              <div className="library-presentation-actions">
                <button type="button" onClick={() => onPresent(id)}>Present</button>
                {exportReady && <button type="button" onClick={() => onDownload(exportJob.id, item)}>Download PPTX</button>}
              </div>
            </div>
          </div>;
        })}</div>
        <div className="library-footer"><span>Edits to saved lessons sync to your workspace.</span><button className="dialog-submit" onClick={onClose}>Done <Check size={14} /></button></div>
      </div>
    </div>
  );
}

function CurriculumDialog({ lesson, onClose }) {
  const alignment = lesson.curriculumAlignment;
  const candidates = alignment?.matchedOutcomes || [];
  const coverage = lesson.chapterCoverage || {};
  const slidePageNumbers = new Set(lesson.slides.flatMap((slide) => slide.sourcePages?.length ? slide.sourcePages : slide.sourcePage ? [slide.sourcePage] : []));
  const mappedPages = coverage.representedReadablePages ?? slidePageNumbers.size;
  const readablePages = coverage.readablePages ?? lesson.pages;
  const providerLabel = lesson.generationProvider === 'ollama' ? 'Local Ollama model' : lesson.generationProvider === 'mixed' ? 'Local model with source-based fallbacks' : lesson.generationProvider === 'extractive' ? 'Fast source-based draft' : 'Sample lesson';
  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="curriculum-dialog" role="dialog" aria-modal="true" aria-labelledby="curriculum-title">
        <button className="dialog-close" onClick={onClose} aria-label="Close curriculum details"><X size={18} /></button>
        <div className="dialog-icon"><GraduationCap size={18} /></div><div className="dialog-eyebrow">LESSON CONTEXT</div><h2 id="curriculum-title">Curriculum review</h2>
        <p className="library-description">Check which source pages were readable and represented in the lesson before you teach it.</p>
        <div className="curriculum-context"><div><small>BOARD</small><strong>{lesson.board}</strong></div><div><small>CLASS</small><strong>{lesson.grade}</strong></div><div><small>SUBJECT</small><strong>{lesson.subject}</strong></div></div>
        <div className="curriculum-source"><span><FileText size={15} /> Pages with readable text</span><strong>{readablePages} / {coverage.totalPages ?? lesson.pages}</strong></div>
        <div className="curriculum-source"><span><ClipboardList size={15} /> Readable pages cited in slides</span><strong>{mappedPages} / {readablePages}</strong></div>
        <div className="generation-method"><small>DRAFT METHOD</small><strong>{providerLabel}</strong><span>{coverage.sectionCount ?? lesson.slides.length} chapter sections · {coverage.simulationCount ?? lesson.slides.filter((slide) => slide.type === 'animation').length} simulations</span></div>
        {lesson.generationWarnings?.map((warning, index) => <div className="generation-warning" key={`${warning}-${index}`}><CircleHelp size={14} /><span>{warning}</span></div>)}
        <div className="curriculum-warning"><CircleHelp size={15} /><p><strong>{candidates.length ? 'Possible curriculum matches · teacher review' : 'Official curriculum alignment is unverified'}</strong><span>{alignment?.reason || 'No licensed outcome source is loaded for this board, class and subject. Review against the current syllabus.'}</span></p></div>
        {candidates.length > 0 && <div className="curriculum-match-list">{candidates.slice(0, 5).map((candidate) => <div key={`${candidate.code}-${candidate.version}`}><span><strong>{candidate.code}</strong>{candidate.title}</span><small>{Math.round(candidate.confidence * 100)}% text match</small></div>)}</div>}
        <button className="dialog-submit curriculum-done" onClick={onClose}>Return to lesson <ArrowRight size={14} /></button>
      </div>
    </div>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [lesson, setLesson] = useState(demoLesson);
  const [sourceImages, setSourceImages] = useState([]);
  const [recentLessons, setRecentLessons] = useState(sampleLessons);
  const [activeLessonId, setActiveLessonId] = useState(sampleLessons[0].id);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dialog, setDialog] = useState(null);
  const [inspectorTab, setInspectorTab] = useState('Content');
  const [simulationParams, setSimulationParams] = useState({ mass: 2, speed: 1 });
  const [simulationProgress, setSimulationProgress] = useState(0.12);
  const [playing, setPlaying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState('');
  const [syncLabel, setSyncLabel] = useState('Saved to workspace');
  const [jobStatus, setJobStatus] = useState(null);
  const [retryingLesson, setRetryingLesson] = useState(false);
  const [presentationJobs, setPresentationJobs] = useState({});
  const activeSlide = lesson.slides[activeIndex] || lesson.slides[0];

  useEffect(() => {
    if (!activeLessonId || activeLessonId.startsWith('sample-')) {
      setSourceImages([]);
      return undefined;
    }
    let cancelled = false;
    setSourceImages([]);
    api.sourceImages(activeLessonId)
      .then(({ items = [] }) => { if (!cancelled) setSourceImages(items); })
      .catch(() => { if (!cancelled) setSourceImages([]); });
    return () => { cancelled = true; };
  }, [activeLessonId]);

  const downloadPowerPoint = async (jobId, exportLesson) => {
    const blob = await api.downloadExport(jobId);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${(exportLesson.title || 'classroom-lesson').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'classroom-lesson'}.pptx`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    const reviewNote = exportLesson.generationWarnings?.length ? ' Some sections need review in Curriculum review.' : '';
    setNotice(`Animated PowerPoint downloaded from your workspace.${reviewNote}`);
  };

  const loadWorkspaceLessons = async () => {
    const response = await api.lessons();
    let items = response.items || [];
    const unrefreshedMath = items.find((item) => item.status === 'ready' && item.content
      && normalizeSubject(item.subject) === 'mathematics'
      && Number(item.content.simulationVersion || 0) < 1);
    if (unrefreshedMath) {
      try {
        const refreshed = await api.lesson(unrefreshedMath.id);
        items = items.map((item) => item.id === unrefreshedMath.id ? { ...item, content: refreshed.content, updatedAt: refreshed.updatedAt } : item);
      } catch { /* Keep the local lesson list available if source-based refresh is unavailable. */ }
    }
    const latestReady = items.find((item) => item.status === 'ready' && item.content);
    const upgradeLatestStoryMaps = hasLegacyStoryMaps(latestReady?.content);
    const upgradeLatestAnimations = needsStoryAnimationUpgrade(latestReady?.content);
    const upgradeLatestSimulationExport = Number(latestReady?.content?.simulationVersion || 0) > Number(latestReady?.content?.exportedSimulationVersion || 0);
    const upgradeLatestChapterDetailExport = Number(latestReady?.content?.chapterDetailVersion || 0) > Number(latestReady?.content?.exportedChapterDetailVersion || 0);
    const saved = items.filter((item) => item.status === 'ready' && item.content).map((item) => ({
      id: item.id,
      lesson: upgradeStoryAnimationLayout(upgradeLegacyStoryMaps(item.content)),
    }));
    setRecentLessons([...saved, ...sampleLessons].slice(0, 12));
    void Promise.all(saved.map(async ({ id }) => {
      try {
        const { items: jobs = [] } = await api.lessonJobs(id);
        return [id, jobs.find((candidate) => candidate.kind === 'export') || null];
      } catch { return [id, null]; }
    })).then((entries) => setPresentationJobs(Object.fromEntries(entries.filter(([, job]) => job))));
    if (saved.length) {
      setLesson(saved[0].lesson);
      setActiveLessonId(saved[0].id);
    } else {
      setLesson(demoLesson);
      setActiveLessonId(sampleLessons[0].id);
    }
    const sourceKey = (item) => {
      const parts = [item.board, item.grade, item.subject, item.sourceName].map((part) => String(part || '').trim().toLowerCase());
      return parts.every(Boolean) ? parts.join('|') : null;
    };
    const readySourceDates = new Map(items
      .filter((item) => item.status === 'ready' && item.content)
      .map((item) => [sourceKey(item), Date.parse(item.updatedAt || item.createdAt || 0)])
      .filter(([key]) => key));
    const hasNewerReadyCopy = (item) => {
      const key = sourceKey(item);
      if (!key) return false;
      const readyAt = readySourceDates.get(key);
      const itemAt = Date.parse(item.updatedAt || item.createdAt || 0);
      return Number.isFinite(readyAt) && Number.isFinite(itemAt) && readyAt > itemAt;
    };
    const pending = items.filter((item) => ['queued', 'processing'].includes(item.status) && !hasNewerReadyCopy(item)).slice(0, 12);
    const failedLessons = items.filter((item) => item.status === 'failed' && !hasNewerReadyCopy(item)).slice(0, 8);
    void (async () => {
      try {
        const trackedLessons = [...pending, ...failedLessons];
        const jobLists = await Promise.all(trackedLessons.map((item) => api.lessonJobs(item.id)));
        const rows = trackedLessons.map((item, index) => ({ lesson: item, jobs: jobLists[index]?.items || [] }));
        const jobs = rows.flatMap(({ lesson: trackedLesson, jobs: lessonJobs }) => lessonJobs
          .filter((candidate) => candidate.kind === 'lesson')
          .map((candidate) => ({ ...candidate, lessonId: trackedLesson.id })));
        const activeJobs = jobs.filter((candidate) => ['queued', 'processing', 'retrying'].includes(candidate.state));
        const priority = { processing: 0, retrying: 1, queued: 2 };
        activeJobs.sort((left, right) => priority[left.state] - priority[right.state] || left.createdAt.localeCompare(right.createdAt));
        if (activeJobs[0]) void watchJob(activeJobs[0].id, 'lesson');
        else {
          const failed = jobs.find((candidate) => candidate.state === 'failed');
          if (failed) {
            setJobStatus({ ...failed, kind: 'lesson' });
            setNotice(failed.error || 'Lesson generation stopped. Retry this lesson to continue.');
          }
        }
      } catch { /* The workspace remains usable if an old job cannot be resumed. */ }
    })();
    if (saved[0] && pending.length === 0 && failedLessons.length === 0) {
      const latestReadyLesson = saved[0];
      void (async () => {
        try {
          if (upgradeLatestStoryMaps || upgradeLatestAnimations) await api.saveLesson(latestReadyLesson.id, latestReadyLesson.lesson);
          const { items: jobs = [] } = await api.lessonJobs(latestReadyLesson.id);
          let exportJob = jobs.find((candidate) => candidate.kind === 'export');
          if (upgradeLatestStoryMaps || upgradeLatestAnimations || upgradeLatestSimulationExport || upgradeLatestChapterDetailExport || !exportJob || exportJob.state === 'failed') {
            exportJob = await api.createExport(latestReadyLesson.id, { mass: 2, speed: 1 });
          }
          if (['queued', 'processing', 'retrying'].includes(exportJob.state)) {
            setJobStatus({ id: exportJob.id, kind: 'export', state: exportJob.state, stage: exportJob.stage, progress: exportJob.progress });
            setNotice('Your lesson is ready. Rendering its animated PowerPoint…');
            void watchJob(exportJob.id, 'export', latestReadyLesson.lesson);
          } else if (exportJob.state === 'succeeded') {
            setJobStatus({ id: exportJob.id, kind: 'export', state: 'succeeded', stage: 'complete', progress: 100 });
            setNotice('Your animated PowerPoint is ready. Choose Export PPTX to download it.');
          }
        } catch { /* The lesson remains available if export recovery is temporarily unavailable. */ }
      })();
    }
  };

  useEffect(() => {
    let cancelled = false;
    api.restoreSession().then(async () => {
      const user = await api.request('/auth/me');
      if (cancelled) return;
      setCurrentUser(user);
      try { await loadWorkspaceLessons(); }
      catch (error) { setNotice(error.message || 'Workspace is ready, but lessons could not be loaded yet.'); }
    }).catch(() => { setAccessToken(null); setCurrentUser(null); }).finally(() => { if (!cancelled) setAuthLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const finishAuthentication = async (user) => {
    setCurrentUser(user);
    setAuthLoading(false);
    try { await loadWorkspaceLessons(); }
    catch (error) { setNotice(error.message || 'Workspace is ready, but lessons could not be loaded yet.'); }
  };

  const handleSignOut = async () => {
    try { await api.signOut(); }
    finally {
      setCurrentUser(null);
      setAuthLoading(false);
      setRecentLessons(sampleLessons);
      setLesson(demoLesson);
      setActiveLessonId(sampleLessons[0].id);
      setPresentationJobs({});
    }
  };

  const sendFeedback = async (payload) => {
    await api.sendFeedback(payload);
    setNotice('Thanks. Your feedback was saved for review.');
  };

  useEffect(() => {
    if (!currentUser || !activeLessonId || activeLessonId.startsWith('sample-')) return undefined;
    const timeout = window.setTimeout(async () => {
      setSyncLabel('Saving…');
      try { await api.saveLesson(activeLessonId, lesson); setSyncLabel('Saved to workspace'); }
      catch (error) { setSyncLabel('Save failed'); setNotice(error.message || 'Could not save this lesson.'); }
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [currentUser, activeLessonId, lesson]);

  const updateLesson = (updater) => {
    setUndoStack((history) => [...history, lesson].slice(-40));
    setRedoStack([]);
    setLesson((current) => typeof updater === 'function' ? updater(current) : updater);
  };

  const undo = () => {
    if (!undoStack.length) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack((history) => [lesson, ...history].slice(0, 40));
    setUndoStack((history) => history.slice(0, -1));
    setLesson(previous);
    setActiveIndex((index) => Math.min(index, previous.slides.length - 1));
  };

  const redo = () => {
    if (!redoStack.length) return;
    const next = redoStack[0];
    setUndoStack((history) => [...history, lesson].slice(-40));
    setRedoStack((history) => history.slice(1));
    setLesson(next);
    setActiveIndex((index) => Math.min(index, next.slides.length - 1));
  };

  useEffect(() => {
    if (activeSlide?.type === 'animation') {
      setPlaying(true);
      setInspectorTab('Animate');
      const defaults = Object.fromEntries((activeSlide.simulation?.controls || []).map((control) => [control.key, control.value]));
      setSimulationParams((current) => ({ ...defaults, speed: current.speed || 1 }));
    }
    else setPlaying(false);
  }, [activeIndex, activeSlide?.type, activeSlide?.scene]);

  useEffect(() => {
    if (!notice || jobStatus?.state === 'failed' || ['queued', 'processing', 'retrying'].includes(jobStatus?.state)) return undefined;
    const timeout = window.setTimeout(() => setNotice(''), 3200);
    return () => window.clearTimeout(timeout);
  }, [notice, jobStatus?.state]);

  const watchJob = async (jobId, kind, exportLesson = lesson) => {
    try {
      let consecutiveStatusErrors = 0;
      for (let attempt = 0; attempt < 3600; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 1500));
        let job;
        try {
          job = await api.job(jobId);
          consecutiveStatusErrors = 0;
        } catch (error) {
          consecutiveStatusErrors += 1;
          if (consecutiveStatusErrors >= 10) {
            setJobStatus((current) => current?.id === jobId ? { ...current, stage: 'reconnecting to the local worker' } : current);
            setNotice('The connection was interrupted. The job may still be running; refresh the page to reconnect.');
            return;
          }
          continue;
        }
        setJobStatus({ id: job.id, lessonId: job.lessonId, kind, state: job.state, stage: job.stage, progress: job.progress });
        if (kind === 'export' && job.lessonId) setPresentationJobs((current) => ({ ...current, [job.lessonId]: job }));
        if (job.state === 'succeeded') {
          if (kind === 'lesson') {
            const saved = await api.lesson(job.lessonId);
            if (saved.content) {
              const legacyStoryMaps = hasLegacyStoryMaps(saved.content);
              const legacyStoryAnimation = needsStoryAnimationUpgrade(saved.content);
              const lessonContent = upgradeStoryAnimationLayout(upgradeLegacyStoryMaps(saved.content));
              if (legacyStoryMaps || legacyStoryAnimation) await api.saveLesson(saved.id, lessonContent);
              setRecentLessons((items) => [{ id: saved.id, lesson: lessonContent }, ...items.filter((item) => item.id !== saved.id)].slice(0, 12));
              setLesson(lessonContent);
              setActiveLessonId(saved.id);
              setUndoStack([]); setRedoStack([]); setActiveIndex(0);
              setSimulationParams({ mass: 2, speed: 1 }); setSimulationProgress(0.08);
              const coverage = saved.content.chapterCoverage;
              const coverageMessage = coverage
                ? `Lesson ready: ${coverage.representedReadablePages}/${coverage.readablePages} readable chapter pages mapped to slides, with ${coverage.simulationCount} simulations${saved.content.generationWarnings?.length ? '. Some content needs review; open Curriculum map for details.' : '.'}`
                : 'Your lesson draft is ready. Review it against the source chapter.';
              setNotice(saved.content.generationProvider === 'extractive'
                ? `${coverageMessage} Some sections used source-text fallbacks because the local model response could not be verified.`
                : coverageMessage);
              try {
                const { items: existingJobs = [] } = await api.lessonJobs(saved.id);
                const existingExport = existingJobs.find((candidate) => candidate.kind === 'export' && candidate.state !== 'failed');
                const simulationExportStale = Number(saved.content.simulationVersion || 0) > Number(saved.content.exportedSimulationVersion || 0);
                const chapterDetailExportStale = Number(lessonContent.chapterDetailVersion || 0) > Number(lessonContent.exportedChapterDetailVersion || 0);
                const refreshExport = legacyStoryMaps || legacyStoryAnimation || simulationExportStale || chapterDetailExportStale;
                const exportJob = (!refreshExport && existingExport) || await api.createExport(saved.id, { mass: 2, speed: 1 });
                if (exportJob.state === 'succeeded') {
                  setJobStatus({ id: exportJob.id, kind: 'export', state: 'succeeded', stage: 'complete', progress: 100 });
                  setNotice('Lesson and animated PowerPoint are ready in your workspace. Download the PPTX whenever you need it.');
                } else {
                  setJobStatus({ id: exportJob.id, kind: 'export', state: exportJob.state, stage: exportJob.stage, progress: exportJob.progress });
                  setNotice('Lesson ready. Rendering its animated PowerPoint in your workspace…');
                  void watchJob(exportJob.id, 'export', lessonContent);
                }
              } catch (error) {
                setJobStatus(null);
                setNotice(`Lesson ready, but the PowerPoint could not be queued: ${error.message || 'try Export PPTX.'}`);
              }
              return;
            }
          } else {
            setJobStatus({ id: job.id, kind: 'export', state: 'succeeded', stage: 'complete', progress: 100 });
            setNotice('Animated PowerPoint ready in your workspace. Use Download PPTX whenever you need the file.');
          }
          return;
        }
        if (job.state === 'failed') {
          setJobStatus({ id: job.id, lessonId: job.lessonId, kind, state: 'failed', stage: job.stage, progress: job.progress, error: job.error });
          setNotice(job.error || 'This job failed. Please try again.');
          return;
        }
        if (job.state === 'cancelled') {
          setJobStatus({ id: job.id, kind, state: 'cancelled', stage: job.stage, progress: job.progress, error: job.error });
          setNotice(job.error || 'This duplicate upload was skipped. The completed lesson is available in My lessons.');
          return;
        }
      }
      setNotice('This job is still running. You can keep working; its status will remain visible here.');
    } catch (error) {
      setNotice(error.message || 'We lost the connection while checking this job.');
    }
  };

  const retryFailedLesson = async () => {
    if (!jobStatus?.lessonId || retryingLesson) return;
    setRetryingLesson(true);
    try {
      const job = await api.retryLesson(jobStatus.lessonId);
      setJobStatus({ ...job, kind: 'lesson' });
      setNotice('Retrying lesson generation with the updated local pipeline…');
      void watchJob(job.id, 'lesson', lesson);
    } catch (error) {
      setNotice(error.message || 'The lesson could not be restarted. Try uploading the chapter again.');
    } finally {
      setRetryingLesson(false);
    }
  };

  const updateSlide = (field, value) => {
    updateLesson((current) => ({
      ...current,
      slides: current.slides.map((slide, index) => {
        if (index !== activeIndex) return slide;
        const updated = { ...slide, [field]: value };
        if (field === 'sourcePage' && slide.sourcePages) updated.sourcePages = value ? [value] : [];
        return updated;
      }),
    }));
  };

  const setTitle = (title) => updateLesson((current) => ({ ...current, title }));

  const openRecentLesson = (id) => {
    if (id === activeLessonId) { setDialog(null); return; }
    const next = recentLessons.find((entry) => entry.id === id);
    if (!next) return;
    const selectedLesson = upgradeStoryAnimationLayout(upgradeLegacyStoryMaps(next.lesson));
    setRecentLessons((current) => [{ id: activeLessonId, lesson }, ...current.filter((entry) => entry.id !== activeLessonId && entry.id !== id)].slice(0, 8));
    setLesson(selectedLesson);
    setActiveLessonId(id);
    setUndoStack([]);
    setRedoStack([]);
    setActiveIndex(0);
    setSimulationParams({ mass: 2, speed: 1 });
    setJobStatus(null);
    setDialog(null);
    if (!id.startsWith('sample-')
      && Number(selectedLesson.chapterDetailVersion || 0) > Number(selectedLesson.exportedChapterDetailVersion || 0)) {
      setNotice('Updating this lesson with its chapter details and refreshing the PowerPoint…');
      void (async () => {
        try {
          await api.saveLesson(id, selectedLesson);
          const exportJob = await api.createExport(id, { mass: 2, speed: 1 });
          setPresentationJobs((current) => ({ ...current, [id]: exportJob }));
          setJobStatus({ id: exportJob.id, lessonId: id, kind: 'export', state: exportJob.state, stage: exportJob.stage, progress: exportJob.progress });
          if (exportJob.state === 'succeeded') {
            setNotice('Chapter details are saved and the refreshed PowerPoint is ready.');
          } else {
            void watchJob(exportJob.id, 'export', selectedLesson);
          }
        } catch (error) {
          setNotice('Chapter details are shown, but the saved PowerPoint could not be refreshed: ' + (error.message || 'try Export PPTX.'));
        }
      })();
    }
  };

  const presentRecentLesson = (id) => {
    if (id !== activeLessonId) openRecentLesson(id);
    setDialog('present');
  };

  const addSlide = (requestedIndex = activeIndex + 1) => {
    const next = { type: 'concept', eyebrow: 'NEW IDEA', title: 'Add a key idea', body: 'Write a short explanation to guide the class through this concept.', formula: '', detail: 'Add an example or teaching prompt.', notes: '', sourcePage: null };
    const insertAt = Math.max(0, Math.min(lesson.slides.length, Number(requestedIndex)));
    updateLesson((current) => ({ ...current, slides: [...current.slides.slice(0, insertAt), next, ...current.slides.slice(insertAt)] }));
    setActiveIndex(insertAt);
    setInspectorTab('Content');
  };

  const moveSlide = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= lesson.slides.length || fromIndex === toIndex) return;
    updateLesson((current) => {
      const slides = [...current.slides];
      const [moved] = slides.splice(fromIndex, 1);
      slides.splice(toIndex, 0, moved);
      return { ...current, slides };
    });
    setActiveIndex(toIndex);
  };

  const deleteSlide = () => {
    if (lesson.slides.length <= 1) return;
    updateLesson((current) => ({ ...current, slides: current.slides.filter((_, index) => index !== activeIndex) }));
    setActiveIndex((index) => Math.max(0, index - 1));
  };

  const buildFromPdf = async ({ file, board, grade, subject, language }) => {
    const result = await api.uploadLesson({ file, board, grade, subject, language });
    setJobStatus({ id: result.job.id, kind: 'lesson', state: 'queued', stage: 'queued', progress: 0 });
    setNotice(result.deduplicated
      ? 'This exact PDF is already in your workspace. Reconnecting to its lesson and presentation…'
      : 'PDF uploaded. Your lesson and animated PowerPoint are being prepared.');
    void watchJob(result.job.id, 'lesson');
  };

  const saveSyllabus = async ({ file, board, grade, subject }) => {
    const saved = await api.uploadSyllabus({ file, board, grade, subject });
    setNotice(`Saved ${saved.sourceName} as a syllabus reference. Matching lessons will use relevant pages as local generation context.`);
    return saved;
  };

  const handleExport = async () => {
    setExporting(true);
    setNotice('Preparing the animated PowerPoint…');
    try {
      if (activeLessonId.startsWith('sample-')) {
        const { exportLessonPptx } = await import('./lib/exportPptx.js');
        await exportLessonPptx(lesson, { params: simulationParams });
        setNotice('PowerPoint downloaded with the lesson animation embedded.');
      } else {
        const job = await api.createExport(activeLessonId, simulationParams);
        setPresentationJobs((current) => ({ ...current, [activeLessonId]: job }));
        setJobStatus({ id: job.id, kind: 'export', state: 'queued', stage: 'queued', progress: 0 });
        void watchJob(job.id, 'export');
      }
    } catch (error) {
      console.error(error);
      setNotice(error.message || 'Export did not finish. Please try again.');
    } finally { setExporting(false); }
  };

  const navPrevious = () => setActiveIndex((index) => Math.max(0, index - 1));
  const navNext = () => setActiveIndex((index) => Math.min(lesson.slides.length - 1, index + 1));

  if (authLoading) return <main className="auth-screen"><div className="auth-loading"><span className="spinner" /> Connecting to your workspace…</div></main>;
  if (!currentUser) return <AuthScreen onAuthenticated={finishAuthentication} />;

  return (
    <div className="app-shell">
      <Sidebar onNewLesson={() => setDialog('new')} onOpenHelp={() => setDialog('help')} onOpenLibrary={() => setDialog('library')} onOpenCurriculum={() => setDialog('curriculum')} onOpenSimulations={() => setDialog('simulations')} recentLessons={recentLessons} activeLessonId={activeLessonId} currentLesson={lesson} onSelectRecent={openRecentLesson} currentUser={currentUser} onSignOut={handleSignOut} />
      <main className="main-panel">
        <AppHeader onNewLesson={() => setDialog('new')} onOpenSimulations={() => setDialog('simulations')} onExport={handleExport} onPresent={() => setDialog('present')} onUndo={undo} onRedo={redo} canUndo={undoStack.length > 0} canRedo={redoStack.length > 0} exporting={exporting || (jobStatus?.kind === 'export' && ['queued', 'processing', 'retrying'].includes(jobStatus.state))} syncLabel={activeLessonId.startsWith('sample-') ? 'Sample · edits are temporary' : jobStatus?.state === 'failed' ? 'Lesson generation failed' : jobStatus?.kind === 'export' && jobStatus.state === 'succeeded' ? 'PowerPoint ready' : jobStatus ? `${jobStatus.kind === 'lesson' ? 'Creating lesson' : 'Rendering PPTX'} · ${jobStatus.progress}%` : syncLabel} />
        <div className="workspace-body">
          <section className="lesson-header-row"><LessonHeading lesson={lesson} onEditTitle={setTitle} /><button className="coverage-chip" onClick={() => setDialog('curriculum')}><span className="coverage-arc"><FileText size={14} /></span><span><small>CHAPTER COVERAGE</small><strong>{lesson.chapterCoverage ? `${lesson.chapterCoverage.representedReadablePages}/${lesson.chapterCoverage.readablePages} readable pages mapped` : `${lesson.pages} source pages`}</strong></span><ChevronDown size={13} /></button></section>
          {jobStatus && ['queued', 'processing', 'retrying'].includes(jobStatus.state) && <div className="job-progress-card" role="status" aria-live="polite">
            <span className="job-progress-icon"><Sparkles size={16} /></span>
            <span className="job-progress-copy"><strong>{jobStatus.kind === 'lesson' ? 'Creating your lesson' : 'Preparing the animated PowerPoint'}</strong><small>{jobStatus.state === 'queued' ? 'Waiting for the local worker' : jobStatus.stage === 'rendering' || jobStatus.stage === 'storing' ? 'Rendering and saving your PowerPoint' : 'Writing slides with the local model on this computer'}</small></span>
            <span className="job-progress-value">{jobStatus.progress || 0}%</span>
            <span className="job-progress-track"><i style={{ width: `${Math.max(3, jobStatus.progress || 0)}%` }} /></span>
          </div>}
          {jobStatus?.kind === 'lesson' && jobStatus.state === 'failed' && jobStatus.lessonId && <div className="job-progress-card job-progress-failed" role="status" aria-live="polite">
            <span className="job-progress-icon"><CircleHelp size={16} /></span>
            <span className="job-progress-copy"><strong>Lesson generation stopped</strong><small>{jobStatus.error || 'The local model stopped before the lesson was ready.'}</small></span>
            <button className="job-progress-download" onClick={retryFailedLesson} disabled={retryingLesson}>{retryingLesson ? 'Retrying…' : 'Retry lesson'}</button>
          </div>}
          {jobStatus?.kind === 'export' && jobStatus.state === 'succeeded' && <div className="job-progress-card job-progress-complete" role="status" aria-live="polite">
            <span className="job-progress-icon"><Check size={16} /></span>
            <span className="job-progress-copy"><strong>Animated PowerPoint ready</strong><small>Your presentation is saved in the workspace. Download it whenever you need it.</small></span>
            <button className="job-progress-download" onClick={() => downloadPowerPoint(jobStatus.id, lesson).catch((error) => setNotice(error.message || 'The saved PowerPoint could not be downloaded.'))}>Download PPTX</button>
          </div>}
          <div className="editor-bar"><div className="editor-bar-left"><span className="editor-mode"><span className="editor-mode-dot" /> Editing lesson</span><span className="editor-bar-divider" /><span className="source-chip"><FileText size={13} /> {lesson.pages} pages</span><span className="editor-bar-divider" /><span className="review-hint"><Sparkles size={13} /> Chapter-based draft · Review claims before teaching</span></div><div className="editor-bar-right"><IconButton title="Undo" onClick={undo} disabled={!undoStack.length}><ArrowLeft size={15} /></IconButton><IconButton title="Redo" onClick={redo} disabled={!redoStack.length}><ArrowRight size={15} /></IconButton><span className="editor-bar-divider" /><button className="share-button" onClick={() => { navigator.clipboard?.writeText(window.location.href); setNotice('Studio URL copied. Lesson sharing is not enabled yet.'); }}><span>Copy link</span></button></div></div>
          <div className="editor-grid">
            <SlideRail slides={lesson.slides} lesson={lesson} activeIndex={activeIndex} onSelect={setActiveIndex} onAdd={addSlide} onDelete={deleteSlide} onMove={moveSlide} />
            <section className="canvas-column">
              <CanvasToolbar activeIndex={activeIndex} total={lesson.slides.length} onPrevious={navPrevious} onNext={navNext} onPresent={() => setDialog('present')} />
              <div className="stage-wrap"><StageSlide slide={activeSlide} lesson={lesson} sourceImages={sourceImages} progress={simulationProgress} playing={playing && !dialog} params={simulationParams} onPlayingChange={setPlaying} onProgressChange={setSimulationProgress} onParamsChange={setSimulationParams} /></div>
              <div className="stage-caption"><span><span className="caption-status-dot" />{activeSlide.type === 'animation' ? activeSlide.simulation?.visual?.story ? 'Story animation' : 'Model ready' : 'Slide ready'}</span><span className="caption-center"><kbd>←</kbd><kbd>→</kbd> to move between slides</span><span>{sourcePageLabel(activeSlide) ? `Source · ${sourcePageLabel(activeSlide).toLowerCase()}` : 'No source reference'}</span></div>
            </section>
            <Inspector slide={activeSlide} activeIndex={activeIndex} lesson={lesson} onUpdate={updateSlide} params={simulationParams} onParamsChange={(next) => {
              setSimulationParams(next);
              if (activeSlide?.simulation?.model === 'storybook' && Number.isFinite(Number(next.stage))) setPlaying(false);
            }} tab={inspectorTab} setTab={setInspectorTab} />
          </div>
        </div>
      </main>
      {dialog === 'new' && <UploadDialog onClose={() => setDialog(null)} onBuild={buildFromPdf} onSyllabusSaved={saveSyllabus} />}
      {dialog === 'help' && <HelpDialog onClose={() => setDialog(null)} lesson={lesson} lessonId={activeLessonId.startsWith('sample-') ? null : activeLessonId} activeIndex={activeIndex} onSendFeedback={sendFeedback} />}
      {dialog === 'library' && <LibraryDialog currentLesson={lesson} activeLessonId={activeLessonId} recentLessons={recentLessons} presentationJobs={presentationJobs} onClose={() => setDialog(null)} onSelect={openRecentLesson} onPresent={presentRecentLesson} onDownload={(jobId, item) => downloadPowerPoint(jobId, item).catch((error) => setNotice(error.message || 'The saved PowerPoint could not be downloaded.'))} />}
      {dialog === 'curriculum' && <CurriculumDialog lesson={lesson} onClose={() => setDialog(null)} />}
      {dialog === 'present' && <PresentMode lesson={lesson} sourceImages={sourceImages} activeIndex={activeIndex} setActiveIndex={setActiveIndex} onClose={() => setDialog(null)} progress={simulationProgress} playing={playing} onPlayingChange={setPlaying} onProgressChange={setSimulationProgress} params={simulationParams} onParamsChange={setSimulationParams} />}
      {dialog === 'simulations' && <SimulationLab onClose={() => setDialog(null)} />}
      {notice && <div className={`toast-message ${jobStatus?.state === 'failed' ? 'error' : ''}`} role={jobStatus?.state === 'failed' ? 'alert' : 'status'}><span className="toast-indicator">{jobStatus?.state === 'failed' ? <CircleHelp size={13} /> : <Check size={12} />}</span><span>{notice}</span>{jobStatus?.state === 'failed' && <button className="toast-dismiss" aria-label="Dismiss error" onClick={() => { setNotice(''); setJobStatus(null); }}><X size={14} /></button>}</div>}
    </div>
  );
}
