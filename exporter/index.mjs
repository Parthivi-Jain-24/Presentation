import http from 'node:http';
import { createHash } from 'node:crypto';
import PptxGenJS from 'pptxgenjs';
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import gifenc from 'gifenc';
import { renderSimulationFrame } from '../src/lib/simulation.js';
import { addEditableDiagram } from '../src/lib/pptxDiagram.js';
import { getSubjectTheme } from '../src/lib/subjectTheme.js';

const { GIFEncoder, applyPalette, quantize } = gifenc;
const animationCache = new Map();
const animationCacheLimit = 24;

GlobalFonts.registerFromPath('/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf', 'Arial');
GlobalFonts.registerFromPath('/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf', 'Arial');
GlobalFonts.registerFromPath('/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf', 'Inter');
GlobalFonts.registerFromPath('/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf', 'Inter');
GlobalFonts.registerFromPath('/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf', 'Noto Color Emoji');
GlobalFonts.registerFromPath('/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf', 'Segoe UI Emoji');
GlobalFonts.registerFromPath('/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf', 'Apple Color Emoji');

const port = Number(process.env.PORT || 8082);
const maxBodyBytes = 5 * 1024 * 1024;
const SCENES = new Set(['math', 'math_graph', 'math_balance', 'math_arithmetic', 'math_place_value', 'math_groups', 'math_sharing', 'physics', 'physics_motion', 'physics_distance_graph', 'physics_wave', 'physics_circuit', 'chemistry', 'chemistry_particles', 'chemistry_reaction', 'biology', 'biology_cell', 'biology_cycle', 'english', 'social', 'social_timeline', 'robotics', 'storybook']);
const COLORS = {
  ink: '142C38', muted: '5D7377', paper: 'FAF6EE', white: 'FFFFFF',
  green: '6E9F77', teal: '2D7A73', mint: 'E4F0E8', coral: 'E37562',
  gold: 'E6B965', rose: 'F5E2DC', blue: 'E7EFF1', line: 'D7E0DA',
  purple: '706893', lavender: 'EDEAF4', dark: '10283A', pale: 'F7F4EC',
};
const textOptions = { fontFace: 'Arial', color: COLORS.ink, margin: 0, valign: 'mid', breakLine: false };

function sourcePageLabel(item) {
  const pages = item.sourcePages?.length ? item.sourcePages : item.sourcePage ? [item.sourcePage] : [];
  if (!pages.length) return '';
  return pages.length === 1 ? `PAGE ${pages[0]}` : `PAGES ${pages.join(', ')}`;
}

async function makeGif(scene, params = {}, simulation = {}, sourcePhoto = null) {
  const canvas = createCanvas(576, 324);
  const context = canvas.getContext('2d');
  const gif = GIFEncoder();
  const frames = 12;
  let sourceFigureImage = null;
  if (simulation?.visual?.style === 'source_figure' && sourcePhoto?.data) {
    try {
      sourceFigureImage = await loadImage(Buffer.from(String(sourcePhoto.data).split(',').at(-1), 'base64'));
    } catch { sourceFigureImage = null; }
  }
  let palette;
  for (let frame = 0; frame < frames; frame += 1) {
    // Include the completed state in the GIF before it loops back to frame zero.
    const sampleTime = (frame / (frames - 1)) * 4.999;
    renderSimulationFrame(context, canvas.width, canvas.height, scene, sampleTime, params, simulation,
      { animateControl: true, sourceFigureImage, sourceFigurePage: sourcePhoto?.pages?.[0], sourceFigureCaption: sourcePhoto?.caption });
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    if (!palette) palette = quantize(pixels, 128, { format: 'rgb565' });
    gif.writeFrame(applyPalette(pixels, palette, 'rgb565'), canvas.width, canvas.height,
      frame === 0 ? { palette, delay: 200, repeat: 0 } : { delay: 200 });
  }
  gif.finish();
  return Buffer.from(gif.bytes());
}

function gifKey(scene, params, simulation, sourcePhoto) {
  const sourceKey = sourcePhoto?.data ? createHash('sha1').update(sourcePhoto.data).digest('hex') : '';
  return `${scene}:${JSON.stringify(params)}:${JSON.stringify(simulation)}:${sourceKey}`;
}

async function cachedGif(scene, params, simulation, sourcePhoto = null) {
  const key = gifKey(scene, params, simulation, sourcePhoto);
  const cached = animationCache.get(key);
  if (cached) {
    animationCache.delete(key);
    animationCache.set(key, cached);
    return cached;
  }
  const gif = await makeGif(scene, params, simulation, sourcePhoto);
  animationCache.set(key, gif);
  if (animationCache.size > animationCacheLimit) animationCache.delete(animationCache.keys().next().value);
  return gif;
}

