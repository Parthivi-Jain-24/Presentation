import PptxGenJS from 'pptxgenjs';
import gifenc from 'gifenc';
import { renderSimulationFrame } from './simulation.js';
import { addEditableDiagram } from './pptxDiagram.js';
import { getSubjectTheme } from './subjectTheme.js';

const { GIFEncoder, applyPalette, quantize } = gifenc;

const COLORS = {
  ink: '18333C',
  muted: '60757A',
  paper: 'F5F6F2',
  green: '477E70',
  paleGreen: 'E5EEE9',
  gold: 'E9B878',
  dark: '10283A',
};

const textOptions = {
  fontFace: 'Aptos',
  color: COLORS.ink,
  breakLine: false,
  margin: 0,
  valign: 'mid',
};

const SCENES = new Set(['math', 'math_graph', 'math_balance', 'math_arithmetic', 'math_place_value', 'physics', 'physics_motion', 'physics_distance_graph', 'physics_wave', 'physics_circuit', 'chemistry', 'chemistry_particles', 'chemistry_reaction', 'biology', 'biology_cell', 'biology_cycle', 'english', 'social', 'social_timeline', 'robotics', 'storybook']);
const simulationGifCache = new Map();
const simulationGifCacheLimit = 24;

function sourcePageLabel(item) {
  const pages = item.sourcePages?.length ? item.sourcePages : item.sourcePage ? [item.sourcePage] : [];
  if (!pages.length) return '';
  return pages.length === 1 ? `PAGE ${pages[0]}` : `PAGES ${pages.join(', ')}`;
}

function dataUrlFromGif(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return `data:image/gif;base64,${btoa(binary)}`;
}

export function createSimulationGif(scene, params = {}, simulation = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 576;
  canvas.height = 324;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const gif = GIFEncoder();
  const frameCount = 12;
  let palette = null;
  for (let frame = 0; frame < frameCount; frame += 1) {
    renderSimulationFrame(context, canvas.width, canvas.height, scene, (frame / frameCount) * 5, params, simulation, { animateControl: true });
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    if (!palette) palette = quantize(data, 128, { format: 'rgb565' });
    const indexed = applyPalette(data, palette, 'rgb565');
    gif.writeFrame(indexed, canvas.width, canvas.height, frame === 0
      ? { palette, delay: 200, repeat: 0 }
      : { delay: 200 });
  }
  gif.finish();
  return dataUrlFromGif(gif.bytes());
}

function cachedSimulationGif(key, scene, params, simulation) {
  const cached = simulationGifCache.get(key);
  if (cached) {
    simulationGifCache.delete(key);
    simulationGifCache.set(key, cached);
    return cached;
  }
  const gif = createSimulationGif(scene, params, simulation);
  simulationGifCache.set(key, gif);
  if (simulationGifCache.size > simulationGifCacheLimit) simulationGifCache.delete(simulationGifCache.keys().next().value);
  return gif;
}

function addHeader(slide, item, index, total, colors = COLORS) {
  const accents = [colors.teal, colors.coral, colors.purple, colors.green, colors.gold];
  const accent = accents[index % accents.length];
  slide.background = { color: colors.paper };
  slide.addText(item.eyebrow || 'LESSON', {
    ...textOptions, x: 0.76, y: 0.58, w: 8.5, h: 0.25,
    fontSize: 10, bold: true, charSpacing: 1.7, color: accent,
  });
  slide.addText(item.title || 'Lesson slide', {
    ...textOptions, x: 0.76, y: 0.96, w: 11.3, h: 0.72,
    fontSize: item.title?.length > 40 ? 27 : 31, bold: true, breakLine: false, color: colors.ink,
  });
  slide.addText('🧑‍🏫', { x: 12.15, y: 0.55, w: 0.42, h: 0.38, fontFace: 'Segoe UI Emoji', fontSize: 20, align: 'center', valign: 'mid', margin: 0 });
  slide.addShape('line', {
    x: 0.76, y: 1.83, w: 11.8, h: 0,
    line: { color: colors.line, width: 1 },
  });
  slide.addShape('line', {
    x: 0.76, y: 1.83, w: 0.82, h: 0,
    line: { color: accent, width: 3 },
  });
  slide.addText(`${index + 1} / ${total}`, {
    ...textOptions, x: 11.8, y: 7.0, w: 0.78, h: 0.2,
    fontSize: 9, color: colors.muted, align: 'right',
  });
}