function addHeader(slide, item, index, total, colors = COLORS) {
  const accents = [colors.teal, colors.coral, colors.purple, colors.green, colors.gold];
  const accent = accents[index % accents.length];
  const surfaces = [colors.white, colors.paper, colors.rose, colors.lavender, colors.blue, colors.mint];
  slide.background = { color: surfaces[index % surfaces.length] };
  slide.addShape('rect', { x: 0, y: 0, w: 0.12, h: 7.5, line: { color: accent, transparency: 100 }, fill: { color: accent } });
  slide.addText(item.eyebrow || 'CHAPTER FIELD NOTES', { ...textOptions, x: 0.68, y: 0.35, w: 9.8, h: 0.23, fontSize: 10, bold: true, charSpacing: 1.65, color: accent });
  slide.addText(item.title || 'Lesson slide', { ...textOptions, x: 0.68, y: 0.72, w: 11.7, h: 0.72, fontSize: item.title?.length > 42 ? 28 : 34, bold: true, fit: 'shrink', valign: 'mid', color: colors.ink });
  slide.addShape('line', { x: 0.68, y: 1.62, w: 11.98, h: 0, line: { color: colors.line, width: 1 } });
  slide.addShape('line', { x: 0.68, y: 1.62, w: 0.82, h: 0, line: { color: accent, width: 3 } });
  slide.addShape('line', { x: 0.68, y: 7.04, w: 0.42, h: 0, line: { color: accent, width: 2 } });
  slide.addText(`${String(index + 1).padStart(2, '0')}  /  ${String(total).padStart(2, '0')}`, { ...textOptions, x: 11.56, y: 7.02, w: 1.1, h: 0.18, fontSize: 9, bold: true, color: colors.muted, align: 'right' });
}

function addBulletRows(slide, bullets = [], colors = COLORS) {
  bullets.slice(0, 6).forEach((text, index) => {
    const y = 2.05 + index * 0.77;
    slide.addShape('ellipse', { x: 0.92, y: y + 0.12, w: 0.14, h: 0.14, line: { color: index % 2 ? colors.gold : colors.coral, transparency: 100 }, fill: { color: index % 2 ? colors.gold : colors.coral } });
    slide.addText(String(text).slice(0, 800), { ...textOptions, x: 1.25, y, w: 10.7, h: 0.58, fontSize: 19, color: colors.ink, valign: 'top', fit: 'shrink' });
  });
}

function slideScene(item) {
  return item.simulation?.model === 'storybook' ? 'storybook'
    : item.simulation?.model === 'math_arithmetic' ? 'math_arithmetic'
    : item.simulation?.model === 'math_place_value' ? 'math_place_value'
    : item.simulation?.model === 'generated' && item.simulation?.visual
      ? 'generated' : SCENES.has(item.scene) ? item.scene : 'physics';
}

function slideGif(item, gifs, params = {}, sourceImages = []) {
  const scene = slideScene(item);
  const initial = Object.fromEntries((item.simulation?.controls || []).map((control) => [control.key, control.value]));
  const slideParams = { ...initial, ...params };
  const sourcePhoto = item.simulation?.visual?.style === 'source_figure' ? sourcePhotoFor(item, sourceImages) : null;
  return gifs.get(gifKey(scene, slideParams, item.simulation || {}, sourcePhoto));
}

function pageNumbers(item) {
  return item.sourcePages?.length ? item.sourcePages : item.sourcePage ? [item.sourcePage] : [];
}

function sourcePhotoFor(item, sourceImages = []) {
  const pages = pageNumbers(item).map(Number);
  const matches = sourceImages.filter((image) => (image.pages || []).some((page) => pages.includes(Number(page))));
  if (!matches.length) return null;
  const normalizeTerms = (text) => new Set((String(text || '').toLowerCase().match(/[a-z0-9]+/g) || []).filter((word) => word.length > 3)
    .map((word) => word.endsWith('s') ? word.slice(0, -1) : word));
  const titleTerms = normalizeTerms(item.title);
  const visualTerms = normalizeTerms(item.simulation?.visual?.title);
  const bodyTerms = normalizeTerms(`${item.body || ''} ${item.formula || ''} ${(item.sections || []).map((section) => `${section.heading || ''} ${section.body || ''} ${section.detail || ''}`).join(' ')}`);
  const score = (image) => [...normalizeTerms(image.caption)].reduce((total, word) => total
    + (titleTerms.has(word) ? 3 : 0) + (visualTerms.has(word) ? 2 : 0) + (bodyTerms.has(word) ? 1 : 0), 0);
  const ranked = [...matches].sort((left, right) => score(right) - score(left));
  return score(ranked[0]) > 0 ? ranked[0] : null;
}

function addSourcePhoto(slide, image, area, colors = COLORS, label = true) {
  const labelHeight = label ? 0.24 : 0;
  const imageHeight = area.h - labelHeight;
  slide.addShape('roundRect', { x: area.x, y: area.y, w: area.w, h: area.h, rectRadius: 0.12, line: { color: colors.line, width: 1 }, fill: { color: colors.white } });
  slide.addImage({ data: image.data, x: area.x + 0.06, y: area.y + 0.06, w: area.w - 0.12, h: imageHeight - 0.08,
    sizing: { type: 'contain', w: area.w - 0.12, h: imageHeight - 0.08 }, altText: `Cropped figure from source PDF, page ${image.pages?.[0] || ''}` });
  if (label) slide.addText(`TEXTBOOK FIGURE · PAGE ${image.pages?.[0] || ''}`, { ...textOptions, x: area.x + 0.12, y: area.y + area.h - 0.2, w: area.w - 0.24, h: 0.12, fontSize: 7.5, bold: true, charSpacing: 0.65, color: colors.teal });
}

function addAnimatedGif(slide, gif, area, padding = 0.12) {
  const maxW = area.w - padding * 2, maxH = area.h - padding * 2;
  const ratio = 16 / 9;
  let w = maxW, h = w / ratio;
  if (h > maxH) { h = maxH; w = h * ratio; }
  slide.addImage({ data: `image/gif;base64,${gif.toString('base64')}`,
    x: area.x + (area.w - w) / 2, y: area.y + (area.h - h) / 2, w, h });
}

function addSourceArtwork(slide, item, illustration, area = { x: 6.65, y: 1.98, w: 5.45, h: 4.55 }, colors = COLORS, sourcePhoto = null) {
  if (sourcePhoto) {
    addSourcePhoto(slide, sourcePhoto, area, colors);
    return;
  }
  slide.addShape('roundRect', { x: area.x, y: area.y, w: area.w, h: area.h, rectRadius: 0.14, line: { color: colors.line, width: 1 }, fill: { color: item.type === 'animation' ? colors.dark : colors.mint } });
  if (illustration) {
    addAnimatedGif(slide, illustration, area);
    return;
  }
  const detail = String(item.body || item.detail || item.formula || '').trim();
  const pageText = pageNumbers(item).length ? `PAGES ${pageNumbers(item).join(', ')}` : 'SOURCE DETAIL';
  slide.addShape('line', { x: area.x + 0.32, y: area.y + 0.44, w: 0, h: area.h - 1.02, line: { color: colors.coral, width: 3 } });
  slide.addText('CHAPTER EXPLANATION', { ...textOptions, x: area.x + 0.62, y: area.y + 0.42, w: area.w - 0.95, h: 0.22, fontSize: 10, bold: true, charSpacing: 1.1, color: colors.teal });
  slide.addText(detail.slice(0, 620), { ...textOptions, x: area.x + 0.62, y: area.y + 0.9, w: area.w - 0.98, h: area.h - 1.65, fontSize: 18, color: colors.ink, valign: 'top', fit: 'shrink' });
  slide.addText(pageText, { ...textOptions, x: area.x + 0.62, y: area.y + area.h - 0.53, w: area.w - 0.98, h: 0.18, fontSize: 9, bold: true, charSpacing: 0.7, color: colors.muted });
}