function addBulletRows(slide, bullets = [], colors = COLORS) {
  bullets.slice(0, 5).forEach((text, index) => {
    const y = 2.2 + index * 0.78;
    slide.addShape('ellipse', {
      x: 1.02, y: y + 0.13, w: 0.15, h: 0.15,
      line: { color: colors.green, transparency: 100 },
      fill: { color: colors.green },
    });
    slide.addText(text, {
      ...textOptions, x: 1.38, y, w: 10.55, h: 0.48,
      fontSize: 20, color: colors.ink, breakLine: false,
    });
  });
}

export async function exportLessonPptx(lesson, options = {}) {
  const COLORS = getSubjectTheme(lesson.subject);
  const biologyLesson = String(lesson.subject || '').toLowerCase().includes('biolog') || String(lesson.subject || '').toLowerCase() === 'evs';
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Classroom Studio';
  pptx.subject = `${lesson.grade} ${lesson.subject} lesson`;
  pptx.title = lesson.title;
  pptx.company = 'Classroom Studio';
  pptx.lang = lesson.language || 'en-US';
  pptx.theme = {
    headFontFace: 'Aptos Display',
    bodyFontFace: 'Aptos',
    lang: 'en-US',
  };
  const animationGifs = new Map();
  lesson.slides.filter((item) => item.type === 'animation').forEach((item) => {
    const scene = item.simulation?.model === 'storybook' ? 'storybook'
      : item.simulation?.model === 'math_arithmetic' ? 'math_arithmetic'
      : item.simulation?.model === 'math_place_value' ? 'math_place_value'
        : item.simulation?.model === 'generated' && item.simulation?.visual
          ? 'generated' : SCENES.has(item.scene) ? item.scene : 'physics';
    const initial = Object.fromEntries((item.simulation?.controls || []).map((control) => [control.key, control.value]));
    const params = { ...initial, ...(options.params || {}) };
    const key = `${scene}:${JSON.stringify(params)}:${JSON.stringify(item.simulation || {})}`;
    if (!animationGifs.has(key)) animationGifs.set(key, cachedSimulationGif(key, scene, params, item.simulation || {}));
  });

  lesson.slides.forEach((item, index) => {
    const slide = pptx.addSlide();
    if (item.type === 'cover') {
      slide.background = { color: biologyLesson ? COLORS.paper : COLORS.dark };
      slide.addText(item.eyebrow || `${lesson.grade} · ${lesson.subject}`, {
        ...textOptions, x: 0.8, y: 0.72, w: 8.8, h: 0.3,
        fontSize: 11, bold: true, charSpacing: 2, color: biologyLesson ? COLORS.teal : 'A5C8BD',
      });
      slide.addText(item.title, {
        ...textOptions, x: 0.8, y: 1.68, w: 10.4, h: 1.35,
        fontSize: 38, bold: true, color: biologyLesson ? COLORS.ink : 'F5F6F2', breakLine: false,
      });
      slide.addText(item.subtitle || '', {
        ...textOptions, x: 0.82, y: 3.25, w: 8.9, h: 0.92,
        fontSize: 20, color: biologyLesson ? COLORS.muted : 'C7D8D6', breakLine: false, valign: 'top',
      });
      slide.addShape('line', { x: 0.82, y: 5.98, w: 2.25, h: 0, line: { color: COLORS.gold, width: 3 } });
      slide.addText(`${lesson.board}   ·   ${lesson.grade}   ·   ${lesson.subject}`, {
        ...textOptions, x: 0.82, y: 6.24, w: 8, h: 0.28,
        fontSize: 12, color: biologyLesson ? COLORS.muted : 'A8C0C1', charSpacing: 0.5,
      });
    } else {
      addHeader(slide, item, index, lesson.slides.length, COLORS);
      if (item.type === 'outcomes' || item.type === 'recap' || item.type === 'summary') {
        addBulletRows(slide, item.bullets, COLORS);
      } else if (item.type === 'animation') {
        const scene = item.simulation?.model === 'storybook' ? 'storybook'
          : item.simulation?.model === 'math_arithmetic' ? 'math_arithmetic'
          : item.simulation?.model === 'math_place_value' ? 'math_place_value'
            : item.simulation?.model === 'generated' && item.simulation?.visual
              ? 'generated' : SCENES.has(item.scene) ? item.scene : 'physics';
        const initial = Object.fromEntries((item.simulation?.controls || []).map((control) => [control.key, control.value]));
        const animatedGif = animationGifs.get(`${scene}:${JSON.stringify({ ...initial, ...(options.params || {}) })}:${JSON.stringify(item.simulation || {})}`);
        if (animatedGif) {
          slide.addImage({ data: animatedGif, x: 0.8, y: 2.0, w: 8.8, h: 4.95 });
        }
        const storyScene = Boolean(item.simulation?.visual?.story);
        slide.addText(storyScene ? 'FOLLOW THE STORY' : 'KEY IDEA', {
          ...textOptions, x: 9.85, y: 2.42, w: 2.65, h: 0.24,
          fontSize: 9, bold: true, charSpacing: 1.2, color: COLORS.green,
        });
        slide.addText(String(item.formula || item.simulation?.principle || 'Explore the relationship').slice(0, 100), {
          ...textOptions, x: 9.85, y: 2.83, w: 2.65, h: 1.0,
          fontSize: 18, bold: true, color: COLORS.green, valign: 'top', fit: 'shrink',
        });
        slide.addShape('line', { x: 9.85, y: 4.02, w: 2.65, h: 0, line: { color: 'D8E1DC', width: 1 } });
        slide.addText(storyScene ? 'TELL IT BACK' : 'PAUSE & PREDICT', {
          ...textOptions, x: 9.85, y: 4.29, w: 2.65, h: 0.24,
          fontSize: 9, bold: true, charSpacing: 1.0, color: COLORS.muted,
        });
        slide.addText(String(item.detail || (storyScene ? 'What happened in each beat? Explain how the idea changed.' : 'What changes as the model runs?')).slice(0, 160), {
          ...textOptions, x: 9.85, y: 4.67, w: 2.65, h: 1.1,
          fontSize: 14, color: COLORS.ink, valign: 'top', fit: 'shrink',
        });
        slide.addText(storyScene ? 'Watch the three illustrated beats.' : 'Follow the highlighted beats inside the animation.', {
          ...textOptions, x: 9.85, y: 6.0, w: 2.65, h: 0.5,
          fontSize: 10, color: COLORS.muted, valign: 'top', fit: 'shrink',
        });
      } else if (item.type === 'worked') {
        slide.addText(item.question || '', {
          ...textOptions, x: 0.92, y: 2.26, w: 10.9, h: 0.9,
          fontSize: 24, bold: true, color: COLORS.ink, valign: 'top',
        });
        slide.addShape('roundRect', {
          x: 0.92, y: 3.64, w: 11.35, h: 1.32, rectRadius: 0.12,
          line: { color: 'D2E1DA', transparency: 100 },
          fill: { color: COLORS.paleGreen },
        });
        slide.addText(item.answer || '', {
          ...textOptions, x: 1.25, y: 3.96, w: 10.7, h: 0.58,
          fontSize: 23, bold: true, color: COLORS.green,
        });
        slide.addText(item.detail || '', {
          ...textOptions, x: 0.98, y: 5.43, w: 10.9, h: 0.68,
          fontSize: 16, color: COLORS.muted, valign: 'top',
        });
      } else if (item.diagram && !['compare', 'process'].includes(item.layout)) {
        slide.addText(String(item.body || '').slice(0, 700), { ...textOptions, x: 0.9, y: 2.2, w: 4.75, h: 1.05, fontSize: 21, color: COLORS.ink, valign: 'top', fit: 'shrink' });
        if (item.formula) {
          slide.addShape('roundRect', { x: 0.9, y: 3.6, w: 4.75, h: 0.72, line: { color: 'D6E4DD', transparency: 100 }, fill: { color: COLORS.paleGreen } });
          slide.addText(String(item.formula).slice(0, 260), { ...textOptions, x: 1.15, y: 3.78, w: 4.25, h: 0.33, fontSize: 18, bold: true, color: COLORS.green, fit: 'shrink' });
        }
        slide.addText(String(item.detail || '').slice(0, 500), { ...textOptions, x: 0.93, y: 4.58, w: 4.65, h: 0.8, fontSize: 14, color: COLORS.muted, valign: 'top', fit: 'shrink' });
        addEditableDiagram(slide, item.diagram, { left: 6.0, top: 2.13, width: 6.1, height: 3.8 });
      } else if (item.layout === 'compare') {
        slide.addText(item.body || '', { ...textOptions, x: 0.9, y: 2.1, w: 11.1, h: 0.68, fontSize: 17, color: COLORS.muted, valign: 'top', fit: 'shrink' });
        slide.addShape('line', { x: 6.65, y: 3.05, w: 0, h: 2.6, line: { color: 'D6E2DB', width: 1 } });
        slide.addText(item.leftTitle || 'First idea', { ...textOptions, x: 1.0, y: 3.14, w: 5.1, h: 0.38, fontSize: 17, bold: true, color: COLORS.green });
        slide.addText(item.leftBody || item.body || '', { ...textOptions, x: 1.0, y: 3.7, w: 5.1, h: 1.68, fontSize: 18, color: COLORS.ink, valign: 'top', fit: 'shrink' });
        slide.addText(item.rightTitle || 'Contrasting idea', { ...textOptions, x: 7.05, y: 3.14, w: 5.0, h: 0.38, fontSize: 17, bold: true, color: COLORS.green });
        slide.addText(item.rightBody || item.detail || '', { ...textOptions, x: 7.05, y: 3.7, w: 5.0, h: 1.68, fontSize: 18, color: COLORS.ink, valign: 'top', fit: 'shrink' });
        slide.addText(item.detail || '', { ...textOptions, x: 1.0, y: 5.75, w: 10.9, h: 0.56, fontSize: 14, color: COLORS.muted, valign: 'top', fit: 'shrink' });
      } else if (item.layout === 'process') {
        const steps = (item.bullets || [item.body, item.detail]).filter(Boolean).slice(0, 5);
        slide.addText(item.body || '', { ...textOptions, x: 0.9, y: 2.08, w: 11.1, h: 0.65, fontSize: 17, color: COLORS.muted, valign: 'top', fit: 'shrink' });
        if (item.diagram) addEditableDiagram(slide, item.diagram, { left: 0.92, top: 2.87, width: 11.35, height: 2.55, orientation: 'row' });
        else steps.forEach((step, index) => {
          const y = 2.95 + index * 0.66;
          slide.addText(String(index + 1).padStart(2, '0'), { ...textOptions, x: 1.02, y, w: 0.55, h: 0.42, fontSize: 16, bold: true, color: COLORS.gold });
          slide.addText(step, { ...textOptions, x: 1.72, y, w: 10.1, h: 0.48, fontSize: 18, color: COLORS.ink, fit: 'shrink' });
          if (index < steps.length - 1) slide.addShape('line', { x: 1.27, y: y + 0.39, w: 0, h: 0.3, line: { color: 'D7E1DA', width: 1 } });
        });
      } else if (item.layout === 'definition' || item.layout === 'evidence') {
        slide.addShape('line', { x: 0.96, y: 2.28, w: 0, h: 3.5, line: { color: item.layout === 'definition' ? COLORS.gold : COLORS.green, width: 3 } });
        slide.addText(item.layout === 'definition' ? `KEY TERM · ${item.term || item.title}` : 'CHAPTER EVIDENCE', { ...textOptions, x: 1.27, y: 2.25, w: 9.8, h: 0.28, fontSize: 11, bold: true, charSpacing: 1, color: COLORS.green });
        slide.addText(item.body || '', { ...textOptions, x: 1.27, y: 2.78, w: 10.4, h: 1.52, fontSize: 23, bold: item.layout === 'definition', color: COLORS.ink, valign: 'top', fit: 'shrink' });
        if (item.formula) slide.addText(item.formula, { ...textOptions, x: 1.27, y: 4.52, w: 9.9, h: 0.46, fontSize: 20, bold: true, color: COLORS.green, fit: 'shrink' });
        slide.addText(item.detail || '', { ...textOptions, x: 1.27, y: 5.25, w: 10.5, h: 0.7, fontSize: 15, color: COLORS.muted, valign: 'top', fit: 'shrink' });
      } else {
        slide.addText(item.body || '', {
          ...textOptions, x: 0.9, y: 2.22, w: 11.1, h: 0.9,
          fontSize: 23, color: COLORS.ink, valign: 'top',
        });
        if (item.formula) {
          slide.addShape('roundRect', {
            x: 0.9, y: 3.55, w: 7.15, h: 0.82,
            line: { color: 'D6E4DD', transparency: 100 },
            fill: { color: COLORS.paleGreen },
          });
          slide.addText(item.formula, {
            ...textOptions, x: 1.17, y: 3.77, w: 6.6, h: 0.33,
            fontSize: 21, bold: true, color: COLORS.green,
          });
        }
        slide.addText(item.detail || '', {
          ...textOptions, x: 0.93, y: 4.83, w: 10.8, h: 0.72,
          fontSize: 16, color: COLORS.muted, valign: 'top',
        });
      }
    }
    if (sourcePageLabel(item)) {
      slide.addText(`SOURCE · ${lesson.source || lesson.title} · ${sourcePageLabel(item)}`, {
        ...textOptions, x: 0.78, y: 7.0, w: 8, h: 0.18,
        fontSize: 8, color: '829397', charSpacing: 0.45,
      });
    }
    if (typeof slide.addNotes === 'function') {
      const note = [item.notes || '', sourcePageLabel(item) ? `Source reference: ${lesson.source || lesson.title}, ${sourcePageLabel(item).toLowerCase()}.` : 'No chapter page reference is attached to this slide.'].filter(Boolean).join('\n');
      slide.addNotes(note);
    }
  });

  const fileBase = (lesson.title || 'lesson').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'lesson';
  await pptx.writeFile({ fileName: `${fileBase}-lesson.pptx` });
}