async function createPptx(lesson, params = {}) {
  const COLORS = getSubjectTheme(lesson?.subject);
  const biologyLesson = String(lesson?.subject || '').toLowerCase().includes('biolog') || String(lesson?.subject || '').toLowerCase() === 'evs';
  if (!lesson || !Array.isArray(lesson.slides) || lesson.slides.length < 1 || lesson.slides.length > 60) throw new Error('Invalid lesson slide list');
  if (lesson.slides.filter((slide) => slide.type === 'animation').length > 12) throw new Error('A deck can contain at most 12 animated slides');
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Classroom Studio';
  pptx.subject = `${lesson.grade || ''} ${lesson.subject || ''} lesson`;
  pptx.title = String(lesson.title || 'Classroom lesson').slice(0, 240);
  pptx.company = 'Classroom Studio';
  pptx.lang = lesson.language === 'Hindi' ? 'hi-IN' : 'en-US';
  pptx.theme = { headFontFace: 'Aptos Display', bodyFontFace: 'Aptos', lang: pptx.lang };

  const animations = lesson.slides.filter((slide) => slide.type === 'animation');
  const gifs = new Map();
  for (const item of animations) {
    const scene = slideScene(item);
    const initial = Object.fromEntries((item.simulation?.controls || []).map((control) => [control.key, control.value]));
    const slideParams = { ...initial, ...params };
    const sourcePhoto = item.simulation?.visual?.style === 'source_figure' ? sourcePhotoFor(item, lesson.sourceImages) : null;
    const key = gifKey(scene, slideParams, item.simulation || {}, sourcePhoto);
    if (!gifs.has(key)) gifs.set(key, await cachedGif(scene, slideParams, item.simulation || {}, sourcePhoto));
  }
  const coverArt = animations.find((item) => item.simulation?.visual?.story) || animations[0];
  const coverGif = coverArt ? slideGif(coverArt, gifs, params, lesson.sourceImages) : null;
  const coverPhoto = sourcePhotoFor(lesson.slides.find((item) => item.type === 'cover') || lesson.slides[0], lesson.sourceImages);
  const illustrationFor = (item) => {
    if (biologyLesson) return null;
    const pages = pageNumbers(item);
    if (!pages.length) return null;
    const match = animations.map((candidate) => ({
      candidate,
      score: pageNumbers(candidate).filter((page) => pages.includes(page)).length,
    })).sort((a, b) => b.score - a.score)[0];
    return match?.score ? slideGif(match.candidate, gifs, params, lesson.sourceImages) : null;
  };

  lesson.slides.forEach((item, index) => {
    const slide = pptx.addSlide();
    if (item.type === 'cover') {
      slide.background = { color: biologyLesson ? COLORS.paper : COLORS.dark };
      slide.addShape('ellipse', { x: 9.0, y: -1.2, w: 5.4, h: 5.4, line: { color: COLORS.teal, transparency: 48, width: 2 }, fill: { color: COLORS.teal, transparency: 82 } });
      slide.addShape('ellipse', { x: 10.15, y: 4.25, w: 3.9, h: 3.9, line: { color: COLORS.gold, transparency: 40, width: 2 }, fill: { color: COLORS.gold, transparency: 88 } });
      slide.addShape('line', { x: 0.72, y: 0.82, w: 0.55, h: 0, line: { color: COLORS.gold, width: 3 } });
      slide.addText(item.eyebrow || `${lesson.board || ''} · ${lesson.grade || ''} · ${lesson.subject || ''}`, { ...textOptions, x: 0.72, y: 1.05, w: 5.9, h: 0.28, fontSize: 11, bold: true, charSpacing: 1.7, color: biologyLesson ? COLORS.teal : 'B6D1C6' });
      slide.addText(String(item.title || lesson.title || '').slice(0, 240), { ...textOptions, x: 0.72, y: 1.68, w: 6.15, h: 2.0, fontSize: 43, bold: true, color: biologyLesson ? COLORS.ink : COLORS.white, valign: 'top', fit: 'shrink' });
      slide.addText(String(item.subtitle || '').slice(0, 520), { ...textOptions, x: 0.75, y: 3.95, w: 5.7, h: 1.0, fontSize: 19, color: biologyLesson ? COLORS.muted : 'D2E0DE', valign: 'top', fit: 'shrink' });
      if (coverPhoto) {
        addSourcePhoto(slide, coverPhoto, { x: 7.1, y: 1.15, w: 5.45, h: 4.9 }, COLORS);
      } else if (coverGif) {
        slide.addShape('roundRect', { x: 7.1, y: 0.88, w: 5.55, h: 5.68, rectRadius: 0.16, line: { color: '678A83', width: 1.2 }, fill: { color: '193847' } });
        slide.addText('CHAPTER PREVIEW', { ...textOptions, x: 7.42, y: 1.45, w: 4.9, h: 0.24, fontSize: 10, bold: true, charSpacing: 1.3, color: 'B6D1C6', align: 'center' });
        addAnimatedGif(slide, coverGif, { x: 7.22, y: 1.9, w: 5.31, h: 3.15 }, 0.03);
        slide.addText('NOTICE  ·  EXPLORE  ·  EXPLAIN', { ...textOptions, x: 7.42, y: 5.58, w: 4.9, h: 0.24, fontSize: 10, bold: true, charSpacing: 0.85, color: 'E6B965', align: 'center' });
      } else {
      addSourceArtwork(slide, item, null, { x: 7.1, y: 1.15, w: 5.45, h: 4.9 }, COLORS);
      }
      slide.addText('A VISUAL CHAPTER JOURNEY', { ...textOptions, x: 0.75, y: 6.25, w: 5.8, h: 0.23, fontSize: 10, bold: true, charSpacing: 1.5, color: biologyLesson ? COLORS.teal : 'A8C0C1' });
      slide.addText(`${lesson.board || ''}   ·   ${lesson.grade || ''}   ·   ${lesson.subject || ''}`, { ...textOptions, x: 0.75, y: 6.63, w: 5.9, h: 0.22, fontSize: 11, color: biologyLesson ? COLORS.muted : 'A8C0C1' });
    } else {
      addHeader(slide, item, index, lesson.slides.length, COLORS);
      const sourcePhoto = sourcePhotoFor(item, lesson.sourceImages);
      const art = illustrationFor(item);
      if (item.layout === 'chapter_detail') {
        const sections = (item.sections || []).slice(0, 3);
        const sourcePhoto = sourcePhotoFor(item, lesson.sourceImages);
        const textX = 0.88, textW = sourcePhoto ? 7.15 : 11.3;
        const top = 2.02, rowHeight = sections.length > 2 ? 1.38 : 1.92;
        sections.forEach((section, sectionIndex) => {
          const y = top + sectionIndex * rowHeight;
          const accent = [COLORS.teal, COLORS.coral, COLORS.purple][sectionIndex % 3];
          slide.addShape('line', { x: textX, y: y + 0.08, w: 0, h: rowHeight - 0.2, line: { color: accent, width: 2.5 } });
          slide.addText(String(section.heading || '').slice(0, 140), { ...textOptions, x: textX + 0.2, y, w: textW - 0.3, h: 0.28, fontSize: 15, bold: true, color: accent, valign: 'top', fit: 'shrink' });
          const copy = [section.body, section.detail].filter(Boolean).join(' ');
          slide.addText(String(copy).slice(0, 760), { ...textOptions, x: textX + 0.2, y: y + 0.36, w: textW - 0.3, h: rowHeight - 0.62, fontSize: 14, color: COLORS.ink, valign: 'top', fit: 'shrink' });
          const refs = section.sourcePages?.length ? `BOOK PAGES ${section.sourcePages.join(', ')}` : '';
          if (refs) slide.addText(refs, { ...textOptions, x: textX + 0.2, y: y + rowHeight - 0.2, w: textW - 0.3, h: 0.12, fontSize: 7, bold: true, charSpacing: 0.65, color: COLORS.muted });
        });
        if (sourcePhoto) addSourcePhoto(slide, sourcePhoto, { x: 8.55, y: 2.02, w: 3.72, h: 4.42 }, COLORS);
      } else if (['outcomes', 'summary'].includes(item.type)) {
        const cards = (item.bullets || []).slice(0, 4);
        const x0 = 0.78, gap = 0.22, cardWidth = (11.8 - gap * Math.max(0, cards.length - 1)) / Math.max(1, cards.length);
        cards.forEach((text, cardIndex) => {
          const x = x0 + cardIndex * (cardWidth + gap), fill = [COLORS.blue, COLORS.mint, COLORS.rose, COLORS.lavender][cardIndex % 4];
          slide.addShape('roundRect', { x, y: 2.38, w: cardWidth, h: 2.72, rectRadius: 0.16, line: { color: COLORS.line, transparency: 100 }, fill: { color: fill } });
          slide.addText(String(cardIndex + 1).padStart(2, '0'), { ...textOptions, x: x + 0.22, y: 2.68, w: cardWidth - 0.44, h: 0.35, fontSize: 25, bold: true, color: [COLORS.teal, COLORS.coral, COLORS.purple, COLORS.green][cardIndex % 4] });
          slide.addText(String(text).slice(0, 300), { ...textOptions, x: x + 0.22, y: 3.22, w: cardWidth - 0.44, h: 1.42, fontSize: 17, bold: true, color: COLORS.ink, valign: 'top', fit: 'shrink' });
          slide.addText('TRACE IT TO THE SOURCE', { ...textOptions, x: x + 0.22, y: 4.72, w: cardWidth - 0.44, h: 0.2, fontSize: 8, bold: true, charSpacing: 0.8, color: COLORS.teal });
        });
        slide.addText('Read the chapter as a connected journey: notice a detail, connect it to an idea, then explain what the evidence shows.', { ...textOptions, x: 0.95, y: 5.62, w: 11.2, h: 0.63, fontSize: 17, color: COLORS.muted, align: 'center', valign: 'mid', fit: 'shrink' });
      } else if (item.type === 'recap') {
        slide.addText('YOUR TURN TO TEACH', { ...textOptions, x: 0.82, y: 2.12, w: 10.8, h: 0.25, fontSize: 11, bold: true, charSpacing: 1.4, color: COLORS.coral });
        addBulletRows(slide, item.bullets || [], COLORS);
        slide.addShape('line', { x: 0.95, y: 6.22, w: 11.1, h: 0, line: { color: COLORS.gold, width: 2 } });
      } else if (item.type === 'animation') {
        const gif = slideGif(item, gifs, params, lesson.sourceImages);
        const storyScene = Boolean(item.simulation?.visual?.story);
        const mathModel = ['math_groups', 'math_sharing'].includes(item.simulation?.model);
        const figureInAnimation = item.simulation?.visual?.style === 'source_figure' && Boolean(sourcePhoto);
        const sidePhoto = sourcePhoto && !figureInAnimation;
        const biologyStory = String(item.simulation?.visual?.story?.subject || lesson.subject || '').toLowerCase().includes('biolog')
          || ['biology', 'cell_microscope', 'cell_parts', 'cell_compare', 'cell_specialisation', 'cell_organisation',
            'microbe_diversity', 'decomposition', 'yeast_fermentation', 'curd_fermentation', 'rhizobium_root',
            'microalgae', 'biogas_digester', 'health_dimensions', 'health_factors', 'healthy_habits',
            'disease_spread', 'disease_prevention', 'immune_response', 'symptom_check'].includes(item.simulation?.visual?.story?.visualType);
        const mathHeroFills = [COLORS.pale, COLORS.rose, COLORS.lavender, COLORS.blue];
        slide.addShape('roundRect', { x: 0.72, y: 1.95, w: 8.55, h: 4.68, rectRadius: 0.14, line: { color: mathModel ? COLORS.coral : COLORS.line, width: mathModel ? 1.4 : 1 }, fill: { color: biologyStory ? COLORS.pale : mathModel ? mathHeroFills[index % mathHeroFills.length] : COLORS.dark } });
        addAnimatedGif(slide, gif, { x: 0.84, y: 2.07, w: 8.31, h: 4.44 }, 0.05);
        const panelFills = mathModel ? [COLORS.white, COLORS.rose, COLORS.lavender, COLORS.blue] : [COLORS.mint];
        slide.addShape('roundRect', { x: 9.56, y: 2.05, w: 2.98, h: 4.53, rectRadius: 0.16, line: { color: mathModel ? COLORS.gold : COLORS.line, transparency: 100 }, fill: { color: panelFills[index % panelFills.length] } });
        slide.addText(mathModel ? 'TRY THE MODEL' : biologyStory ? 'BIOLOGY IN FOCUS' : storyScene ? 'THE STORY BEAT' : 'THE MODEL', { ...textOptions, x: 9.82, y: 2.35, w: 2.45, h: 0.24, fontSize: 10, bold: true, charSpacing: 1.0, color: COLORS.teal });
        slide.addText(String(item.formula || item.simulation?.principle || 'Explore the relationship').slice(0, 220), { ...textOptions, x: 9.82, y: 2.8, w: 2.45, h: mathModel ? 0.76 : sidePhoto ? 0.86 : 1.06, fontSize: 19, bold: true, color: COLORS.ink, valign: 'top', fit: 'shrink' });
        const ruleY = mathModel ? 3.68 : sidePhoto ? 3.78 : 4.0;
        slide.addShape('line', { x: 9.82, y: ruleY, w: 2.38, h: 0, line: { color: COLORS.gold, width: 2 } });
        slide.addText(mathModel ? 'WATCH · CHANGE · COMPARE' : figureInAnimation ? 'TRACE THE BOOK FIGURE' : biologyStory ? 'EXPLAIN THE EVIDENCE' : storyScene ? 'TELL THE STORY BACK' : 'PAUSE & PREDICT', { ...textOptions, x: 9.82, y: ruleY + 0.18, w: 2.45, h: 0.24, fontSize: 9, bold: true, charSpacing: 0.8, color: COLORS.coral });
        const detailY = ruleY + 0.56;
        const detailHeight = mathModel ? (sidePhoto ? 0.52 : 1.25) : sidePhoto ? 0.66 : 1.22;
        slide.addText(String(item.detail || (storyScene ? 'What changes from one panel to the next? Explain how the idea is revealed.' : 'What changes as the model runs?')).slice(0, 500), { ...textOptions, x: 9.82, y: detailY, w: 2.42, h: detailHeight, fontSize: 14, color: COLORS.ink, valign: 'top', fit: 'shrink' });
        if (sidePhoto) addSourcePhoto(slide, sourcePhoto, { x: 9.82, y: mathModel ? 5.12 : 5.12, w: 2.42, h: mathModel ? 1.28 : 1.12 }, COLORS);
        else if (!mathModel) slide.addText(figureInAnimation ? `${sourcePhoto.caption || 'Cropped figure from the uploaded book'} · PAGE ${sourcePhoto.pages?.[0] || ''}` : biologyStory ? 'Follow the highlighted source details. This visual does not model biological motion or rates.' : storyScene ? 'Look at the dialogue and the evidence in each illustrated panel.' : 'Follow the highlighted steps and connect them to the source.', { ...textOptions, x: 9.82, y: 5.96, w: 2.4, h: 0.42, fontSize: 10, color: COLORS.muted, valign: 'top', fit: 'shrink' });
      } else if (item.type === 'worked') {
        slide.addText(String(item.question || item.body || '').slice(0, 650), { ...textOptions, x: 0.9, y: 2.08, w: 7.2, h: 1.08, fontSize: 22, bold: true, color: COLORS.ink, valign: 'top', fit: 'shrink' });
        slide.addShape('roundRect', { x: 0.9, y: 3.42, w: 7.2, h: 0.9, rectRadius: 0.12, line: { color: COLORS.line, transparency: 100 }, fill: { color: COLORS.mint } });
        slide.addText(String(item.answer || '').slice(0, 500), { ...textOptions, x: 1.2, y: 3.68, w: 6.6, h: 0.4, fontSize: 22, bold: true, color: COLORS.teal, fit: 'shrink' });
        slide.addText(String(item.detail || '').slice(0, 650), { ...textOptions, x: 0.96, y: 4.66, w: 7.0, h: 1.1, fontSize: 16, color: COLORS.muted, valign: 'top', fit: 'shrink' });
        addSourceArtwork(slide, item, art, { x: 8.45, y: 2.08, w: 4.03, h: 4.46 }, COLORS, sourcePhoto);
      } else if (item.layout === 'compare') {
        slide.addText(String(item.body || '').slice(0, 700), { ...textOptions, x: 0.86, y: 1.92, w: 11.4, h: 0.7, fontSize: 18, color: COLORS.muted, valign: 'top', fit: 'shrink' });
        const cards = [
          { x: 0.86, title: item.leftTitle || 'First idea', body: item.leftBody || item.body || '', fill: COLORS.blue, accent: COLORS.teal },
          { x: 6.86, title: item.rightTitle || 'Contrasting idea', body: item.rightBody || item.detail || '', fill: COLORS.rose, accent: COLORS.coral },
        ];
        cards.forEach((card) => {
          slide.addShape('roundRect', { x: card.x, y: 2.9, w: 5.62, h: 2.84, rectRadius: 0.16, line: { color: COLORS.line, transparency: 100 }, fill: { color: card.fill } });
          slide.addShape('line', { x: card.x + 0.25, y: 3.25, w: 0.48, h: 0, line: { color: card.accent, width: 3 } });
          slide.addText(String(card.title).slice(0, 140), { ...textOptions, x: card.x + 0.25, y: 3.46, w: 5.1, h: 0.42, fontSize: 20, bold: true, color: card.accent, fit: 'shrink' });
          slide.addText(String(card.body).slice(0, 700), { ...textOptions, x: card.x + 0.25, y: 4.02, w: 5.06, h: 1.38, fontSize: 17, color: COLORS.ink, valign: 'top', fit: 'shrink' });
        });
        slide.addText(String(item.detail || '').slice(0, 500), { ...textOptions, x: 1.05, y: 6.0, w: 11.0, h: 0.47, fontSize: 15, bold: true, color: COLORS.muted, align: 'center', fit: 'shrink' });
      } else if (item.layout === 'process') {
        slide.addText(String(item.body || '').slice(0, 700), { ...textOptions, x: 0.86, y: 1.92, w: 11.4, h: 0.62, fontSize: 18, color: COLORS.muted, valign: 'top', fit: 'shrink' });
        if (item.diagram) addEditableDiagram(slide, item.diagram, { left: 0.92, top: 2.73, width: 11.35, height: 2.9, orientation: 'row' });
        else if (sourcePhoto || !biologyLesson) addSourceArtwork(slide, item, art, { x: 0.95, y: 2.73, w: 11.35, h: 2.9 }, COLORS, sourcePhoto);
        slide.addText(String(item.detail || item.formula || '').slice(0, 650), { ...textOptions, x: 0.94, y: 5.95, w: 11.35, h: 0.56, fontSize: 16, bold: true, color: COLORS.teal, align: 'center', fit: 'shrink' });
      } else if (item.diagram) {
        slide.addText(String(item.body || '').slice(0, 950), { ...textOptions, x: 0.86, y: 2.02, w: 5.15, h: 1.58, fontSize: 19, color: COLORS.ink, valign: 'top', fit: 'shrink' });
        if (item.formula) slide.addText(String(item.formula).slice(0, 240), { ...textOptions, x: 0.92, y: 3.85, w: 4.95, h: 0.52, fontSize: 20, bold: true, color: COLORS.teal, fit: 'shrink' });
        slide.addText(String(item.detail || '').slice(0, 800), { ...textOptions, x: 0.92, y: 4.58, w: 5.0, h: 1.36, fontSize: 15, color: COLORS.muted, valign: 'top', fit: 'shrink' });
        addEditableDiagram(slide, item.diagram, { left: 6.15, top: 2.1, width: 6.0, height: 3.95 });
      } else if (item.layout === 'definition' || item.layout === 'evidence') {
        slide.addShape('line', { x: 0.93, y: 2.08, w: 0, h: 3.92, line: { color: item.layout === 'definition' ? COLORS.gold : COLORS.teal, width: 3 } });
        slide.addText(item.layout === 'definition' ? `KEY TERM · ${String(item.term || item.title).slice(0, 120)}` : 'A DETAIL FROM THE CHAPTER', { ...textOptions, x: 1.25, y: 2.1, w: 4.8, h: 0.25, fontSize: 10, bold: true, charSpacing: 1, color: COLORS.teal });
        slide.addText(String(item.body || '').slice(0, 1000), { ...textOptions, x: 1.25, y: 2.56, w: 4.85, h: 1.66, fontSize: 21, bold: item.layout === 'definition', color: COLORS.ink, valign: 'top', fit: 'shrink' });
        if (item.formula) slide.addText(String(item.formula).slice(0, 240), { ...textOptions, x: 1.25, y: 4.38, w: 4.75, h: 0.46, fontSize: 18, bold: true, color: COLORS.coral, fit: 'shrink' });
        slide.addText(String(item.detail || '').slice(0, 800), { ...textOptions, x: 1.25, y: 4.96, w: 4.85, h: 0.98, fontSize: 15, color: COLORS.muted, valign: 'top', fit: 'shrink' });
        if (sourcePhoto || art || !biologyLesson) addSourceArtwork(slide, item, art, { x: 6.55, y: 2.02, w: 5.7, h: 4.42 }, COLORS, sourcePhoto);
      } else {
        slide.addText(String(item.body || '').slice(0, 950), { ...textOptions, x: 0.87, y: 2.02, w: 5.38, h: item.formula ? 1.8 : 2.28, fontSize: 20, color: COLORS.ink, valign: 'top', fit: 'shrink' });
        if (item.formula) {
          slide.addShape('roundRect', { x: 0.9, y: 4.0, w: 5.26, h: 0.72, rectRadius: 0.12, line: { color: COLORS.line, transparency: 100 }, fill: { color: COLORS.mint } });
          slide.addText(String(item.formula).slice(0, 240), { ...textOptions, x: 1.14, y: 4.2, w: 4.82, h: 0.34, fontSize: 19, bold: true, color: COLORS.teal, fit: 'shrink' });
        }
        slide.addText(String(item.detail || '').slice(0, 850), { ...textOptions, x: 0.9, y: item.formula ? 4.98 : 4.55, w: 5.25, h: 1.22, fontSize: 15, color: COLORS.muted, valign: 'top', fit: 'shrink' });
        if (sourcePhoto || art || !biologyLesson) addSourceArtwork(slide, item, art, { x: 6.58, y: 2.02, w: 5.68, h: 3.72 }, COLORS, sourcePhoto);
        (item.bullets || []).slice(0, 2).forEach((bullet, bulletIndex) => {
          slide.addText(`•  ${String(bullet).slice(0, 145)}`, { ...textOptions, x: 6.78, y: 5.9 + bulletIndex * 0.3, w: 5.2, h: 0.26, fontSize: 9, color: bulletIndex ? COLORS.muted : COLORS.coral, valign: 'mid', fit: 'shrink' });
        });
      }
    }
    if (sourcePageLabel(item)) slide.addText(`SOURCE · ${lesson.source || lesson.title} · ${sourcePageLabel(item)}`, { ...textOptions, x: 0.78, y: 6.78, w: 9.8, h: 0.17, fontSize: 8, color: '829397', charSpacing: 0.45 });
    slide.addNotes([item.notes || '', sourcePageLabel(item) ? `Source reference: ${lesson.source || lesson.title}, ${sourcePageLabel(item).toLowerCase()}.` : 'No chapter page reference is attached to this slide.'].filter(Boolean).join('\n'));
  });
  return Buffer.from(await pptx.write({ outputType: 'nodebuffer', compression: true }));
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'GET' && request.url === '/health/ready') {
    response.writeHead(200, { 'content-type': 'application/json' }); response.end('{"status":"ready"}'); return;
  }
  if (request.method !== 'POST' || request.url !== '/v1/export') {
    response.writeHead(404); response.end(); return;
  }
  try {
    const chunks = []; let size = 0;
    for await (const chunk of request) {
      size += chunk.length;
      if (size > maxBodyBytes) throw new Error('Export input exceeds size limit');
      chunks.push(chunk);
    }
    const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    const pptx = await createPptx(payload.lesson, payload.params || {});
    response.writeHead(200, { 'content-type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'content-length': pptx.length, 'cache-control': 'no-store' });
    response.end(pptx);
  } catch (error) {
    const message = error?.message === 'Export input exceeds size limit' ? error.message : 'The PowerPoint could not be rendered.';
    response.writeHead(error?.message === 'Export input exceeds size limit' ? 413 : 422, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ detail: message }));
  }
});
server.listen(port, '0.0.0.0');
