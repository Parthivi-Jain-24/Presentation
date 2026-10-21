const TAU = Math.PI * 2;

const DEFAULT_STEPS = {
  math: ['Change one value', 'Trace the curve', 'Explain its shape'],
  math_graph: ['Move along x', 'Watch y respond', 'Read the slope'],
  math_balance: ['Balance both sides', 'Undo the same amount', 'Reveal the unknown'],
  physics: ['Apply a force', 'Watch speed build', 'Explain acceleration'],
  physics_motion: ['Apply a force', 'Watch speed build', 'Explain acceleration'],
  physics_distance_graph: ['Track the moving object', 'Plot distance over time', 'Compare the slopes'],
  physics_wave: ['Start the wave', 'Track a crest', 'Compare its features'],
  physics_circuit: ['Voltage drives charge', 'Resistance limits flow', 'Compare the current'],
  chemistry: ['Observe the particles', 'Track the interaction', 'Explain the change'],
  chemistry_particles: ['Add thermal energy', 'Particles move faster', 'Compare the state'],
  chemistry_reaction: ['Bring reactants together', 'Watch bonds rearrange', 'Identify the products'],
  biology: ['Locate the structures', 'Follow their interaction', 'Link form to function'],
  biology_cell: ['Locate the cell parts', 'Follow the cell stage', 'Explain each role'],
  biology_cycle: ['Start with the input', 'Follow each stage', 'Connect the cycle'],
  english: ['Find the subject', 'Follow its action', 'Connect the object'],
  social: ['Set the context', 'Follow the event', 'Explain its impact'],
  social_timeline: ['Set the context', 'Follow the event', 'Explain its impact'],
  robotics: ['Sense the input', 'Choose an action', 'Observe the response'],
};

function circle(ctx, x, y, radius, fill, stroke = null, lineWidth = 1) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function label(ctx, text, x, y, size = 16, color = '#e9f1f5', weight = 500) {
  ctx.font = `${weight} ${size}px Inter, Arial, sans-serif`;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function line(ctx, x1, y1, x2, y2, color, width = 2, dash = []) {
  ctx.beginPath();
  ctx.setLineDash(dash);
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.setLineDash([]);
}

function arrow(ctx, x1, y1, x2, y2, color, width = 3) {
  line(ctx, x1, y1, x2, y2, color, width);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 12 * Math.cos(angle - Math.PI / 6), y2 - 12 * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - 12 * Math.cos(angle + Math.PI / 6), y2 - 12 * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawGrid(ctx, width, height) {
  ctx.fillStyle = '#10283a';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(169, 196, 207, .075)';
  ctx.lineWidth = 1;
  for (let x = 32; x < width; x += 48) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
  }
  for (let y = 25; y < height; y += 48) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
  }
}

function animationParameters(scene, simulation, params, time, options) {
  if (!options.animateControl || !Array.isArray(simulation.controls)) return params;
  if (simulation.animationKey === 'progress') return params;
  const key = simulation.animationKey || simulation.controls[0]?.key;
  const control = simulation.controls.find((item) => item.key === key);
  if (!control || !Number.isFinite(Number(control.min)) || !Number.isFinite(Number(control.max))) return params;
  const phase = ((time % 5) + 5) % 5 / 5;
  const progress = key === 'stage'
    ? Math.floor(phase * (Math.round(Number(control.max) - Number(control.min)) + 1)) / Math.max(1, Math.round(Number(control.max) - Number(control.min)))
    : (1 - Math.cos(phase * Math.PI)) / 2;
  let value = Number(control.min) + (Number(control.max) - Number(control.min)) * progress;
  if (['offset', 'cellPhase', 'focus', 'focus_step', 'stage'].includes(key)) value = Math.round(value);
  return { ...params, [key]: value };
}

function drawTeachingSteps(ctx, width, time, scene, simulation = {}) {
  const supplied = Array.isArray(simulation.steps) ? simulation.steps.filter(Boolean).slice(0, 4) : [];
  const steps = supplied.length ? supplied : (DEFAULT_STEPS[scene] || ['Observe the model', 'Follow the change', 'Explain the result']);
  const active = Math.min(steps.length - 1, Math.floor(((time % 5) / 5) * steps.length));
  const margin = Math.max(12, width * 0.035);
  const gap = Math.max(5, width * 0.012);
  const chipWidth = (width - margin * 2 - gap * (steps.length - 1)) / steps.length;
  const chipHeight = Math.max(22, width * 0.042);
  const y = Math.max(8, width * 0.018);
  ctx.save();
  ctx.font = `600 ${Math.max(10, width * 0.019)}px Inter, Arial, sans-serif`;
  ctx.textBaseline = 'middle';
  steps.forEach((step, index) => {
    const x = margin + index * (chipWidth + gap);
    ctx.beginPath();
    ctx.roundRect(x, y, chipWidth, chipHeight, chipHeight / 2);
    ctx.fillStyle = index === active ? '#b9d8ca' : 'rgba(21, 45, 58, .94)';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = index === active ? '#d8eadf' : 'rgba(173, 202, 207, .42)';
    ctx.stroke();
    const prefix = `${index + 1}  `;
    const available = chipWidth - 24 - ctx.measureText(prefix).width;
    let cue = String(step || '').replace(/\s+/g, ' ').trim();
    while (cue.length > 4 && ctx.measureText(cue).width > available) cue = `${cue.slice(0, -2).trimEnd()}…`;
    ctx.fillStyle = index === active ? '#18333c' : '#c0d2d3';
    ctx.fillText(prefix + cue, x + 12, y + chipHeight / 2);
  });
  ctx.restore();
}

function drawGuideCharacter(ctx, width, time, scene) {
  const bob = Math.sin(time * 2.4) * 2.5;
  const character = scene === 'robotics'
    ? '🧑‍🔧'
    : scene === 'math' || scene === 'math_graph' || scene === 'math_balance' || scene === 'english' || scene === 'social' || scene === 'social_timeline'
      ? '🧑‍🏫'
      : '🧑‍🔬';
  ctx.save();
  ctx.translate(width - 42, 78 + bob);
  ctx.rotate(Math.sin(time * 1.7) * 0.035);
  ctx.font = '30px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(character, 0, 0);
  ctx.restore();
  const bubbleX = width - 143, bubbleY = 102 + bob;
  ctx.save();
  ctx.beginPath(); ctx.roundRect(bubbleX, bubbleY, 102, 23, 8);
  ctx.fillStyle = 'rgba(233,242,236,.92)'; ctx.fill();
  ctx.strokeStyle = 'rgba(157,202,192,.65)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.font = '600 10px Inter, Arial, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#2f5b4b';
  ctx.fillText(time % 5 < 2.5 ? 'WATCH CLOSELY' : 'NOW PREDICT', bubbleX + 51, bubbleY + 11.5);
  ctx.restore();
}

function wrappedLines(ctx, value, maxWidth, maxLines = 3) {
  const words = String(value || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let lineText = '';
  for (const word of words) {
    const next = lineText ? `${lineText} ${word}` : word;
    if (lineText && ctx.measureText(next).width > maxWidth) {
      lines.push(lineText);
      lineText = word;
      if (lines.length === maxLines - 1) break;
    } else lineText = next;
  }
  if (lineText && lines.length < maxLines) lines.push(lineText);
  const consumed = lines.join(' ').length;
  if (consumed < String(value || '').trim().length && lines.length) {
    const last = lines.length - 1;
    let shortened = lines[last];
    while (shortened.length > 3 && ctx.measureText(`${shortened}…`).width > maxWidth) shortened = shortened.slice(0, -1);
    lines[last] = `${shortened.trimEnd()}…`;
  }
  return lines;
}

function compactDiagramLabel(ctx, value, maxWidth = 190) {
  let text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  ctx.font = '600 12px Inter, Arial, sans-serif';
  while (text.length > 5 && ctx.measureText(text).width > maxWidth - 14) text = `${text.slice(0, -2).trimEnd()}…`;
  return text;
}

function overlapArea(a, b) {
  return Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
    * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
}

function drawGeneratedRay(ctx, width, height, item, progress) {
  const points = Array.isArray(item.points) && item.points.length >= 2
    ? item.points.map((point) => ({ x: point.x * width, y: point.y * height }))
    : [{ x: item.x * width - item.width * width / 2, y: item.y * height },
      { x: item.x * width + item.width * width / 2, y: item.y * height + item.height * height }];
  const lengths = points.slice(1).map((point, index) => Math.hypot(point.x - points[index].x, point.y - points[index].y));
  const totalLength = lengths.reduce((sum, length) => sum + length, 0);
  if (!totalLength) return;
  const visibleLength = totalLength * (0.22 + progress * 0.78);
  const color = item.color || '#F1C27D';
  ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
  let remaining = visibleLength, marker = points[0];
  for (let index = 0; index < lengths.length; index += 1) {
    const from = points[index], to = points[index + 1], segment = lengths[index];
    if (remaining >= segment) {
      ctx.lineTo(to.x, to.y); marker = to; remaining -= segment;
    } else {
      const ratio = Math.max(0, remaining / segment);
      marker = { x: from.x + (to.x - from.x) * ratio, y: from.y + (to.y - from.y) * ratio };
      ctx.lineTo(marker.x, marker.y); remaining = 0; break;
    }
  }
  ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
  circle(ctx, marker.x, marker.y, 5, '#FFF0C9', color, 1.5);
}

function drawGeneratedElement(ctx, item, width, height, centerX, centerY, objectWidth, objectHeight, color) {
  ctx.lineWidth = 3; ctx.strokeStyle = color; ctx.fillStyle = `${color}24`;
  if (item.shape === 'lens') {
    ctx.beginPath();
    ctx.moveTo(0, -objectHeight / 2);
    ctx.bezierCurveTo(objectWidth * 0.58, -objectHeight * 0.23, objectWidth * 0.58, objectHeight * 0.23, 0, objectHeight / 2);
    ctx.bezierCurveTo(-objectWidth * 0.58, objectHeight * 0.23, -objectWidth * 0.58, -objectHeight * 0.23, 0, -objectHeight / 2);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (item.shape === 'concave_mirror' || item.shape === 'convex_mirror') {
    const facing = item.shape === 'concave_mirror' ? 1 : -1;
    ctx.beginPath(); ctx.moveTo(0, -objectHeight / 2);
    ctx.quadraticCurveTo(facing * objectWidth * 0.72, 0, 0, objectHeight / 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-2 * facing, -objectHeight / 2); ctx.lineTo(-2 * facing, objectHeight / 2);
    ctx.strokeStyle = `${color}88`; ctx.lineWidth = 4; ctx.stroke();
  } else if (item.shape === 'axis') {
    const points = Array.isArray(item.points) && item.points.length >= 2
      ? item.points.map((point) => ({ x: point.x * width - centerX, y: point.y * height - centerY }))
      : [{ x: -objectWidth / 2, y: 0 }, { x: objectWidth / 2, y: 0 }];
    ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
    if (item.points?.length >= 2) points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
    else ctx.lineTo(points[1].x, points[1].y);
    ctx.strokeStyle = `${color}AA`; ctx.lineWidth = 1.6; ctx.setLineDash([7, 6]); ctx.stroke(); ctx.setLineDash([]);
  } else if (item.shape === 'object_arrow' || item.shape === 'image_arrow') {
    const inverted = item.shape === 'image_arrow' && /invert|downward/i.test(`${item.detail || ''} ${item.label || ''}`);
    const direction = inverted ? -1 : 1;
    const y1 = direction * objectHeight * 0.43, y2 = -direction * objectHeight * 0.43;
    line(ctx, 0, y1, 0, y2, color, 3); arrow(ctx, 0, y1, 0, y2, color, 3);
    line(ctx, -objectWidth * 0.28, y1, objectWidth * 0.28, y1, color, 2);
  } else if (item.shape === 'screen') {
    ctx.fillRect(-objectWidth / 2, -objectHeight / 2, objectWidth, objectHeight);
    ctx.strokeRect(-objectWidth / 2, -objectHeight / 2, objectWidth, objectHeight);
    for (let y = -objectHeight / 2 + 6; y < objectHeight / 2; y += 10) {
      line(ctx, -objectWidth / 2 + 4, y, objectWidth / 2 - 4, y, `${color}88`, 1);
    }
  }
}

function drawSourceFigurePanel(ctx, width, height, image, page, caption) {
  const sourceWidth = Number(image?.naturalWidth || image?.width || 0);
  const sourceHeight = Number(image?.naturalHeight || image?.height || 0);
  if (!image?.complete || !sourceWidth || !sourceHeight) return;
  const x = width * 0.68, y = height * 0.245, panelWidth = width * 0.285, panelHeight = height * 0.61;
  ctx.save();
  ctx.beginPath(); ctx.roundRect(x, y, panelWidth, panelHeight, 16);
  ctx.fillStyle = '#FFFDF7'; ctx.fill(); ctx.strokeStyle = '#D9CBAF'; ctx.lineWidth = 2; ctx.stroke();
  ctx.font = `700 ${Math.max(10, width * 0.015)}px Inter, Arial, sans-serif`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#49796E';
  ctx.fillText(`BOOK FIGURE · PAGE ${page || '—'}`, x + panelWidth * 0.07, y + panelHeight * 0.09);
  line(ctx, x + panelWidth * 0.07, y + panelHeight * 0.16, x + panelWidth * 0.32, y + panelHeight * 0.16, '#E7A94F', 3);
  const padX = panelWidth * 0.07, imageTop = y + panelHeight * 0.2;
  const maxWidth = panelWidth - padX * 2, maxHeight = panelHeight * 0.59;
  const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight);
  const imageWidth = sourceWidth * scale, imageHeight = sourceHeight * scale;
  const imageX = x + (panelWidth - imageWidth) / 2, imageY = imageTop + (maxHeight - imageHeight) / 2;
  ctx.beginPath(); ctx.roundRect(x + padX * 0.5, imageTop - 5, panelWidth - padX, maxHeight + 10, 9); ctx.clip();
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x + padX * 0.5, imageTop - 5, panelWidth - padX, maxHeight + 10);
  ctx.drawImage(image, imageX, imageY, imageWidth, imageHeight);
  const captionText = String(caption || '').replace(/\s+/g, ' ').trim();
  if (captionText) {
    ctx.font = `600 ${Math.max(9, width * 0.012)}px Inter, Arial, sans-serif`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = '#536D65';
    wrappedLines(ctx, captionText, panelWidth - padX * 2, 2)
      .forEach((text, index) => ctx.fillText(text, x + padX, y + panelHeight * 0.84 + index * Math.max(11, width * 0.014)));
  }
  ctx.restore();
}

function drawGeneratedSimulation(ctx, width, height, time, params, simulation, options = {}) {
  const visual = simulation.visual || {};
  const sourceImage = visual.style === 'source_figure' ? options.sourceFigureImage : null;
  const hasSourceFigure = Boolean(sourceImage?.complete && (sourceImage.naturalWidth || sourceImage.width)
    && (sourceImage.naturalHeight || sourceImage.height));
  const sourcePage = options.sourceFigurePage;
  const progress = ((time % 5) + 5) % 5 / 5;
  const objects = Array.isArray(visual.objects) ? visual.objects : [];
  const byId = new Map(objects.map((item) => [item.id, item]));
  const controls = new Map((simulation.controls || []).map((item) => [item.key, item]));
  const states = new Map();
  objects.forEach((item) => states.set(item.id, { x: item.x, y: item.y, scale: 1, opacity: 1, rotation: 0, highlighted: 0 }));
  for (const [trackIndex, track] of (visual.animations || []).entries()) {
    const state = states.get(track.objectId);
    if (!state) continue;
    if (track.controlKey === 'focus_step') {
      const focus = Math.round(Number(params.focus_step ?? controls.get('focus_step')?.value ?? 0));
      state.highlighted = trackIndex === focus ? 1 : 0;
      continue;
    }
    let local = Math.max(0, Math.min(1, (progress - track.start) / Math.max(0.01, track.end - track.start)));
    const control = controls.get(track.controlKey);
    if (control) {
      const range = Number(control.max) - Number(control.min);
      const amount = range > 0 ? Math.max(0, Math.min(1, ((Number(params[track.controlKey] ?? control.value) - Number(control.min)) / range))) : 0.5;
      local = Math.max(0, Math.min(1, local * (0.55 + amount * 0.9)));
    }
    const wave = Math.sin(local * Math.PI);
    if (track.type === 'move' && track.from && track.to) {
      state.x = track.from.x + (track.to.x - track.from.x) * local;
      state.y = track.from.y + (track.to.y - track.from.y) * local;
    } else if (track.type === 'pulse') state.scale *= 1 + wave * 0.13;
    else if (track.type === 'reveal') state.opacity *= local;
    else if (track.type === 'highlight') state.highlighted = Math.max(state.highlighted, wave);
    else if (track.type === 'rotate') state.rotation += wave * 0.3;
  }

  const diagramWidth = hasSourceFigure ? width * 0.62 : width;
  const diagramOffset = hasSourceFigure ? width * 0.025 : 0;
  const px = (value) => value * diagramWidth + diagramOffset;
  const pxSize = (value) => value * diagramWidth;
  const py = (value) => value * height;
  const centers = new Map(objects.map((item) => {
    const state = states.get(item.id);
    return [item.id, { x: px(state.x), y: py(state.y) }];
  }));
  const occupied = objects.filter((item) => !['character', 'ray', 'axis'].includes(item.shape)).map((item) => {
    const center = centers.get(item.id), halfWidth = pxSize(item.width) / 2 + 8, halfHeight = py(item.height) / 2 + 8;
    return { left: center.x - halfWidth, right: center.x + halfWidth, top: center.y - halfHeight, bottom: center.y + halfHeight };
  });
  const nodeLabels = [];
  ctx.font = '600 12px Inter, Arial, sans-serif';
  for (const item of objects) {
    if (!item.label || ['character', 'ray', 'axis'].includes(item.shape)) continue;
    const center = centers.get(item.id), objectWidth = pxSize(item.width), objectHeight = py(item.height);
    if (objectWidth >= 82 && objectHeight >= 44 && !['lens', 'concave_mirror', 'convex_mirror', 'object_arrow', 'image_arrow'].includes(item.shape)) continue;
    const text = compactDiagramLabel(ctx, item.label, Math.min(148, Math.max(74, objectWidth + 40)));
    const boxWidth = Math.min(148, Math.max(42, ctx.measureText(text).width + 14)), boxHeight = 22;
    let y = center.y - objectHeight / 2 - 13;
    if (y < height * 0.27) y = center.y + objectHeight / 2 + 16;
    const box = { left: center.x - boxWidth / 2, right: center.x + boxWidth / 2, top: y - boxHeight / 2, bottom: y + boxHeight / 2 };
    nodeLabels.push({ objectId: item.id, text, x: center.x, y, box, width: boxWidth, height: boxHeight });
    occupied.push(box);
  }
  const sourceStyle = visual.style === 'source_figure';
  label(ctx, compactDiagramLabel(ctx, visual.title || simulation.principle || 'Chapter model', diagramWidth * 0.9), width * 0.055, height * 0.145,
    Math.max(16, width * 0.022), sourceStyle ? '#254E49' : '#dbe9e8', 700);
  if (hasSourceFigure) drawSourceFigurePanel(ctx, width, height, sourceImage, sourcePage, options.sourceFigureCaption);

  const connectionLabels = [];
  for (const connection of visual.connections || []) {
    const from = centers.get(connection.from), to = centers.get(connection.to);
    if (!from || !to) continue;
    const source = byId.get(connection.from), target = byId.get(connection.to);
    const startRadius = Math.max(pxSize(source.width), py(source.height)) * 0.32;
    const endRadius = Math.max(pxSize(target.width), py(target.height)) * 0.32;
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const x1 = from.x + Math.cos(angle) * startRadius, y1 = from.y + Math.sin(angle) * startRadius;
    const x2 = to.x - Math.cos(angle) * endRadius, y2 = to.y - Math.sin(angle) * endRadius;
    const color = connection.color || '#CBD5E1';
    if (connection.direction === 'line') line(ctx, x1, y1, x2, y2, `${color}99`, 2, [6, 5]);
    else {
      arrow(ctx, x1, y1, x2, y2, `${color}B5`, 2.2);
      if (connection.direction === 'both') arrow(ctx, x2, y2, x1, y1, `${color}B5`, 2.2);
    }
    if (connection.label) {
      const text = compactDiagramLabel(ctx, connection.label, Math.min(182, width * 0.25));
      const textWidth = Math.min(182, Math.max(48, ctx.measureText(text).width + 16)), boxHeight = 24;
      const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
      const dx = x2 - x1, dy = y2 - y1, distance = Math.max(1, Math.hypot(dx, dy));
      const normal = { x: -dy / distance, y: dx / distance }, tangent = { x: dx / distance, y: dy / distance };
      const candidates = [];
      for (const normalOffset of [28, -28, 46, -46, 64, -64, 0]) {
        for (const tangentOffset of [0, -18, 18, -36, 36]) {
          const x = midX + normal.x * normalOffset + tangent.x * tangentOffset;
          const y = midY + normal.y * normalOffset + tangent.y * tangentOffset;
          const box = { left: x - textWidth / 2, right: x + textWidth / 2, top: y - boxHeight / 2, bottom: y + boxHeight / 2 };
          const edgeCost = Math.max(0, 108 - box.top) + Math.max(0, box.bottom - height + 12)
            + Math.max(0, 10 - box.left) + Math.max(0, box.right - width + 10);
          const collisions = [...occupied, ...connectionLabels.map((item) => item.box)]
            .reduce((sum, other) => sum + overlapArea(box, other), 0);
          candidates.push({ text, x, y, box, width: textWidth, height: boxHeight, score: collisions * 8 + edgeCost * textWidth });
        }
      }
      candidates.sort((a, b) => a.score - b.score);
      if (candidates.length) connectionLabels.push(candidates[0]);
    }
    if (connection.animated) {
      const travel = (progress * 1.5) % 1;
      const dotX = x1 + (x2 - x1) * travel, dotY = y1 + (y2 - y1) * travel;
      circle(ctx, dotX, dotY, Math.max(3, width * 0.006), '#F1C27D', '#fff3d8', 1);
    }
  }

  const renderOrder = [...objects].sort((a, b) => {
    const rank = (item) => item.shape === 'axis' ? 0 : item.shape === 'ray' ? 1 : item.shape === 'character' ? 4 : 2;
    return rank(a) - rank(b);
  });
  for (const item of renderOrder) {
    const state = states.get(item.id);
    if (state.opacity <= 0.015) continue;
    if (item.shape === 'ray') {
      drawGeneratedRay(ctx, width, height, item, progress);
      continue;
    }
    const centerX = px(state.x), centerY = py(state.y);
    const objectWidth = pxSize(item.width), objectHeight = py(item.height);
    const color = item.color || '#89C7B4';
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, state.opacity));
    ctx.translate(centerX, centerY);
    ctx.rotate(state.rotation);
    ctx.scale(state.scale, state.scale);
    if (state.highlighted > 0.02) {
      ctx.beginPath(); ctx.ellipse(0, 0, objectWidth * 0.65, objectHeight * 0.68, 0, 0, TAU);
      ctx.strokeStyle = `rgba(241,194,125,${0.3 + state.highlighted * 0.55})`; ctx.lineWidth = 4; ctx.stroke();
    }
    if (item.shape === 'character') {
      ctx.beginPath(); ctx.ellipse(0, objectHeight * 0.23, objectWidth * 0.31, objectHeight * 0.1, 0, 0, TAU);
      ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fill();
      ctx.font = `${Math.max(30, objectHeight * 1.6)}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(item.emoji || '🧑‍🔬', 0, -Math.sin(time * 2.5) * 4);
      if (item.label) {
        ctx.font = `600 ${Math.max(10, width * 0.014)}px Inter, Arial, sans-serif`;
        const lines = wrappedLines(ctx, item.label, objectWidth * 1.7, 2);
        lines.forEach((text, index) => {
          ctx.textAlign = 'center'; ctx.fillStyle = '#eff5f3'; ctx.fillText(text, 0, objectHeight * 0.55 + index * 16);
        });
      }
      ctx.restore();
      continue;
    }
    if (['lens', 'concave_mirror', 'convex_mirror', 'axis', 'object_arrow', 'image_arrow', 'screen'].includes(item.shape)) {
      drawGeneratedElement(ctx, item, width, height, centerX, centerY, objectWidth, objectHeight, color);
    } else if (item.shape === 'plot') {
      const left = -objectWidth / 2, top = -objectHeight / 2;
      ctx.fillStyle = 'rgba(9,25,38,.68)'; ctx.beginPath(); ctx.roundRect(left, top, objectWidth, objectHeight, 12); ctx.fill();
      ctx.strokeStyle = 'rgba(203,213,225,.38)'; ctx.lineWidth = 1.5; ctx.stroke();
      for (let index = 1; index < 4; index += 1) {
        line(ctx, left + objectWidth * index / 4, top + 12, left + objectWidth * index / 4, top + objectHeight - 16, 'rgba(203,213,225,.13)', 1);
        line(ctx, left + 12, top + objectHeight * index / 4, left + objectWidth - 10, top + objectHeight * index / 4, 'rgba(203,213,225,.13)', 1);
      }
      line(ctx, left + 12, top + objectHeight - 16, left + objectWidth - 8, top + objectHeight - 16, '#CBD5E1', 1.5);
      line(ctx, left + 12, top + 10, left + 12, top + objectHeight - 16, '#CBD5E1', 1.5);
      const points = item.points || [];
      const visibleCount = Math.max(2, Math.ceil(points.length * Math.max(0.04, progress)));
      ctx.beginPath();
      points.slice(0, visibleCount).forEach((point, index) => {
        const x = left + 14 + point.x * (objectWidth - 28), y = top + 12 + point.y * (objectHeight - 30);
        if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = color; ctx.lineWidth = 3.5; ctx.lineJoin = 'round'; ctx.stroke();
      const finalPoint = points[Math.min(points.length - 1, visibleCount - 1)];
      if (finalPoint) circle(ctx, left + 14 + finalPoint.x * (objectWidth - 28), top + 12 + finalPoint.y * (objectHeight - 30), 5.5, '#F1C27D', '#fff3d8', 1);
    } else if (item.shape === 'circle' || item.shape === 'particle') {
      const radius = Math.min(objectWidth, objectHeight) * (item.shape === 'particle' ? 0.42 : 0.48);
      circle(ctx, 0, 0, radius, `${color}45`, color, 2);
      if (item.shape === 'particle') circle(ctx, -radius * 0.2, -radius * 0.24, Math.max(2, radius * 0.16), '#FFFFFF99');
    } else if (item.shape !== 'text') {
      ctx.beginPath();
      ctx.roundRect(-objectWidth / 2, -objectHeight / 2, objectWidth, objectHeight, item.shape === 'rect' ? 5 : 14);
      ctx.fillStyle = `${color}27`; ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = color; ctx.fillRect(-objectWidth / 2 + 1, -objectHeight / 2 + 12, 4, objectHeight - 24);
    }
    if (item.label && !nodeLabels.some((node) => node.objectId === item.id)) {
      const cardWithDetail = ['rect', 'roundedRect'].includes(item.shape) && objectWidth >= 100 && objectHeight >= 76 && item.detail;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (cardWithDetail) {
        const innerWidth = Math.max(50, objectWidth - 30);
        ctx.font = `700 ${Math.max(12, Math.min(17, width * 0.018))}px Inter, Arial, sans-serif`;
        const labelLines = wrappedLines(ctx, item.label, innerWidth, 2);
        ctx.font = `500 ${Math.max(10, Math.min(13, width * 0.014))}px Inter, Arial, sans-serif`;
        const detailLines = wrappedLines(ctx, item.detail, innerWidth, 3);
        const labelHeight = Math.max(15, width * 0.019), detailHeight = Math.max(13, width * 0.016);
        const totalHeight = labelLines.length * labelHeight + detailLines.length * detailHeight + 8;
        let textY = -totalHeight / 2 + labelHeight / 2;
        ctx.font = `700 ${Math.max(12, Math.min(17, width * 0.018))}px Inter, Arial, sans-serif`;
        ctx.fillStyle = sourceStyle ? '#27433D' : '#F6F8F6';
        labelLines.forEach((text) => { ctx.fillText(text, 0, textY, innerWidth); textY += labelHeight; });
        ctx.font = `500 ${Math.max(10, Math.min(13, width * 0.014))}px Inter, Arial, sans-serif`;
        ctx.fillStyle = sourceStyle ? '#536D65' : '#C7D5D5';
        detailLines.forEach((text) => { ctx.fillText(text, 0, textY, innerWidth); textY += detailHeight; });
      } else {
        ctx.font = `600 ${Math.max(11, Math.min(17, width * 0.018))}px Inter, Arial, sans-serif`;
        ctx.fillStyle = sourceStyle ? '#304B46' : '#F2F6F5';
        const labelLines = wrappedLines(ctx, item.label, Math.max(48, objectWidth - 18), item.shape === 'plot' ? 1 : 3);
        const labelHeight = Math.max(12, width * 0.018);
        const labelStart = item.shape === 'plot' ? -objectHeight / 2 + 16 : -((labelLines.length - 1) * labelHeight) / 2;
        labelLines.forEach((text, index) => ctx.fillText(text, 0, labelStart + index * labelHeight, Math.max(44, objectWidth - 14)));
      }
    }
    ctx.restore();
  }
  for (const item of [...nodeLabels, ...connectionLabels]) {
    ctx.fillStyle = sourceStyle ? 'rgba(255,253,247,.96)' : 'rgba(9,25,38,.94)';
    ctx.beginPath(); ctx.roundRect(item.box.left, item.box.top, item.width, item.height, 7); ctx.fill();
    ctx.strokeStyle = sourceStyle ? 'rgba(86,128,107,.45)' : 'rgba(203,213,225,.52)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.font = '600 12px Inter, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = sourceStyle ? '#304B46' : '#F2F6F5';
    ctx.fillText(item.text, item.x, item.y, item.width - 10);
  }
  if (visual.caption) {
    ctx.font = `500 ${Math.max(11, width * 0.015)}px Inter, Arial, sans-serif`;
    ctx.fillStyle = sourceStyle ? '#647C72' : '#9fb8be'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(visual.caption, width * 0.055, height * 0.89, width * 0.87);
  }
}

function drawPhysics(ctx, width, height, time, params) {
  const elapsed = time % 5;
  const mass = Math.max(1, Math.round(params.mass ?? 2));
  const force = Math.max(1, Number(params.force ?? 6));
  const accel = force / mass;
  const distance = 0.5 * accel * elapsed * elapsed;
  const position = Math.min(0.82, distance / 60);
  const x = 78 + position * (width - 210);
  const y = height * 0.67;
  for (let trail = 1; trail <= 5; trail += 1) {
    const fade = 0.34 - trail * 0.045;
    circle(ctx, x - trail * (10 + accel * 2), y - 20, Math.max(2, 6 - trail * 0.7), `rgba(157,202,192,${fade})`);
  }
  line(ctx, 64, y + 22, width - 58, y + 22, '#7c9cac', 3);
  line(ctx, 64, y + 26, width - 58, y + 26, 'rgba(124,156,172,.24)', 1);
  ctx.fillStyle = '#9fc9ca';
  ctx.beginPath();
  ctx.roundRect(x, y - 48, 104, 48, 10);
  ctx.fill();
  circle(ctx, x + 24, y + 16, 11, '#19384a', '#8bb4b8', 3);
  circle(ctx, x + 80, y + 16, 11, '#19384a', '#8bb4b8', 3);
  arrow(ctx, x + 50, y - 71, x + 50 + 34 + force * 3, y - 71, '#ecb76f', 4);
  arrow(ctx, x + 48, y - 52, x + 48 + 26 + accel * 12, y - 52, '#91c9bb', 3);
  label(ctx, `force  ${force} N    ·    mass  ${mass} kg`, 64, 72, 17, '#b9cbd1', 500);
  label(ctx, `acceleration  ${accel.toFixed(1)} m/s²    ·    speed  ${(accel * elapsed).toFixed(1)} m/s`, 64, 101, 16, '#d9e6e5', 600);
  label(ctx, 'Position follows x = ½at² while the force is held constant', 64, height - 34, 14, '#92aeb6', 500);
}

function drawPhysicsDistanceGraph(ctx, width, height, time, params = {}) {
  const speed = Math.max(1, Number(params.objectSpeed ?? 3));
  const phase = (time % 5) / 5;
  const trackLeft = 76, trackRight = width * 0.43, trackY = height * 0.62;
  const graphLeft = width * 0.57, graphRight = width - 72;
  const graphTop = 145, graphBottom = height - 92;
  const px = trackLeft + phase * (trackRight - trackLeft - 38);
  const graphX = graphLeft + phase * (graphRight - graphLeft);
  const graphY = graphBottom - phase * (graphBottom - graphTop) * (speed / 5);

  label(ctx, `Distance–time graph  ·  speed ${speed} m/s`, 66, 73, 18, '#dbe9e8', 600);
  label(ctx, 'OBJECT', trackLeft, 145, 11, '#92aeb6', 700);
  line(ctx, trackLeft, trackY, trackRight, trackY, '#7c9cac', 4);
  line(ctx, trackLeft, trackY + 6, trackRight, trackY + 6, 'rgba(124,156,172,.24)', 1);
  for (let tick = 0; tick <= 4; tick += 1) {
    const markX = trackLeft + (trackRight - trackLeft) * tick / 4;
    line(ctx, markX, trackY + 12, markX, trackY + 22, '#9bb5bd', 1);
  }
  ctx.fillStyle = '#e9b878';
  ctx.beginPath(); ctx.roundRect(px, trackY - 40, 38, 28, 7); ctx.fill();
  circle(ctx, px + 9, trackY - 8, 5, '#dce8e4'); circle(ctx, px + 29, trackY - 8, 5, '#dce8e4');
  label(ctx, 'moving object', trackLeft, trackY + 44, 12, '#b8cbd2');

  for (let tick = 0; tick <= 4; tick += 1) {
    const x = graphLeft + (graphRight - graphLeft) * tick / 4;
    const y = graphBottom - (graphBottom - graphTop) * tick / 4;
    line(ctx, x, graphTop, x, graphBottom, 'rgba(169,196,207,.11)', 1);
    line(ctx, graphLeft, y, graphRight, y, 'rgba(169,196,207,.11)', 1);
  }
  line(ctx, graphLeft, graphBottom, graphRight + 5, graphBottom, '#8ba4b0', 2);
  line(ctx, graphLeft, graphBottom, graphLeft, graphTop - 4, '#8ba4b0', 2);
  arrow(ctx, graphLeft + 3, graphBottom - 3, graphRight - 3, graphBottom - (graphBottom - graphTop) * (speed / 5), '#9dcac0', 3);
  circle(ctx, graphX, graphY, 9, '#f1bc76', '#10283a', 3);
  label(ctx, 'time', graphRight - 18, graphBottom + 23, 12, '#b8cbd2');
  ctx.save(); ctx.translate(graphLeft - 24, (graphTop + graphBottom) / 2); ctx.rotate(-Math.PI / 2);
  label(ctx, 'distance', -26, 0, 12, '#b8cbd2'); ctx.restore();
  label(ctx, `slope = speed = ${speed} m/s`, graphLeft + 12, height - 29, 13, '#d9e6e5', 600);
}

function drawMath(ctx, width, height, time, params = {}) {
  const left = 105, top = 70, plotW = width - 185, plotH = height - 142;
  const originX = left + plotW / 2;
  const originY = top + plotH * 0.78;
  line(ctx, left, originY, left + plotW, originY, '#8ba4b0', 2);
  line(ctx, originX, top, originX, top + plotH, '#8ba4b0', 2);
  for (let i = -4; i <= 4; i += 1) {
    const x = originX + i * plotW / 9;
    line(ctx, x, top, x, top + plotH, 'rgba(169,196,207,.10)', 1);
  }
  ctx.beginPath();
  for (let i = 0; i <= 120; i += 1) {
    const normalized = (i / 120) * 2 - 1;
    const x = left + i / 120 * plotW;
    const a = Number(params.coefficient ?? 1.5);
    const yValue = a * normalized * normalized + Number(params.intercept ?? 0);
    const y = originY - yValue * plotH * 0.12;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = '#9dcac0';
  ctx.lineWidth = 4;
  ctx.stroke();
  const phase = (time % 5) / 5;
  const nx = Math.sin(phase * TAU - Math.PI / 2);
  const px = originX + nx * plotW / 2;
  const py = originY - nx * nx * plotH * 0.72;
  circle(ctx, px, py, 9, '#f1bc76', '#10283a', 3);
  label(ctx, `y = ${Number(params.coefficient ?? 1.5).toFixed(1)}x² + ${Number(params.intercept ?? 0).toFixed(1)}`, 72, 67, 18, '#dbe9e8', 600);
  label(ctx, 'x', left + plotW + 15, originY + 5, 15, '#b8cbd2');
  label(ctx, 'y', originX + 11, top + 4, 15, '#b8cbd2');
}

function drawMathGraph(ctx, width, height, time, params = {}) {
  const left = 105, top = 78, plotW = width - 185, plotH = height - 148;
  const originX = left + plotW / 2, originY = top + plotH / 2;
  for (let i = -5; i <= 5; i += 1) {
    const x = originX + i * plotW / 11;
    line(ctx, x, top, x, top + plotH, i === 0 ? '#78939e' : 'rgba(169,196,207,.10)', i === 0 ? 2 : 1);
    const y = originY + i * plotH / 11;
    line(ctx, left, y, left + plotW, y, i === 0 ? '#78939e' : 'rgba(169,196,207,.10)', i === 0 ? 2 : 1);
  }
  const slope = Number(params.slope ?? 1);
  const intercept = Number(params.intercept ?? 0);
  ctx.beginPath();
  for (let i = 0; i <= 100; i += 1) {
    const xValue = (i / 100) * 10 - 5;
    const yValue = Math.max(-5, Math.min(5, slope * xValue + intercept));
    const x = left + i / 100 * plotW;
    const y = originY - yValue * plotH / 11;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = '#9dcac0'; ctx.lineWidth = 4; ctx.stroke();
  const phase = (time % 5) / 5;
  const xValue = phase * 8 - 4;
  const yValue = Math.max(-5, Math.min(5, slope * xValue + intercept));
  circle(ctx, originX + xValue * plotW / 11, originY - yValue * plotH / 11, 9, '#f1bc76', '#10283a', 3);
  label(ctx, `y = ${slope.toFixed(1)}x + ${intercept.toFixed(1)}`, 72, 67, 18, '#dbe9e8', 600);
  label(ctx, `slope ${slope.toFixed(1)}  ·  intercept ${intercept.toFixed(1)}`, 72, height - 28, 15, '#92aeb6', 500);
}

function drawMathBalance(ctx, width, height, time, params = {}, simulation = {}) {
  const equation = String(simulation.equation || '');
  const match = equation.match(/x\s*\+\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/i);
  const offset = Math.round(params.offset ?? (match ? Number(match[1]) : 7));
  const total = match ? Number(match[2]) : 15;
  const shift = Math.min(1, (time % 5) / 2.5);
  const center = width / 2;
  const y = height * 0.53;
  line(ctx, center, 90, center, height - 58, 'rgba(157,202,192,.3)', 2, [5, 7]);
  ctx.fillStyle = 'rgba(157,202,192,.08)'; ctx.beginPath(); ctx.roundRect(center - 330, y - 72, 280, 144, 18); ctx.fill();
  ctx.beginPath(); ctx.roundRect(center + 50, y - 72, 280, 144, 18); ctx.fill();
  ctx.strokeStyle = '#8fbab2'; ctx.lineWidth = 2; ctx.stroke();
  label(ctx, `x + ${offset}`, center - 250, y + 10, 34, '#f1c17b', 700);
  label(ctx, String(total), center + 166, y + 10, 34, '#f1c17b', 700);
  arrow(ctx, center - 170, y + 110, center - 170 + shift * 90, y + 110, '#9dcac0', 3);
  arrow(ctx, center + 170, y + 110, center + 170 + shift * 90, y + 110, '#9dcac0', 3);
  label(ctx, shift < 0.6 ? `Subtract ${offset} from both sides` : `x = ${total - offset}`, 65, 74, 20, '#dbe9e8', 600);
  label(ctx, 'The same operation keeps both sides equal', 65, height - 34, 15, '#92aeb6', 500);
}

function drawPhysicsWave(ctx, width, height, time, params = {}) {
  const amplitude = 42;
  const frequency = Math.max(1, Number(params.frequency ?? 2));
  const mid = height * 0.53;
  line(ctx, 68, mid, width - 58, mid, 'rgba(139,164,176,.55)', 2, [5, 7]);
  ctx.beginPath();
  for (let i = 0; i <= 160; i += 1) {
    const x = 70 + i / 160 * (width - 135);
    const phase = (i / 160) * Math.PI * 4 - time * frequency;
    const y = mid + Math.sin(phase) * amplitude;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = '#9dcac0'; ctx.lineWidth = 4; ctx.stroke();
  const marker = (time * frequency / 5) % 1;
  const mx = 70 + marker * (width - 135);
  circle(ctx, mx, mid + Math.sin(marker * Math.PI * 4 - time * frequency) * amplitude, 10, '#f1bc76', '#10283a', 3);
  const crestX = 70 + (width - 135) * 0.125;
  arrow(ctx, crestX, mid, crestX, mid - amplitude, '#ecb76f', 2);
  arrow(ctx, crestX + 14, mid - amplitude - 13, crestX + 14, mid + amplitude + 13, '#91c9bb', 2);
  arrow(ctx, crestX, mid - amplitude - 22, crestX + (width - 135) / (frequency * 2), mid - amplitude - 22, '#a9cbd0', 2);
  label(ctx, `Wave motion  ·  frequency ${frequency} Hz`, 70, 72, 19, '#dbe9e8', 600);
  label(ctx, 'amplitude', crestX + 21, mid - 8, 12, '#f0c27e', 600);
  label(ctx, 'wavelength', crestX + 34, mid - amplitude - 29, 12, '#b8d2d2', 600);
  label(ctx, 'The crest moves while particles oscillate around the rest position', 70, height - 30, 14, '#92aeb6', 500);
}

function drawPhysicsCircuit(ctx, width, height, time, params = {}) {
  const voltage = Math.max(1, Number(params.voltage ?? 6));
  const resistance = Math.max(1, Number(params.resistance ?? 3));
  const current = voltage / resistance;
  const left = width * 0.27, right = width * 0.74, top = height * 0.34, bottom = height * 0.7;
  line(ctx, left, top, right, top, '#8fbab2', 4); line(ctx, right, top, right, bottom, '#8fbab2', 4);
  line(ctx, right, bottom, left, bottom, '#8fbab2', 4); line(ctx, left, bottom, left, top, '#8fbab2', 4);
  ctx.fillStyle = '#e8bb79'; ctx.beginPath(); ctx.roundRect((left + right) / 2 - 45, top - 18, 90, 36, 7); ctx.fill();
  label(ctx, `R ${resistance} Ω`, (left + right) / 2 - 34, top + 6, 15, '#173245', 700);
  const lampX = (left + right) / 2;
  line(ctx, lampX - 25, bottom, lampX - 16, bottom, '#8fbab2', 4);
  line(ctx, lampX + 16, bottom, lampX + 25, bottom, '#8fbab2', 4);
  circle(ctx, lampX, bottom, 16, `rgba(241,190,120,${Math.min(0.78, 0.18 + current * 0.07)})`, '#f1c27e', 2);
  line(ctx, lampX - 7, bottom - 7, lampX + 7, bottom + 7, '#f1c27e', 2);
  line(ctx, lampX + 7, bottom - 7, lampX - 7, bottom + 7, '#f1c27e', 2);
  line(ctx, left - 18, top - 18, left - 18, bottom + 18, '#a9c6ce', 3);
  line(ctx, left - 8, top - 5, left - 8, bottom + 5, '#a9c6ce', 2);
  for (let i = 0; i < 8; i += 1) {
    const phase = (time / 5 + i / 8) % 1;
    const perimeter = 2 * ((right - left) + (bottom - top));
    let distance = phase * perimeter, x, y;
    if (distance < right - left) { x = left + distance; y = top; }
    else if ((distance -= right - left) < bottom - top) { x = right; y = top + distance; }
    else if ((distance -= bottom - top) < right - left) { x = right - distance; y = bottom; }
    else { distance -= right - left; x = left; y = bottom - distance; }
    circle(ctx, x, y, 6, '#f4d79c');
  }
  label(ctx, `Ohm’s law  ·  V = IR`, 65, 72, 20, '#dbe9e8', 600);
  label(ctx, `${voltage} V ÷ ${resistance} Ω = ${current.toFixed(1)} A`, 65, 103, 14, '#d9e6e5', 600);
  label(ctx, `Current  ${current.toFixed(1)} A`, left, height - 32, 14, '#d9e6e5', 600);
  label(ctx, 'Charge moves around a closed circuit', width * 0.55, height - 32, 13, '#92aeb6', 500);
}

function drawChemistry(ctx, width, height, time, params = {}) {
  const centerX = width * 0.51;
  const centerY = height * 0.53;
  const angle = Math.sin(time * 1.2) * 0.3 + ((Number(params.bondAngle ?? 105) - 105) / 360);
  const oxygen = { x: centerX, y: centerY };
  const h1 = { x: centerX - 112 + angle * 90, y: centerY - 70 };
  const h2 = { x: centerX + 112 - angle * 90, y: centerY - 70 };
  line(ctx, oxygen.x, oxygen.y, h1.x, h1.y, '#8ba4b0', 9);
  line(ctx, oxygen.x, oxygen.y, h2.x, h2.y, '#8ba4b0', 9);
  circle(ctx, oxygen.x, oxygen.y, 48, '#e9a47f', '#f3d6be', 3);
  circle(ctx, h1.x, h1.y, 28, '#99c9c0', '#d9efdc', 3);
  circle(ctx, h2.x, h2.y, 28, '#99c9c0', '#d9efdc', 3);
  label(ctx, 'O', oxygen.x - 10, oxygen.y + 8, 22, '#163245', 700);
  label(ctx, 'H', h1.x - 8, h1.y + 7, 15, '#163245', 700);
  label(ctx, 'H', h2.x - 8, h2.y + 7, 15, '#163245', 700);
  label(ctx, `Water molecule  ·  bond angle ${Math.round(params.bondAngle ?? 105)}°`, 62, 68, 18, '#dbe9e8', 600);
  label(ctx, 'Two hydrogen atoms bond with one oxygen atom', 62, height - 38, 15, '#92aeb6');
}

function drawChemistryParticles(ctx, width, height, time, params = {}) {
  const temperature = Math.max(1, Math.min(10, Number(params.temperature ?? 4)));
  const state = temperature < 3.5 ? 'SOLID' : temperature < 7 ? 'LIQUID' : 'GAS';
  const states = ['SOLID', 'LIQUID', 'GAS'];
  const active = states.indexOf(state);
  const gap = width * 0.035;
  const boxWidth = Math.min(250, (width - gap * 2 - 56) / 3);
  const boxHeight = height * 0.39;
  const boxTop = height * 0.32;
  const regionLeft = (width - (boxWidth * 3 + gap * 2)) / 2;

  label(ctx, `Particle arrangement  ·  selected state ${state}`, 64, 70, 19, '#dbe9e8', 600);
  label(ctx, `Relative temperature  ${temperature} / 10`, 64, 105, 14, '#b8cbd2', 500);
  ctx.beginPath(); ctx.roundRect(64, 117, 208, 7, 4); ctx.fillStyle = 'rgba(150,184,183,.25)'; ctx.fill();
  ctx.beginPath(); ctx.roundRect(64, 117, 208 * temperature / 10, 7, 4); ctx.fillStyle = '#e9b878'; ctx.fill();

  states.forEach((name, stateIndex) => {
    const x0 = regionLeft + stateIndex * (boxWidth + gap);
    ctx.beginPath(); ctx.roundRect(x0, boxTop, boxWidth, boxHeight, 12);
    ctx.fillStyle = stateIndex === active ? 'rgba(233,184,120,.08)' : 'rgba(17,42,58,.3)'; ctx.fill();
    ctx.lineWidth = stateIndex === active ? 2 : 1;
    ctx.strokeStyle = stateIndex === active ? '#e9b878' : 'rgba(135,170,178,.4)'; ctx.stroke();

    for (let index = 0; index < 12; index += 1) {
      const column = index % 4, row = Math.floor(index / 4);
      const jitterRate = stateIndex === 0 ? 2 : stateIndex === 1 ? 9 : 20;
      const motionRate = stateIndex === active ? 0.35 + temperature * 0.13 : 0.16;
      const angle = time * motionRate + index * 1.73;
      let baseX, baseY;
      if (stateIndex === 2) {
        const seedX = (Math.sin(index * 91.7 + 2.4) + 1) / 2;
        const seedY = (Math.sin(index * 47.3 + 8.1) + 1) / 2;
        baseX = x0 + 20 + seedX * (boxWidth - 40);
        baseY = boxTop + 28 + seedY * (boxHeight - 56);
      } else {
        baseX = x0 + boxWidth * 0.17 + column * boxWidth * 0.22;
        baseY = boxTop + boxHeight * 0.25 + row * boxHeight * 0.24;
      }
      const x = Math.max(x0 + 13, Math.min(x0 + boxWidth - 13, baseX + Math.sin(angle) * jitterRate));
      const y = Math.max(boxTop + 14, Math.min(boxTop + boxHeight - 14, baseY + Math.cos(angle * 0.83) * jitterRate));
      ctx.save(); ctx.globalAlpha = stateIndex === active ? 1 : 0.44;
      circle(ctx, x, y, 8, index % 2 ? '#9dcac0' : '#efbd78', 'rgba(235,245,240,.55)', 1);
      ctx.restore();
    }
    label(ctx, name, x0 + boxWidth / 2 - 24, boxTop + boxHeight + 23, 13,
      stateIndex === active ? '#f0c27e' : '#b8cbd2', 700);
  });
  label(ctx, 'Compare particle spacing and movement as thermal energy changes', 64, height - 30, 14, '#92aeb6', 500);
}

function drawChemistryReaction(ctx, width, height, time, params = {}, simulation = {}) {
  const rate = Math.max(1, Number(params.reactionRate ?? 3));
  const progress = (time * rate / 5) % 1;
  const cy = height * 0.55;
  const leftX = width * 0.28 + progress * 90;
  const rightX = width * 0.72 - progress * 90;
  const bondFade = Math.max(0, Math.min(1, (progress - 0.35) * 2.4));
  circle(ctx, leftX, cy, 39, '#e99f7d', '#f2d4bb', 3);
  circle(ctx, leftX - 40, cy - 32, 19, '#9dcac0', '#d9efdc', 2);
  circle(ctx, rightX, cy, 34, '#9dcac0', '#d9efdc', 2);
  label(ctx, 'A', leftX - 8, cy + 8, 23, '#18333c', 700);
  label(ctx, 'B', rightX - 8, cy + 8, 22, '#18333c', 700);
  arrow(ctx, width * 0.4, cy + 88, width * 0.6, cy + 88, '#e9bd7e', 4);
  const productX = width * 0.78 - (1 - progress) * 20;
  line(ctx, productX - 24, cy, productX + 24, cy, `rgba(143,186,178,${bondFade})`, 8);
  circle(ctx, productX - 26, cy, 34, `rgba(233,159,125,${bondFade})`, '#f2d4bb', 3);
  circle(ctx, productX + 26, cy, 32, `rgba(157,202,192,${bondFade})`, '#d9efdc', 3);
  label(ctx, 'A', productX - 34, cy + 8, 20, '#18333c', 700);
  label(ctx, 'B', productX + 18, cy + 8, 20, '#18333c', 700);
  label(ctx, 'Reactants', 72, 76, 17, '#dbe9e8', 600);
  label(ctx, 'Bond rearrangement', width * 0.42, 76, 14, '#dbe9e8', 600);
  label(ctx, 'Product', width * 0.73, 76, 17, '#dbe9e8', 600);
  label(ctx, `Reaction progress  ·  rate ${rate}×`, 72, height - 31, 15, '#92aeb6', 500);
  label(ctx, String(simulation.equation || 'A + B → products').slice(0, 48), 72, 101, 14, '#a9c5c9');
}

function drawBiology(ctx, width, height, time, params = {}) {
  const cx = width * 0.52, cy = height * 0.53;
  circle(ctx, cx, cy, 158, 'rgba(82,154,143,.16)', '#8abeb0', 4);
  circle(ctx, cx, cy, 94, 'rgba(115,161,189,.2)', '#a2c4ce', 2);
  const pulse = 18 + (Math.sin(time * (Number(params.cycleRate ?? 2) + 1)) + 1) * 8;
  circle(ctx, cx - 14, cy + 5, pulse, '#ebbd79', '#f3d8a9', 2);
  const organelles = [[-105,-66], [93,-72], [105,78], [-94,90], [8,-125]];
  organelles.forEach(([dx, dy], index) => {
    const orbit = time * 0.18 + index * 1.15;
    circle(ctx, cx + dx + Math.cos(orbit) * 4, cy + dy + Math.sin(orbit) * 4, 10, '#94c7b9');
  });
  label(ctx, 'Cell membrane', 64, 68, 17, '#dbe9e8', 600);
  label(ctx, 'Nucleus', cx + 20, cy + 11, 14, '#ffdfaa', 500);
  label(ctx, 'Cell parts work together as one system', 64, height - 35, 15, '#92aeb6');
}

function drawBiologyCell(ctx, width, height, time, params = {}) {
  const phase = Math.max(1, Math.min(5, Math.round(Number(params.cellPhase ?? 2))));
  const cx = width * 0.52, cy = height * 0.53;
  circle(ctx, cx, cy, 178, 'rgba(82,154,143,.14)', '#8abeb0', 4);
  circle(ctx, cx, cy, 118, 'rgba(115,161,189,.15)', '#a2c4ce', 2);
  const split = phase >= 4;
  const nucleusX = cx + (split ? Math.sin(time * 1.2) * 44 : 0);
  circle(ctx, nucleusX, cy, 38, '#e7b876', '#f5d9a8', 2);
  const organelles = [[-115,-70], [106,-77], [120,73], [-104,91], [0,-138], [0,138]];
  organelles.forEach(([dx, dy], i) => circle(ctx, cx + dx + Math.sin(time + i) * 4, cy + dy, 10, '#94c7b9'));
  arrow(ctx, cx - 24, cy + 14, cx - 70, cy + 40, '#e9bd7e', 2);
  arrow(ctx, cx + 111, cy - 70, cx + 173, cy - 111, '#9dcac0', 2);
  arrow(ctx, cx - 113, cy - 67, cx - 184, cy - 103, '#9dcac0', 2);
  label(ctx, 'nucleus', cx - 112, cy + 63, 12, '#f0c27e', 600);
  label(ctx, 'mitochondrion', cx + 177, cy - 111, 11, '#b8d2d2', 600);
  label(ctx, 'membrane', cx - 251, cy - 113, 11, '#b8d2d2', 600);
  label(ctx, `Cell structure  ·  phase ${phase}`, 65, 69, 18, '#dbe9e8', 600);
  label(ctx, split ? 'Nuclear material is separating in this illustrative stage' : 'The cell membrane surrounds the cell contents', 65, height - 32, 14, '#92aeb6');
}

function drawBiologyCycle(ctx, width, height, time, params = {}, simulation = {}) {
  const cx = width * 0.52, cy = height * 0.53;
  const labels = (simulation.labels?.length ? simulation.labels : ['Input', 'Process', 'Output', 'Repeat']).slice(0, 4);
  const positions = [[cx, cy - 150], [cx + 240, cy], [cx, cy + 150], [cx - 240, cy]];
  const speed = Math.max(1, Number(params.cycleRate ?? 2));
  for (let i = 0; i < positions.length; i += 1) {
    const [x1, y1] = positions[i], [x2, y2] = positions[(i + 1) % positions.length];
    arrow(ctx, x1 + (x2 - x1) * 0.2, y1 + (y2 - y1) * 0.2, x1 + (x2 - x1) * 0.68, y1 + (y2 - y1) * 0.68, 'rgba(157,202,192,.65)', 3);
  }
  const active = Math.floor((time * speed / 5 % 1) * positions.length);
  positions.forEach(([x, y], i) => {
    circle(ctx, x, y, 46, i === active ? '#efbd78' : '#245064', i === active ? '#f5d9a8' : '#8abeb0', 2);
    const text = String(labels[i] || `Stage ${i + 1}`).slice(0, 14);
    label(ctx, text, x - Math.max(32, text.length * 4.3), y + 6, 14, i === active ? '#18333c' : '#e5efed', 600);
  });
  label(ctx, `Cycle model  ·  stage ${active + 1} of ${positions.length}`, 65, 69, 18, '#dbe9e8', 600);
  label(ctx, 'Trace the inputs, process and outputs described in the chapter', 65, height - 31, 14, '#92aeb6');
}

function drawEnglish(ctx, width, height, time, params = {}, simulation = {}) {
  const labels = ['SUBJECT', 'VERB', 'OBJECT'];
  const supplied = simulation.labels?.length ? simulation.labels : ['Students', 'explore', 'ideas'];
  const words = [supplied[0] || 'Students', supplied[1] || 'explore', supplied[2] || 'ideas'];
  const active = Math.max(0, Math.min(2, Math.round(Number(params.focus ?? Math.floor((time % 3.6) / 1.2)))));
  const cardW = 196, gap = 28;
  const start = (width - cardW * 3 - gap * 2) / 2;
  labels.forEach((heading, index) => {
    const x = start + index * (cardW + gap);
    const y = height * 0.43;
    ctx.fillStyle = index === active ? 'rgba(154,198,188,.19)' : 'rgba(217,232,233,.06)';
    ctx.beginPath(); ctx.roundRect(x, y, cardW, 124, 18); ctx.fill();
    ctx.strokeStyle = index === active ? '#a5d0c3' : 'rgba(176,201,207,.24)';
    ctx.lineWidth = 2; ctx.stroke();
    label(ctx, heading, x + 22, y + 35, 13, '#a9c5c9', 700);
    label(ctx, words[index], x + 22, y + 80, 23, index === active ? '#f4c27e' : '#e7efee', 600);
  });
  label(ctx, 'Sentence structure', 64, 68, 18, '#dbe9e8', 600);
}

function drawSocial(ctx, width, height, time, params = {}, simulation = {}) {
  const cx = width * 0.52, cy = height * 0.52;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 258, 148, 0, 0, TAU);
  ctx.fillStyle = 'rgba(110,165,156,.12)'; ctx.fill();
  ctx.strokeStyle = 'rgba(153,196,186,.42)'; ctx.lineWidth = 2; ctx.stroke();
  const points = [[-185, -50], [-92, 48], [15, -52], [112, 55], [190, -38]];
  const events = simulation.labels?.length ? simulation.labels : ['Context', 'Event', 'Decision', 'Change', 'Legacy'];
  const active = Math.floor((time * Math.max(1, Number(params.timelineSpeed ?? 2)) % 5));
  for (let i = 0; i < points.length - 1; i += 1) {
    line(ctx, cx + points[i][0], cy + points[i][1], cx + points[i+1][0], cy + points[i+1][1], 'rgba(151,192,188,.48)', 2, [6,8]);
  }
  points.forEach(([dx, dy], i) => {
    const selected = i === active;
    circle(ctx, cx + dx, cy + dy, selected ? 13 : 8, selected ? '#efbc77' : '#91c2b7');
    const event = String(events[i] || `Event ${i + 1}`).slice(0, 14);
    label(ctx, event, cx + dx - event.length * 3.5, cy + dy + 29, 11, selected ? '#f0c27e' : '#b8cbd2', selected ? 600 : 400);
  });
  label(ctx, 'Events in place, people and time', 64, 68, 18, '#dbe9e8', 600);
  label(ctx, 'Place · people · time', 64, height - 36, 15, '#92aeb6');
}

function drawRobotics(ctx, width, height, time, params = {}) {
  const centerX = width * 0.51, centerY = height * 0.55;
  const threshold = Math.max(1, Math.min(10, Number(params.sensorThreshold ?? 5)));
  const pathAmplitude = 42 + threshold * 7;
  ctx.beginPath();
  for (let i = 0; i <= 80; i += 1) {
    const x = 65 + i / 80 * (width - 130);
    const y = centerY + Math.sin(i / 80 * TAU * 1.3) * pathAmplitude;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = 'rgba(154,198,188,.38)'; ctx.lineWidth = 17; ctx.lineCap = 'round'; ctx.stroke();
  ctx.strokeStyle = '#9dcac0'; ctx.lineWidth = 2; ctx.setLineDash([8, 9]); ctx.stroke(); ctx.setLineDash([]);
  const phase = (time % 5) / 5;
  const x = 65 + phase * (width - 130);
  const y = centerY + Math.sin(phase * TAU * 1.3) * pathAmplitude;
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.cos(phase * TAU * 1.3) * 0.24);
  ctx.fillStyle = '#eebc78'; ctx.beginPath(); ctx.roundRect(-29, -19, 58, 38, 10); ctx.fill();
  circle(ctx, -17, 22, 7, '#d6e4e1'); circle(ctx, 17, 22, 7, '#d6e4e1');
  arrow(ctx, 0, -26, 30, -26, '#eebc78', 3);
  ctx.restore();
  label(ctx, `Sense · decide · act  ·  threshold ${threshold}`, 64, 68, 18, '#dbe9e8', 600);
  label(ctx, 'The robot changes its path as the sensor threshold moves', 64, height - 36, 15, '#92aeb6');
  void centerX;
}

function drawStoryChild(ctx, x, baseY, scale, time, coat = '#5A9B84', pose = 0) {
  const bob = Math.sin(time * 3 + pose) * 2.5 * scale;
  ctx.save();
  ctx.translate(x, baseY + bob);
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#34535A';
  ctx.lineWidth = 6;
  line(ctx, -10, -34, -18 + Math.sin(time * 2 + pose) * 4, -8, '#34535A', 5);
  line(ctx, 10, -34, 19 - Math.sin(time * 2 + pose) * 4, -10, '#34535A', 5);
  line(ctx, -7, -8, -12, 9, '#34535A', 5);
  line(ctx, 7, -8, 12, 9, '#34535A', 5);
  ctx.beginPath(); ctx.roundRect(-13, -49, 26, 35, 9); ctx.fillStyle = coat; ctx.fill();
  circle(ctx, 0, -62, 17, '#F2C7A5', '#D79D7C', 1.2);
  ctx.beginPath(); ctx.arc(0, -66, 17, Math.PI, TAU); ctx.quadraticCurveTo(13, -84, 17, -65); ctx.quadraticCurveTo(6, -73, -1, -67); ctx.quadraticCurveTo(-8, -73, -17, -64); ctx.fillStyle = '#493B38'; ctx.fill();
  circle(ctx, -5.5, -61, 1.35, '#263E47'); circle(ctx, 5.5, -61, 1.35, '#263E47');
  ctx.beginPath(); ctx.arc(0, -56, 4.2, 0.14, Math.PI - 0.14); ctx.strokeStyle = '#A95F59'; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.restore();
}

function drawStoryRobot(ctx, x, baseY, scale, time) {
  const bob = Math.sin(time * 2.5 + 1) * 3 * scale;
  ctx.save(); ctx.translate(x, baseY + bob); ctx.scale(scale, scale);
  ctx.strokeStyle = '#397C78'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  line(ctx, -13, -30, -22, -17, '#397C78', 4); line(ctx, 13, -30, 22, -17, '#397C78', 4);
  line(ctx, -7, -5, -10, 7, '#397C78', 4); line(ctx, 7, -5, 10, 7, '#397C78', 4);
  ctx.beginPath(); ctx.roundRect(-16, -47, 32, 39, 10); ctx.fillStyle = '#73BFB0'; ctx.fill(); ctx.strokeStyle = '#397C78'; ctx.lineWidth = 2; ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-20, -79, 40, 31, 9); ctx.fillStyle = '#BDE4D8'; ctx.fill(); ctx.strokeStyle = '#397C78'; ctx.stroke();
  line(ctx, 0, -79, 0, -87, '#397C78', 2.4); circle(ctx, 0, -89, 3.5, '#EAB66F');
  circle(ctx, -7, -64, 2.2, '#234851'); circle(ctx, 7, -64, 2.2, '#234851');
  ctx.beginPath(); ctx.roundRect(-8, -57, 16, 5, 2); ctx.fillStyle = '#397C78'; ctx.fill();
  ctx.restore();
}

function storyRoundedRect(ctx, x, y, width, height, radius, fill, stroke = null, lineWidth = 1) {
  ctx.beginPath(); ctx.roundRect(x, y, width, height, radius); ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
}

function storyText(ctx, text, x, y, size = 11, color = '#526F64', align = 'center', weight = 700) {
  ctx.save(); ctx.font = `${weight} ${size}px Inter, Arial, sans-serif`; ctx.fillStyle = color;
  ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y, 230); ctx.restore();
}

function drawCellIcon(ctx, x, y, kind = 'plant', scale = 1, highlighted = 'all', features = null) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  if (kind === 'plant') {
    storyRoundedRect(ctx, -48, -33, 96, 66, 12, '#D9E9BD', '#5E9271', 3);
    storyRoundedRect(ctx, -41, -27, 82, 54, 10, '#EAF2D3', '#84AD81', 1.6);
    if (!features || features.vacuole) storyRoundedRect(ctx, -25, -17, 49, 34, 9, '#C4E1C9', '#8AB59A', 1.2);
    if (!features || features.nucleus) { circle(ctx, 17, -8, 9, '#A696CF', '#796FA8', 1.4); circle(ctx, 17, -8, 3, '#E8D7FF'); }
    (features && !features.chloroplast ? [] : [[-30, -15], [29, 16], [-30, 15], [30, -15]]).forEach(([px, py]) => {
      ctx.save(); ctx.translate(px, py); ctx.rotate(-0.55);
      storyRoundedRect(ctx, -6, -2.5, 12, 5, 3, '#79A778', '#55865F', 0.8); ctx.restore();
    });
    if (highlighted === 'wall') storyRoundedRect(ctx, -52, -37, 104, 74, 13, 'rgba(231,177,95,.18)', '#E2A850', 3);
  } else if (kind === 'animal') {
    ctx.beginPath(); ctx.ellipse(0, 0, 49, 34, 0, 0, TAU); ctx.fillStyle = '#F0D5C5'; ctx.fill(); ctx.strokeStyle = '#B98072'; ctx.lineWidth = 2.7; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, 44, 29, 0, 0, TAU); ctx.fillStyle = '#F7E6D7'; ctx.fill();
    if (!features || features.cytoplasm) { ctx.beginPath(); ctx.ellipse(-11, 1, 25, 18, 0, 0, TAU); ctx.fillStyle = '#E5D6E8'; ctx.fill(); }
    if (!features || features.nucleus) { circle(ctx, 15, -6, 9, '#A696CF', '#796FA8', 1.4); circle(ctx, 15, -6, 3, '#E8D7FF'); }
    if (highlighted === 'membrane') { ctx.beginPath(); ctx.ellipse(0, 0, 51, 36, 0, 0, TAU); ctx.strokeStyle = '#E2A850'; ctx.lineWidth = 4; ctx.stroke(); }
  } else if (kind === 'bacteria') {
    ctx.save(); ctx.rotate(-0.22); ctx.beginPath(); ctx.roundRect(-50, -23, 100, 46, 23); ctx.fillStyle = '#D7E8B5'; ctx.fill(); ctx.strokeStyle = '#638F6D'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(45, 0); ctx.bezierCurveTo(69, -4, 65, -28, 81, -30); ctx.strokeStyle = '#638F6D'; ctx.lineWidth = 2.2; ctx.stroke();
    for (let i = 0; i < 5; i += 1) circle(ctx, -29 + i * 12, Math.sin(i * 2.4) * 8, 2.4, '#7DA68B');
    ctx.beginPath(); ctx.moveTo(-8, -16); ctx.bezierCurveTo(-20, -6, 8, 6, -8, 16); ctx.strokeStyle = '#A696CF'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  }
  ctx.restore();
}

function drawStoryPlant(ctx, x, groundY, size = 1, time = 0) {
  ctx.save(); ctx.translate(x, groundY); ctx.scale(size, size);
  line(ctx, -56, 0, 56, 0, '#9A7A5C', 3);
  line(ctx, 0, -2, 0, -53, '#568A68', 5);
  for (const side of [-1, 1]) {
    ctx.save(); ctx.translate(side * 18, -35); ctx.rotate(side * 0.45);
    ctx.beginPath(); ctx.ellipse(0, 0, 19, 9, 0, 0, TAU); ctx.fillStyle = '#82B887'; ctx.fill(); ctx.strokeStyle = '#568A68'; ctx.lineWidth = 1.7; ctx.stroke();
    line(ctx, -14, 0, 14, 0, '#548365', 1); ctx.restore();
  }
  circle(ctx, 0, -59 + Math.sin(time * 2) * 1.5, 7, '#E5B970', '#FFF1C8', 1.4);
  ctx.restore();
}

function drawLessonStoryProp(ctx, type, time, panelIndex, simulation, params) {
  const pulse = 1 + Math.sin(time * 2.8) * 0.035;
  const features = simulation.visual?.story?.features || {};
  if (type === 'health_dimensions') {
    const nodes = [
      { x: -66, label: 'PHYSICAL', fill: '#DCEBCB', stroke: '#78986D' },
      { x: 0, label: 'MENTAL', fill: '#E8DDF0', stroke: '#8B789D' },
      { x: 66, label: 'SOCIAL', fill: '#F2DFCE', stroke: '#B58866' },
    ];
    nodes.forEach((node, index) => {
      const active = panelIndex === 2 || panelIndex === index;
      circle(ctx, node.x, -3, active ? 28 : 23, node.fill, node.stroke, active ? 2.4 : 1.4);
      storyText(ctx, node.label, node.x, 45, 8, active ? '#40594A' : '#819085', 'center', 700);
    });
    storyText(ctx, panelIndex === 2 ? 'Health includes all three dimensions' : 'One part of overall well-being', 0, 68, 9);
    return true;
  }
  if (type === 'health_factors') {
    const nodes = [
      { x: -62, label: 'LIFESTYLE', fill: '#DCEBCB', stroke: '#78986D' },
      { x: 62, label: 'ENVIRONMENT', fill: '#E6E9D8', stroke: '#7C9272' },
    ];
    nodes.forEach((node, index) => {
      const active = panelIndex === 2 || panelIndex === index;
      storyRoundedRect(ctx, node.x - 42, -20, 84, 44, 12, active ? node.fill : '#F3F1E8', node.stroke, active ? 2.2 : 1.2);
      storyText(ctx, node.label, node.x, 2, 8, '#4C6655');
    });
    arrow(ctx, -15, 1, 15, 1, '#7E9B82', 2);
    storyText(ctx, 'Both can affect health', 0, 56, 9);
    return true;
  }
  if (type === 'healthy_habits') {
    const items = [
      ['activity', 'MOVE', '#DCEBCB', '#78986D'],
      ['hygiene', 'HYGIENE', '#E1ECEB', '#638B87'],
      ['sleep', 'REST', '#E8DDF0', '#8B789D'],
    ].filter(([key]) => features[key]);
    const visible = items.length ? items : [['habits', 'HEALTHY HABITS', '#DCEBCB', '#78986D']];
    const gap = Math.min(68, 144 / Math.max(1, visible.length - 1));
    visible.forEach(([, labelText, fill, stroke], index) => {
      const x = (index - (visible.length - 1) / 2) * gap;
      const active = panelIndex === 2 || panelIndex === index;
      circle(ctx, x, 0, active ? 25 : 21, fill, stroke, active ? 2.2 : 1.2);
      storyText(ctx, labelText, x, 42, 8, '#4C6655');
    });
    storyText(ctx, 'Habits described in the chapter', 0, 66, 8, '#71877A', 'center', 600);
    return true;
  }
  if (type === 'disease_spread' || type === 'disease_prevention') {
    const labels = type === 'disease_spread'
      ? ['SOURCE', features.insect_vector ? 'VECTOR' : features.contaminated_water ? 'WATER' : 'ROUTE', 'HOST']
      : ['PATHOGEN', features.hygiene ? 'HYGIENE' : 'PREVENTION', 'LOWER RISK'];
    const xPositions = [-76, 0, 76];
    xPositions.forEach((x, index) => {
      const active = panelIndex === 2 || panelIndex === index;
      const fill = type === 'disease_prevention' && index === 1 ? '#DDEBE2' : index === 0 ? '#F2DFD6' : '#E3EBD9';
      circle(ctx, x, 0, active ? 22 : 18, fill, active ? '#66836F' : '#9AA995', active ? 2.2 : 1.2);
      storyText(ctx, labels[index], x, 39, 7, '#4C6655');
      if (index < xPositions.length - 1) arrow(ctx, x + 25, 0, xPositions[index + 1] - 25, 0, '#849A85', 1.8);
    });
    storyText(ctx, type === 'disease_spread' ? 'Follow the route named in the source' : 'The prevention step interrupts the route', 0, 65, 8, '#71877A', 'center', 600);
    return true;
  }
  if (type === 'immune_response') {
    const active = panelIndex;
    circle(ctx, -46, 1, 22, active === 0 ? '#F2DFD6' : '#EAE8DF', '#B98373', 1.5);
    storyText(ctx, features.vaccine ? 'VACCINE' : 'EXPOSURE', -46, 39, 7, '#6C6157');
    arrow(ctx, -18, 1, 18, 1, '#849A85', 1.8);
    circle(ctx, 46, 1, 25, active > 0 ? '#DDEBE2' : '#EAE8DF', '#71917B', 1.8);
    storyText(ctx, 'IMMUNE RESPONSE', 46, 39, 7, '#516E62');
    if (panelIndex === 2) {
      for (let i = 0; i < 3; i += 1) storyRoundedRect(ctx, -18 + i * 18, -40, 8, 17, 4, '#C6A7D1', '#8B789D', 1);
      storyText(ctx, 'Recognise the pathogen described', 0, 65, 8, '#71877A', 'center', 600);
    }
    return true;
  }
  if (type === 'symptom_check') {
    const labels = ['NOTICE SIGNS', 'DESCRIBE THEM', 'SEEK GUIDANCE'];
    const active = panelIndex;
    [-66, 0, 66].forEach((x, index) => {
      const selected = active === 2 || active === index;
      storyRoundedRect(ctx, x - 28, -18, 56, 36, 10, selected ? '#E5EFDF' : '#F3F1E8', selected ? '#78986D' : '#C9D0C7', selected ? 2 : 1);
      storyText(ctx, String(index + 1).padStart(2, '0'), x, -4, 10, '#64806A');
      storyText(ctx, labels[index], x, 35, 6.7, '#536B5C');
      if (index < 2) arrow(ctx, x + 30, 0, x + 36, 0, '#849A85', 1.5);
    });
    storyText(ctx, 'A chapter guide to recognising illness', 0, 63, 8, '#71877A', 'center', 600);
    return true;
  }
  if (type === 'cell_microscope') {
    const view = Math.max(0, Math.min(2, Math.round(Number(params.microscope_view ?? 2))));
    if (panelIndex === 0) {
      storyRoundedRect(ctx, -104, -39, 60, 21, 6, '#547C83', '#395B62', 2);
      ctx.save(); ctx.rotate(0.38); storyRoundedRect(ctx, -70, -50, 24, 58, 10, '#B8D1C6', '#547C83', 2); ctx.restore();
      storyRoundedRect(ctx, -104, 26, 54, 13, 5, '#799B92', '#547C83', 1.5); circle(ctx, -45, 18, 14, '#D1E8E6', '#5E8C89', 2);
      storyText(ctx, 'MICROSCOPE', -72, 59, 9); storyText(ctx, 'Look closer', 33, 3, 14, '#476C61');
      for (let i = 0; i < 5; i += 1) circle(ctx, 4 + (i % 3) * 21, 26 + Math.floor(i / 3) * 17, 4, '#83B89C', '#F7F6E8', 1);
      storyText(ctx, 'tiny specimens', 44, 67, 9, '#71877A', 'center', 600);
    } else if (panelIndex === 1) {
      for (let row = 0; row < 3; row += 1) for (let col = 0; col < 4; col += 1) {
        const x = -76 + col * 48, y = -31 + row * 32;
        storyRoundedRect(ctx, x, y, 43, 27, 6, '#DCECCB', '#79A17D', 1.3);
        circle(ctx, x + 23, y + 13, 3.2, '#9A8AC2');
      }
      storyText(ctx, features.onion ? 'ONION PEEL CELLS' : features.cheek ? 'CHEEK CELLS' : 'CELLS UNDER A LENS', 0, 62, 10, '#4C7462');
    } else {
      drawCellIcon(ctx, -2, -8, features.onion || features.plant_cell ? 'plant' : 'animal', (0.7 + view * 0.13) * pulse, 'all', features);
      if (features.cell_wall) { arrow(ctx, 72, -19, 94, -35, '#E2A850', 2); storyText(ctx, 'cell wall', 88, -43, 9); }
      if (features.nucleus) { arrow(ctx, 69, 5, 94, 8, '#A696CF', 2); storyText(ctx, 'nucleus', 97, 1, 9); }
      storyText(ctx, ['Whole specimen', 'Cell group', 'One cell'][view], 0, 67, 10, '#4C7462');
    }
    return true;
  }
  if (type === 'cell_parts') {
    const highlight = ['membrane', 'wall', 'all'][panelIndex];
    drawCellIcon(ctx, 0, -3, features.plant_cell ? 'plant' : 'animal', pulse, highlight, features);
    const candidates = [
      ['cell membrane', 'cell_membrane', -88, -51, -47, -28], ['cytoplasm', 'cytoplasm', 89, 44, 42, 20],
      ['nucleus', 'nucleus', 82, -37, 18, -9], ['cell wall', 'cell_wall', -86, -57, -47, -31],
      ['vacuole', 'vacuole', 91, 47, 25, 15], ['chloroplast', 'chloroplast', -86, 54, -30, 15],
    ];
    const available = candidates.filter(([, key]) => features[key]);
    const annotations = available.slice(panelIndex === 0 ? 0 : panelIndex === 1 ? 2 : 4, panelIndex === 0 ? 2 : panelIndex === 1 ? 4 : 6);
    for (const [name, , tx, ty, px, py] of annotations) {
      arrow(ctx, tx < 0 ? tx + 20 : tx - 17, ty + (ty < 0 ? 4 : -4), px, py, '#718B7B', 1.2);
      storyText(ctx, name, tx, ty, 8, '#516E62', 'center', 700);
    }
    return true;
  }
  if (type === 'cell_compare') {
    const focusCell = Math.max(0, Math.min(2, Math.round(Number(params.cell_view ?? 2))));
    if (panelIndex === 0) {
      ctx.save(); ctx.globalAlpha = focusCell === 1 ? 0.5 : 1;
      storyText(ctx, 'PLANT CELL', -55, -64, 10, '#4F7864'); drawCellIcon(ctx, -56, 0, 'plant', 0.78, focusCell === 0 ? 'wall' : 'all'); ctx.restore();
      storyText(ctx, 'wall · chloroplasts · large vacuole', -55, 59, 8, '#607D6E', 'center', 600);
    } else if (panelIndex === 1) {
      ctx.save(); ctx.globalAlpha = focusCell === 0 ? 0.5 : 1;
      storyText(ctx, 'ANIMAL CELL', 54, -64, 10, '#9B6C63'); drawCellIcon(ctx, 54, 0, 'animal', 0.82, focusCell === 1 ? 'membrane' : 'all'); ctx.restore();
      storyText(ctx, 'membrane · nucleus · cytoplasm', 54, 59, 8, '#8B6B64', 'center', 600);
    } else {
      ctx.save(); ctx.globalAlpha = focusCell === 1 ? 0.48 : 1; drawCellIcon(ctx, -57, -1, 'plant', 0.72, focusCell === 0 ? 'wall' : 'all'); ctx.restore();
      ctx.save(); ctx.globalAlpha = focusCell === 0 ? 0.48 : 1; drawCellIcon(ctx, 58, -1, 'animal', 0.72, focusCell === 1 ? 'membrane' : 'all'); ctx.restore();
      arrow(ctx, -5, 0, 5, 0, '#E0A75A', 2); storyText(ctx, focusCell === 2 ? 'Both are cells; some parts differ' : `Focused view · ${focusCell === 0 ? 'plant cell' : 'animal cell'}`, 0, 59, 9, '#526F64');
    }
    return true;
  }
  if (type === 'cell_specialisation') {
    const available = [['muscle_cell', features.muscle_cell], ['nerve_cell', features.nerve_cell], ['xylem', features.xylem]]
      .filter(([, present]) => present).map(([name]) => name);
    const kind = available[panelIndex] || available[0] || 'nerve_cell';
    if (kind === 'muscle_cell') {
      for (const x of [-45, 0, 45]) {
        ctx.save(); ctx.translate(x, -3); ctx.rotate(Math.PI / 2);
        ctx.beginPath(); ctx.ellipse(0, 0, 26, 9, 0, 0, TAU); ctx.fillStyle = '#F0C1A5'; ctx.fill(); ctx.strokeStyle = '#BB816F'; ctx.lineWidth = 1.5; ctx.stroke(); circle(ctx, 0, 0, 4, '#A696CF'); ctx.restore();
      }
      storyText(ctx, 'MUSCLE CELLS', 0, 55, 10); storyText(ctx, 'spindle-shaped', 0, 70, 8, '#71877A', 'center', 600);
    } else if (kind === 'nerve_cell') {
      line(ctx, -72, 0, 45, 0, '#D4AC76', 5);
      const branches = [[-48,-37],[-24,-45],[0,-34],[39,-32],[-48,37],[-21,43],[5,34],[45,32]];
      branches.forEach(([x, y]) => line(ctx, -12, 0, x, y, '#D4AC76', 2));
      circle(ctx, -11, 0, 15, '#CFB9DD', '#937BA7', 1.5); circle(ctx, -14, -2, 4, '#765D91');
      arrow(ctx, 38, 0, 86, 0, '#E0A75A', 2.4); storyText(ctx, 'NERVE CELL · carries messages', 0, 64, 9);
    } else {
      storyRoundedRect(ctx, -74, -31, 45, 65, 13, '#D8E9C6', '#739B78', 2);
      storyRoundedRect(ctx, -15, -31, 45, 65, 13, '#D8E9C6', '#739B78', 2);
      storyRoundedRect(ctx, 44, -31, 45, 65, 13, '#D8E9C6', '#739B78', 2);
      [-52, 7, 66].forEach((x) => { line(ctx, x, -21, x, 24, '#8BB38B', 2); arrow(ctx, x, 2, x, -17, '#89A7D4', 1.4); });
      storyText(ctx, 'XYLEM CELLS · water tubes', 0, 62, 9);
    }
    return true;
  }
  if (type === 'cell_organisation') {
    if (panelIndex === 0) {
      for (let row = 0; row < 3; row += 1) for (let col = 0; col < 4; col += 1) {
        const x = -84 + col * 49, y = -28 + row * 28;
        storyRoundedRect(ctx, x, y, 42, 22, 5, '#E4D9ED', '#A291B3', 1.2); circle(ctx, x + 21, y + 11, 3, '#8F79A6');
      }
      storyText(ctx, 'SIMILAR CELLS', 0, 64, 10);
    } else if (panelIndex === 1) {
      storyRoundedRect(ctx, -102, -26, 48, 48, 13, '#E4D9ED', '#A291B3', 1.6); storyText(ctx, 'cell', -78, 0, 9);
      arrow(ctx, -48, -2, -25, -2, '#83A797', 2);
      storyRoundedRect(ctx, -23, -31, 63, 56, 12, '#F4D8A4', '#CC9B58', 1.7); storyText(ctx, 'tissue', 8, -2, 10);
      arrow(ctx, 44, -2, 65, -2, '#83A797', 2);
      storyRoundedRect(ctx, 68, -31, 48, 56, 12, '#EFC7B8', '#C27F70', 1.7); storyText(ctx, 'organ', 92, -2, 9);
      storyText(ctx, 'cells work together', 0, 56, 9, '#647C6F', 'center', 600);
    } else {
      const labels = ['cell', ...(features.tissue ? ['tissue'] : []), ...(features.organ ? ['organ'] : []), ...(features.organ_system ? ['system'] : [])];
      const colors = ['#E3D2E9', '#F1D5A4', '#EFC4B5', '#BDDCCA'];
      const parts = labels.map((name, index) => ({ name, x: (index - (labels.length - 1) / 2) * 57, w: 38, h: 33, c: colors[index] }));
      parts.forEach((p, i) => { storyRoundedRect(ctx, p.x-p.w/2, -p.h/2, p.w, p.h, 7, p.c, '#A9B6A4', 1.2); storyText(ctx,p.name,p.x,0,8); if (i < parts.length-1) arrow(ctx, p.x+p.w/2+2, 0, parts[i+1].x-parts[i+1].w/2-2, 0, '#829F8B', 1.7); });
      storyText(ctx, labels.join(' → '), 0, 55, 9);
    }
    return true;
  }
  if (type === 'microbe_diversity') {
    if (panelIndex === 0) {
      for (let i = 0; i < 5; i += 1) { ctx.save(); ctx.translate(-74+i*36, -2+Math.sin(time*2+i)*3); ctx.rotate(i*0.22); storyRoundedRect(ctx,-12,-5,24,10,5,'#D8E9B7','#7A9C68',1); ctx.restore(); }
      storyText(ctx, features.bacteria ? 'BACTERIA' : 'MICROSCOPIC LIFE', 0, 42, 10);
    } else if (panelIndex === 1) {
      ctx.beginPath(); ctx.moveTo(-61,8); ctx.bezierCurveTo(-86,-25,-45,-44,-20,-27); ctx.bezierCurveTo(2,-42,45,-25,31,-4); ctx.bezierCurveTo(61,23,22,41,-5,24); ctx.bezierCurveTo(-35,46,-67,34,-61,8); ctx.fillStyle='#D9D1E9'; ctx.fill(); ctx.strokeStyle='#8977A8'; ctx.lineWidth=2; ctx.stroke();
      circle(ctx,-12,1,7,'#9A84BB'); for(let i=0;i<5;i++) circle(ctx,-42+i*18,26-Math.sin(i)*7,2.8,'#B79BC8');
      storyText(ctx, features.amoeba ? 'AMOEBA · one cell' : features.protozoa ? 'PROTOZOA · one-celled life' : 'A microscopic organism', 0, 57, 9);
    } else {
      const groups = [['fungi', 'FUNGI'], ['algae', 'ALGAE'], ['virus', 'VIRUSES'], ['protozoa', 'PROTOZOA'], ['bacteria', 'BACTERIA']]
        .filter(([key]) => features[key]).slice(0, 3);
      if (!groups.length) groups.push(['microbes', 'MICROBES']);
      const gap = 63, left = -((groups.length - 1) * gap) / 2;
      groups.forEach(([kind, name], index) => {
        const x = left + index * gap;
        if (kind === 'fungi') {
          storyRoundedRect(ctx,x-11,-15,22,32,8,'#ECD6B3','#BF9B6B',1.5); circle(ctx,x,-16,15,'#D9B77D','#BF9B6B',1.4); circle(ctx,x,-16,4,'#9A84BB');
        } else if (kind === 'algae') {
          ctx.save();ctx.translate(x,0);ctx.rotate(-.35);storyRoundedRect(ctx,-17,-9,34,18,9,'#B8DAB1','#759B71',1.5);circle(ctx,-7,0,3,'#5F986A');circle(ctx,7,0,3,'#5F986A');ctx.restore();
        } else if (kind === 'virus') {
          ctx.beginPath();ctx.arc(x,0,19,0,TAU);ctx.fillStyle='#F0D9D6';ctx.fill();ctx.strokeStyle='#BD8078';ctx.lineWidth=1.6;ctx.stroke();
          for(let i=0;i<8;i++){const a=i*TAU/8;line(ctx,x+Math.cos(a)*18,Math.sin(a)*18,x+Math.cos(a)*25,Math.sin(a)*25,'#BD8078',1.3);circle(ctx,x+Math.cos(a)*27,Math.sin(a)*27,2,'#E2A18F');}
        } else if (kind === 'bacteria') {
          for(let i=0;i<3;i++){ctx.save();ctx.translate(x-12+i*12,Math.sin(i+time)*5);ctx.rotate(i*.3);storyRoundedRect(ctx,-8,-4,16,8,4,'#D8E9B7','#7A9C68',1);ctx.restore();}
        } else {
          ctx.beginPath();ctx.ellipse(x,0,20,15,0,0,TAU);ctx.fillStyle='#D9D1E9';ctx.fill();ctx.strokeStyle='#8977A8';ctx.stroke();circle(ctx,x,0,5,'#9A84BB');
        }
        storyText(ctx,name,x,33,8);
      });
      if (features.virus_host) storyText(ctx, 'Viruses reproduce inside a host', 0, 53, 7, '#7E7772', 'center', 600);
    }
    return true;
  }
  if (type === 'decomposition') {
    if (panelIndex === 0) {
      line(ctx,-110,37,110,37,'#927452',3);
      for(let i=0;i<4;i++){ctx.save();ctx.translate(-62+i*40,-4+Math.sin(time+i)*3);ctx.rotate(-0.45+i*.22);ctx.beginPath();ctx.ellipse(0,0,14,7,0,0,TAU);ctx.fillStyle=['#DCA96C','#B9A362','#85A876','#C77E66'][i];ctx.fill();ctx.strokeStyle='#8A805C';ctx.stroke();line(ctx,-12,0,12,0,'#7E795A',.8);ctx.restore();}
      const waste = [features.dead_plant && 'plant matter', features.dead_animal && 'animal matter'].filter(Boolean).join(' + ') || 'organic matter';
      storyText(ctx,waste.toUpperCase(),0,61,8);
    } else if (panelIndex === 1) {
      storyRoundedRect(ctx,-91,-28,60,50,12,'#D6B77F','#A17E4D',1.5); storyText(ctx,'waste',-61,-3,9);
      arrow(ctx,-23,-3,14,-3,'#89A797',2.2);
      for(let i=0;i<7;i++){const x=28+(i%4)*18,y=-15+Math.floor(i/4)*29+Math.sin(time*2+i)*3;circle(ctx,x,y,5,['#91B987','#D8A978','#9AB4D3'][i%3],'#FFF8E9',1);}
      const helpers = [features.bacteria && 'bacteria', features.fungi && 'fungi'].filter(Boolean).join(' + ') || (features.decomposer ? 'decomposers' : 'breakdown');
      storyText(ctx,helpers.toUpperCase(),70,43,8);
    } else {
      storyRoundedRect(ctx,-102,-19,54,39,11,'#D6B77F','#A17E4D',1.4); storyText(ctx,'waste',-75,1,8);
      arrow(ctx,-45,0,-20,0,'#829F8B',1.8);
      circle(ctx,0,0,20,'#DCE9C8','#91AB7D',1.5); storyText(ctx,'soil',0,1,8);
      arrow(ctx,24,0,46,0,'#829F8B',1.8);
      if (features.nutrients) { drawStoryPlant(ctx,76,26,.55,time); storyText(ctx,'nutrients return to soil',0,63,8); }
      else storyText(ctx,'material is broken down',0,63,8);
    }
    return true;
  }
  if (type === 'yeast_fermentation') {
    const condition = Math.max(0, Math.min(2, Math.round(Number(params.yeast_condition ?? 2))));
    const drawBowl = (x, yeastAdded, selected = true) => {
      ctx.save(); ctx.globalAlpha = selected ? 1 : 0.62;
      storyRoundedRect(ctx,x-44,5,88,38,15,yeastAdded?'#F2D5A7':'#E9D9C6',selected?'#C99558':'#A98F77',selected?2.6:1.4);
      ctx.beginPath(); ctx.ellipse(x,7,42,12,0,0,Math.PI); ctx.fillStyle=yeastAdded?'#EBC783':'#D9C5A7'; ctx.fill();
      if(yeastAdded){for(let i=0;i<5;i++){const bx=x-25+i*12, by=-8-Math.abs(Math.sin(time*2.4+i))*22;circle(ctx,bx,by,3.5,'#E7B16C','#FFF7E4',1);}
        if(features.balloon){storyRoundedRect(ctx,x-17,-42-Math.abs(Math.sin(time*1.5))*7,34,37,15,'#F0C4B0','#B87569',1.5);line(ctx,x, -6, x, -37-Math.abs(Math.sin(time*1.5))*7,'#B87569',1.2);}
        else {ctx.beginPath();ctx.ellipse(x, -2, 29, 14+Math.abs(Math.sin(time*1.5))*5, 0, Math.PI, TAU);ctx.fillStyle='#E5B66F';ctx.fill();ctx.strokeStyle='#BE9360';ctx.lineWidth=1.2;ctx.stroke();}}
      else storyRoundedRect(ctx,x-13,-21,26,17,9,'#F0DDD0','#BDA792',1.1);
      ctx.restore();
    };
    if(panelIndex===0){drawBowl(-49,true,condition!==1);drawBowl(53,false,condition!==0);
      const ingredients=['yeast',features.sugar?'sugar':'',features.warm_water?'warm water':''].filter(Boolean).join(' + ');
      storyText(ctx,`A: ${ingredients || 'yeast added'}`,-49,63,7);storyText(ctx,'B: no yeast',53,63,8);}
    else if(panelIndex===1){drawBowl(0,condition!==1);storyText(ctx,condition===1?'No yeast added':'Yeast acts on the dough',0,63,9);}
    else {drawBowl(-54,condition!==1,condition!==1);drawBowl(54,false,condition!==0);storyText(ctx,condition===0?'Selected: yeast added':'Compare: dough rises with yeast',0,63,9);storyText(ctx,'and stays denser without it',0,76,8,'#71877A','center',600);}
    return true;
  }
  if (type === 'curd_fermentation') {
    const condition = Math.max(0, Math.min(2, Math.round(Number(params.curd_condition ?? 2))));
    const bowl = (x, success) => {
      ctx.beginPath();ctx.moveTo(x-40,-7);ctx.quadraticCurveTo(x-35,40,x,43);ctx.quadraticCurveTo(x+35,40,x+40,-7);ctx.closePath();ctx.fillStyle=success?'#F5F0DE':'#E9E0CF';ctx.fill();ctx.strokeStyle='#A89C84';ctx.lineWidth=1.8;ctx.stroke();
      ctx.beginPath();ctx.ellipse(x,-7,40,10,0,0,TAU);ctx.fillStyle=success?'#FFFDF2':'#F6F1E7';ctx.fill();ctx.strokeStyle='#A89C84';ctx.stroke();
      if(success){for(let i=0;i<5;i++){const bx=x-20+i*10, by=-16-Math.abs(Math.sin(time*2+i))*11;circle(ctx,bx,by,3,'#E6B46D','#FFF6DC',1);}}
    };
    if(panelIndex===0){bowl(-58,false);bowl(58,condition!==1);storyText(ctx,'MILK + CURD STARTER',0,58,9);}
    else if(panelIndex===1){bowl(0,condition!==1);storyText(ctx,condition===1?'No starter: milk stays liquid':features.lactobacillus?'Lactobacillus acts on milk':'The starter acts on milk',0,59,9);if(features.warm_conditions)storyText(ctx,'in warm conditions',0,73,8,'#71877A','center',600);}
    else {bowl(-58,false);bowl(58,condition!==1);storyText(ctx,condition===0?'Selected: starter added':'Compare the two bowls',0,58,9);storyText(ctx,features.warm_conditions?'the inoculated warm bowl sets':'the bowl with starter sets',0,73,8,'#71877A','center',600);}
    return true;
  }
  if (type === 'rhizobium_root') {
    if(panelIndex===0){drawStoryPlant(ctx,0,43,.9,time);line(ctx,0,44,0,74,'#9C8769',1.5);for(let x of [-22,-10,10,22]) line(ctx,0,48,x,73,'#9C8769',1.3);storyText(ctx,'LEGUME ROOT',0,-69,10);}
    else if(panelIndex===1){line(ctx,0,-28,0,65,'#9C8769',4);for(let x of [-22,22]){line(ctx,0,-9,x,29,'#9C8769',2);for(let i=0;i<3;i++){circle(ctx,x+(i-1)*4,22+i*4,4,'#D7A8A3','#A57974',1);}}storyText(ctx,'ROOT NODULES',0,-55,10);for(let i=0;i<5;i++)circle(ctx,-10+i*5,24+Math.sin(time*2+i)*2,1.7,'#729C75');}
    else {line(ctx,0,-31,0,61,'#9C8769',4);for(let x of [-23,23]){line(ctx,0,-10,x,24,'#9C8769',2);circle(ctx,x,25,8,'#D7A8A3','#A57974',1);}storyText(ctx,features.rhizobium?'Rhizobium lives in nodules':features.bacteria?'Bacteria in root nodules':'Root nodules on a legume',0,67,9);}
    return true;
  }
  if (type === 'microalgae') {
    if(panelIndex===0){ctx.beginPath();ctx.ellipse(0,9,93,41,0,0,TAU);ctx.fillStyle='#D9ECE0';ctx.fill();ctx.strokeStyle='#7DA995';ctx.lineWidth=2;ctx.stroke();for(let i=0;i<15;i++){const x=-70+(i*37)%140,y=-8+(i*19)%34;ctx.save();ctx.translate(x,y);ctx.rotate(i*.45);storyRoundedRect(ctx,-6,-3,12,6,3,'#73A981','#528763',.8);ctx.restore();}storyText(ctx,'MICROALGAE IN WATER',0,67,9);}
    else if(panelIndex===1){for(let i=0;i<7;i++){const x=-78+i*25,y=Math.sin(time*2+i)*15;ctx.save();ctx.translate(x,y);ctx.rotate(i*.6);storyRoundedRect(ctx,-8,-4,16,8,4,'#7CB58A','#4F8B69',1);circle(ctx,0,0,2,'#E6C871');ctx.restore();}storyText(ctx,'Tiny organisms, seen close-up',0,51,9);}
    else {ctx.beginPath();ctx.ellipse(0,4,39,33,0,0,TAU);ctx.fillStyle='#D9ECE0';ctx.fill();ctx.strokeStyle='#7DA995';ctx.lineWidth=2;ctx.stroke();for(let i=0;i<8;i++)circle(ctx,-23+(i*13)%46,-13+(i*17)%30,3.4,'#69A978','#EAF6E6',.8);storyText(ctx,'A microscopic world',0,53,9);storyText(ctx,'explore the uses named in your chapter',0,68,7,'#71877A','center',600);}
    return true;
  }
  if(type==='biogas_digester'){
    if(panelIndex===0){storyRoundedRect(ctx,-54,-16,108,66,20,'#CADFD1','#6F9B87',2);storyRoundedRect(ctx,-46,-8,92,49,15,'#E6E5C7','#9EAD83',1);line(ctx,0,-15,0,-44,'#6F9B87',3);storyRoundedRect(ctx,-18,-57,36,19,8,'#D9E9E8','#6F9B87',1.4);storyText(ctx,'WASTE ENTERS',0,69,9);}
    else if(panelIndex===1){storyRoundedRect(ctx,-54,-16,108,66,20,'#CADFD1','#6F9B87',2);storyRoundedRect(ctx,-46,-8,92,49,15,'#E6E5C7','#9EAD83',1);for(let i=0;i<8;i++){const x=-30+(i*17)%60,y=22-Math.abs(Math.sin(time*2.2+i))*27;circle(ctx,x,y,3.3,'#CFA66B','#FFF4DC',.8);}line(ctx,0,-15,0,-47,'#6F9B87',3);circle(ctx,0,-57,9,'#E7C17E','#FFF4DC',1.3);storyText(ctx,features.decomposer?'MICROBES BREAK IT DOWN':'WASTE BREAKS DOWN',0,69,8);}
    else {storyRoundedRect(ctx,-54,-16,108,66,20,'#CADFD1','#6F9B87',2);storyRoundedRect(ctx,-46,-8,92,49,15,'#E6E5C7','#9EAD83',1);line(ctx,0,-15,0,-45,'#6F9B87',3);for(let i=0;i<4;i++)circle(ctx,-22+i*15,-58-Math.sin(time*2+i)*3,5,'#E8BE73','#FFF4DC',1);storyText(ctx,'BIOGAS',0,69,10);}
    return true;
  }
  return false;
}

function drawStoryProp(ctx, type, x, y, width, height, time, panelIndex, simulation, params) {
  const scale = Math.min(width / 260, height / 175, 1.3);
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  if (drawLessonStoryProp(ctx, type, time, panelIndex, simulation, params)) { ctx.restore(); return; }
  if (type === 'counting') {
    if (simulation.model === 'math_place_value') {
      const thousands = Math.max(0, Math.min(9, Math.round(Number(params.thousands ?? 0))));
      const hundreds = Math.max(0, Math.min(9, Math.round(Number(params.hundreds ?? 3))));
      const tens = Math.max(0, Math.min(9, Math.round(Number(params.tens ?? 4))));
      const ones = Math.max(0, Math.min(9, Math.round(Number(params.ones ?? 2))));
      const number = thousands * 1000 + hundreds * 100 + tens * 10 + ones;
      const columnX = [-90, -30, 30, 90];
      const digits = [thousands, hundreds, tens, ones];
      const digitLabels = ['THOUSANDS', 'HUNDREDS', 'TENS', 'ONES'];
      if (panelIndex === 0) {
        const leadingUnit = thousands ? 'thousand' : 'hundred';
        const count = Math.max(1, Math.min(5, thousands || hundreds));
        for (let block = 0; block < count; block += 1) {
          const offsetX = (block - (count - 1) / 2) * 18;
          ctx.fillStyle = '#72AE9A'; ctx.fillRect(offsetX - 6, -19, 12, 38);
          ctx.strokeStyle = '#EAF6EB'; ctx.lineWidth = 1;
          for (let row = 1; row < 5; row += 1) line(ctx, offsetX - 6, -19 + row * 7.6, offsetX + 6, -19 + row * 7.6, '#EAF6EB', 0.7);
          line(ctx, offsetX, -19, offsetX, 19, '#EAF6EB', 0.7);
        }
        label(ctx, `${thousands || hundreds} ${leadingUnit}${(thousands || hundreds) === 1 ? '' : 's'}`, -43, 42, 14, '#56796B', 700);
      } else if (panelIndex === 1) {
        digits.forEach((digit, column) => {
          const cx = columnX[column];
          ctx.font = '700 10px Inter, Arial, sans-serif'; ctx.textAlign = 'center';
          ctx.fillStyle = '#779487'; ctx.fillText(digitLabels[column], cx, -34);
          for (let item = 0; item < Math.min(digit, 6); item += 1) {
            const y = 1 + item * 9;
            if (column === 0) {
              ctx.fillStyle = '#72AE9A'; ctx.fillRect(cx - 5, y - 3.3, 10, 6.6);
              line(ctx, cx - 5, y - 0.5, cx + 5, y - 0.5, '#EAF6EB', 0.7);
              line(ctx, cx, y - 3.3, cx, y + 3.3, '#EAF6EB', 0.7);
            } else if (column === 1) {
              ctx.beginPath(); ctx.roundRect(cx - 3.5, y - 4, 7, 8, 2); ctx.fillStyle = '#E8AC67'; ctx.fill();
            } else circle(ctx, cx, y, 3.5, '#8C9FCE', '#F8F6E8', 0.8);
          }
          ctx.font = '700 12px Inter, Arial, sans-serif'; ctx.fillStyle = '#58796C';
          ctx.fillText(String(digit), cx, 68);
        });
      } else {
        ctx.beginPath(); ctx.roundRect(-87, -30, 174, 62, 14); ctx.fillStyle = '#EEF4E9'; ctx.fill(); ctx.strokeStyle = '#BBD1BF'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.font = '700 31px Inter, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#416D5C';
        ctx.fillText(String(number), 0, -3);
        ctx.font = '600 11px Inter, Arial, sans-serif'; ctx.fillStyle = '#71877A'; ctx.fillText(`${thousands} thousands + ${hundreds} hundreds + ${tens} tens + ${ones} ones`, 0, 49);
      }
      ctx.restore();
      return;
    }
    if (simulation.model === 'math_arithmetic') {
      const a = Math.max(0, Math.min(1000, Math.round(Number(params.operandA ?? 34))));
      const subtraction = Number(params.operation ?? 0) === 1;
      const requestedB = Math.max(0, Math.min(1000, Math.round(Number(params.operandB ?? 25))));
      const b = subtraction ? Math.min(a, requestedB) : requestedB;
      const result = subtraction ? a - b : a + b;
      const wideNumbers = Math.max(a, b, result) > 20;
      const drawTokens = (count, centerX, color, crossed = false) => {
        for (let index = 0; index < count; index += 1) {
          const col = index % 5, row = Math.floor(index / 5);
          const px = centerX + (col - (Math.min(count, 5) - 1) / 2) * 12;
          const py = row * 12 - Math.max(0, Math.ceil(count / 5) - 1) * 6;
          circle(ctx, px, py, 4.8, color, '#FFF9EB', 1);
          if (crossed) line(ctx, px - 5, py + 5, px + 5, py - 5, '#BD625C', 1.8);
        }
      };
      const drawBaseTen = (value, centerX, color, heading, showValue = true) => {
        const digits = [Math.floor(value / 100), Math.floor(value / 10) % 10, value % 10];
        const names = ['H', 'T', 'O'];
        const groupX = [centerX - 38, centerX, centerX + 38];
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '700 9px Inter, Arial, sans-serif'; ctx.fillStyle = '#71877A';
        ctx.fillText(heading, centerX, -47);
        digits.forEach((digit, groupIndex) => {
          const gx = groupX[groupIndex];
          ctx.font = '700 9px Inter, Arial, sans-serif'; ctx.fillStyle = '#71877A';
          ctx.fillText(names[groupIndex], gx, -32);
          for (let item = 0; item < digit; item += 1) {
            const px = gx + (item % 3 - 1) * 8;
            const py = -13 + Math.floor(item / 3) * 9;
            if (groupIndex === 0) {
              ctx.fillStyle = color; ctx.fillRect(px - 3.3, py - 3.3, 6.6, 6.6);
              line(ctx, px - 3.3, py, px + 3.3, py, '#F7F5E9', 0.65);
              line(ctx, px, py - 3.3, px, py + 3.3, '#F7F5E9', 0.65);
            } else if (groupIndex === 1) {
              ctx.beginPath(); ctx.roundRect(px - 2.1, py - 6.2, 4.2, 12.4, 2); ctx.fillStyle = color; ctx.fill();
            } else {
              circle(ctx, px, py, 3, color, '#FFF9EB', 0.7);
            }
          }
          ctx.font = '700 10px Inter, Arial, sans-serif'; ctx.fillStyle = '#496A5D';
          ctx.fillText(String(digit), gx, 29);
        });
        if (showValue) {
          ctx.font = '700 12px Inter, Arial, sans-serif'; ctx.fillStyle = '#426D5D';
          ctx.fillText(String(value), centerX, 47);
        }
      };
      if (panelIndex === 0) {
        if (wideNumbers) drawBaseTen(a, 0, '#70B4A3', 'START WITH A');
        else { label(ctx, `Start with ${a}`, -38, -38, 14, '#56796B', 700); drawTokens(a, 0, '#70B4A3'); }
      } else if (panelIndex === 1) {
        if (wideNumbers) {
          drawBaseTen(a, -58, '#70B4A3', 'A', false);
          drawBaseTen(b, 58, subtraction ? '#E38375' : '#E8AC67', 'B', false);
          label(ctx, subtraction ? '−' : '+', -7, 5, 22, '#5A746B', 700);
          label(ctx, `${a} ${subtraction ? '−' : '+'} ${b}`, -42, 49, 13, '#56796B', 700);
        } else {
          drawTokens(a, -58, '#70B4A3');
          drawTokens(b, 58, subtraction ? '#E38375' : '#E8AC67', subtraction);
          label(ctx, subtraction ? '−' : '+', -7, 6, 22, '#5A746B', 700);
          label(ctx, subtraction ? `${a} − ${b}` : `${a} + ${b}`, -36, 48, 15, '#56796B', 700);
        }
      } else {
        if (wideNumbers) drawBaseTen(result, 0, '#86A6CB', 'THE RESULT');
        else { drawTokens(result, 0, '#86A6CB'); label(ctx, `${a} ${subtraction ? '−' : '+'} ${b} = ${result}`, -61, 48, 15, '#426D5D', 700); }
      }
      ctx.restore();
      return;
    }
    const colors = ['#E8AC67', '#70B4A3', '#8C9FCE', '#E38276', '#D5B764'];
    const groups = panelIndex === 2 ? [5] : [3, 2];
    let cursor = groups.length === 1 ? -70 : -88;
    groups.forEach((amount, groupIndex) => {
      for (let i = 0; i < amount; i += 1) {
        const drift = groupIndex === 1 && panelIndex === 1 ? Math.sin(time * 2.3 + i) * 3 : 0;
        circle(ctx, cursor + i * 18 + drift, 6 + Math.sin(time * 2 + i) * 1.4, 7.5, colors[(i + groupIndex * 2) % colors.length], '#FFF8E9', 1.3);
      }
      cursor += amount * 18 + 30;
    });
    if (groups.length > 1) { line(ctx, -25, 7, 25, 7, '#9DAF9F', 2, [3, 5]); }
  } else if (type === 'water_cycle' || type === 'cycle') {
    const radius = 62;
    ctx.beginPath(); ctx.arc(0, 0, radius, -Math.PI * 0.83, Math.PI * 1.08); ctx.strokeStyle = '#75AFA4'; ctx.lineWidth = 3; ctx.setLineDash([7, 6]); ctx.stroke(); ctx.setLineDash([]);
    const phase = (time / 5 + panelIndex / 3) * TAU;
    const px = Math.cos(phase) * radius, py = Math.sin(phase) * radius;
    circle(ctx, -radius, 0, 15, '#E9B866', '#FFF3CE', 1);
    circle(ctx, radius, 0, 12, type === 'water_cycle' ? '#82B8D0' : '#87B894', '#F5FAF1', 1);
    circle(ctx, px, py, 7, '#F0A86F', '#FFF4DD', 1);
  } else if (type === 'motion') {
    line(ctx, -118, 21, 118, 21, '#98AA9D', 3);
    for (let i = 0; i < 9; i += 1) line(ctx, -112 + i * 28, 22, -102 + i * 28, 28, '#CAD4C8', 2);
    const travel = ((time / 5 + panelIndex / 3) % 1) * 176 - 88;
    ctx.beginPath(); ctx.roundRect(travel - 20, -3, 40, 22, 7); ctx.fillStyle = '#E8B36F'; ctx.fill();
    circle(ctx, travel - 10, 21, 6, '#496A70'); circle(ctx, travel + 10, 21, 6, '#496A70');
    for (let i = 0; i < 3; i += 1) line(ctx, travel - 38 - i * 12, 4, travel - 30 - i * 12, 4, '#78A99B', 2);
  } else if (type === 'timeline') {
    ctx.beginPath(); ctx.moveTo(-112, 20); ctx.bezierCurveTo(-48, -8, 45, 45, 112, 8); ctx.strokeStyle = '#83A89B'; ctx.lineWidth = 4; ctx.stroke();
    [-88, 0, 88].forEach((px, index) => {
      circle(ctx, px, index === 1 ? 9 : index === 0 ? 3 : 19, 8, index === panelIndex ? '#E6AA63' : '#76A99B', '#F8F4E9', 2);
      line(ctx, px, index === 1 ? 1 : index === 0 ? -5 : 11, px, -28, '#8AA69A', 2);
      ctx.beginPath(); ctx.moveTo(px, -28); ctx.lineTo(px + 18, -22); ctx.lineTo(px, -16); ctx.closePath(); ctx.fillStyle = '#E9BE7B'; ctx.fill();
    });
  } else if (type === 'biology') {
    circle(ctx, 0, 0, 42, '#BDE1C1', '#5F9D72', 2);
    circle(ctx, -10, 3, 12, '#A79ACD', '#fff', 1.5);
    [[-27,-20], [26,-19], [28,19], [-28,22], [5,-31]].forEach(([px, py], i) => circle(ctx, px, py, 5 + (i % 2), '#E7B978', '#FAF2D9', 1));
    label(ctx, 'parts working together', -74, 68, 11, '#58736B', 600);
  } else if (type === 'language') {
    ctx.save(); ctx.rotate(-0.035);
    ctx.beginPath(); ctx.moveTo(-98, -30); ctx.quadraticCurveTo(-44, -44, 0, -20); ctx.quadraticCurveTo(44, -44, 98, -30); ctx.lineTo(98, 35); ctx.quadraticCurveTo(46, 16, 0, 38); ctx.quadraticCurveTo(-47, 16, -98, 35); ctx.closePath(); ctx.fillStyle = '#FFFDF7'; ctx.fill(); ctx.strokeStyle = '#B7C5B7'; ctx.lineWidth = 2; ctx.stroke();
    for (let i = 0; i < 3; i += 1) { line(ctx, -75, -10 + i * 14, -17, -10 + i * 14, '#87A89A', 3); line(ctx, 17, -10 + i * 14, 76 - i * 9, -10 + i * 14, '#D2B77C', 3); }
    ctx.restore();
  } else {
    ctx.beginPath(); ctx.ellipse(0, 12, 74, 25, 0, 0, TAU); ctx.fillStyle = '#D5E6D8'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(-55, 8); ctx.quadraticCurveTo(-58, -44, 0, -54); ctx.quadraticCurveTo(55, -44, 56, 8); ctx.lineTo(0, 34); ctx.closePath(); ctx.fillStyle = '#FFFDF6'; ctx.fill(); ctx.strokeStyle = '#AABFAE'; ctx.lineWidth = 2; ctx.stroke();
    line(ctx, -35, -13, -5, -13, '#84A899', 3); line(ctx, 8, -13, 37, -13, '#D5B777', 3); line(ctx, -31, -2, 30, -2, '#C5D3C8', 2);
    for (let i = 0; i < 4; i += 1) { const sparkle = (time * 1.1 + i * 1.57) % TAU; circle(ctx, Math.cos(sparkle) * 89, Math.sin(sparkle) * 38 - 4, 3.5, '#E9B66B'); }
  }
  ctx.restore();
}

function drawStoryBubble(ctx, x, y, width, height, text, active, scale, tailRatio = 0.55) {
  ctx.save();
  ctx.beginPath(); ctx.roundRect(x, y, width, height, 13 * scale); ctx.fillStyle = active ? '#FFFDF8' : '#F5F4ED'; ctx.fill();
  ctx.strokeStyle = active ? '#C4D7CA' : '#DADFD6'; ctx.lineWidth = 1.3 * scale; ctx.stroke();
  const tailX = x + width * tailRatio;
  ctx.beginPath(); ctx.moveTo(tailX - 8 * scale, y + height); ctx.lineTo(tailX, y + height + 10 * scale); ctx.lineTo(tailX + 8 * scale, y + height); ctx.closePath(); ctx.fillStyle = active ? '#FFFDF8' : '#F5F4ED'; ctx.fill(); ctx.strokeStyle = active ? '#C4D7CA' : '#DADFD6'; ctx.stroke();
  ctx.font = `600 ${Math.max(11, 17 * scale)}px Inter, Arial, sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const lines = wrappedLines(ctx, text, width - 30 * scale, 3);
  ctx.fillStyle = '#38535A';
  lines.forEach((lineText, index) => ctx.fillText(lineText, x + 15 * scale, y + height / 2 + (index - (lines.length - 1) / 2) * 21 * scale));
  ctx.restore();
}

function drawStorybookAnimation(ctx, width, height, time, simulation, params = {}) {
  const story = simulation.visual?.story || {};
  const panels = Array.isArray(story.panels) && story.panels.length ? story.panels.slice(0, 3) : [];
  const visualType = story.visualType || 'discovery';
  const scale = width / 960;
  const phase = ((time % 5) + 5) % 5 / 5;
  const hasStageControl = (simulation.controls || []).some((control) => control.key === 'stage');
  const selectedStage = Number(params.stage);
  const panelCount = Math.max(1, panels.length);
  const active = hasStageControl && Number.isFinite(selectedStage)
    ? Math.max(0, Math.min(panelCount - 1, Math.round(selectedStage))) : Math.min(panelCount - 1, Math.floor(phase * panelCount));
  ctx.fillStyle = '#F7F5EC'; ctx.fillRect(0, 0, width, height);
  ctx.save();
  for (let x = 14; x < width; x += 34 * scale) for (let y = 12; y < height; y += 34 * scale) {
    circle(ctx, x, y, Math.max(0.5, 0.75 * scale), '#DEDDCF');
  }
  ctx.restore();
  ctx.save();
  const title = story.topic || simulation.visual?.title || 'The chapter idea';
  ctx.font = `800 ${Math.max(10, 15 * scale)}px Inter, Arial, sans-serif`;
  ctx.fillStyle = '#45674F'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(story.sourceVisual ? 'CHAPTER-SPECIFIC VISUAL' : 'CHAPTER MODEL', width / 2, 28 * scale);
  ctx.font = `600 ${Math.max(9, 12 * scale)}px Inter, Arial, sans-serif`; ctx.fillStyle = '#85938A';
  ctx.fillText(String(title).toUpperCase(), width / 2, 47 * scale);

  const beatGap = 10 * scale, beatWidth = Math.min(288 * scale, (width - 56 * scale - beatGap * Math.max(0, panelCount - 1)) / panelCount);
  const totalBeatsWidth = beatWidth * panels.length + beatGap * Math.max(0, panels.length - 1);
  const beatStart = (width - totalBeatsWidth) / 2;
  panels.forEach((panel, index) => {
    const x = beatStart + index * (beatWidth + beatGap), y = 60 * scale, beatHeight = 39 * scale;
    if (index < panels.length - 1) line(ctx, x + beatWidth + 3 * scale, y + beatHeight / 2, x + beatWidth + beatGap - 3 * scale, y + beatHeight / 2, '#B9C9BC', 2 * scale);
    ctx.beginPath(); ctx.roundRect(x, y, beatWidth, beatHeight, 11 * scale);
    ctx.fillStyle = index === active ? '#527D69' : '#FFFEFA'; ctx.fill();
    ctx.lineWidth = 1 * scale; ctx.strokeStyle = index === active ? '#527D69' : '#D9DED3'; ctx.stroke();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = `800 ${Math.max(9, 11 * scale)}px Inter, Arial, sans-serif`; ctx.fillStyle = index === active ? '#FDFCF5' : '#8A9A8E';
    ctx.fillText(String(index + 1).padStart(2, '0'), x + 12 * scale, y + beatHeight / 2);
    ctx.font = `700 ${Math.max(8, 10.5 * scale)}px Inter, Arial, sans-serif`;
    let beatLabel = String(panel.beat || `DETAIL ${index + 1}`).toUpperCase();
    const labelWidth = beatWidth - 52 * scale;
    while (beatLabel.length > 4 && ctx.measureText(beatLabel).width > labelWidth) beatLabel = `${beatLabel.slice(0, -2).trimEnd()}…`;
    ctx.fillText(beatLabel, x + 42 * scale, y + beatHeight / 2);
  });

  const sceneX = 28 * scale, sceneY = 112 * scale, sceneWidth = width * 0.66, sceneHeight = height - sceneY - 24 * scale;
  const detailX = sceneX + sceneWidth + 14 * scale, detailWidth = width - detailX - 28 * scale;
  const card = (x, y, w, h, tint = '#FFFEFA') => {
    ctx.save(); ctx.shadowColor = 'rgba(64,93,75,.12)'; ctx.shadowBlur = 12 * scale; ctx.shadowOffsetY = 3 * scale;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 16 * scale); ctx.fillStyle = tint; ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.lineWidth = 1.4 * scale; ctx.strokeStyle = '#D9E3D8'; ctx.stroke(); ctx.restore();
  };
  card(sceneX, sceneY, sceneWidth, sceneHeight);
  card(detailX, sceneY, detailWidth, sceneHeight, active === 1 ? '#F2F7EF' : '#FFFEFA');
  ctx.fillStyle = '#739184'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.font = `800 ${Math.max(8, 10 * scale)}px Inter, Arial, sans-serif`;
  ctx.fillText('CHAPTER ILLUSTRATION', sceneX + 18 * scale, sceneY + 25 * scale);
  ctx.beginPath(); ctx.ellipse(sceneX + sceneWidth / 2, sceneY + sceneHeight * 0.58,
    sceneWidth * 0.34, sceneHeight * 0.29, 0, 0, TAU);
  ctx.fillStyle = '#EFF4E8'; ctx.fill(); ctx.strokeStyle = '#E0E9DE'; ctx.lineWidth = 1.2 * scale; ctx.stroke();
  drawStoryProp(ctx, visualType, sceneX + sceneWidth / 2, sceneY + sceneHeight * 0.57,
    Math.min(500 * scale, sceneWidth * 0.86), sceneHeight * 0.72, time, active, simulation, params);

  const detail = String(panels[active]?.dialogue || simulation.steps?.[active] || 'Inspect the chapter example and its labeled parts.')
    .replace(/^(?:Mira asks|Pip notices|Together):\s*/i, '');
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#4F806D'; ctx.font = `800 ${Math.max(9, 11 * scale)}px Inter, Arial, sans-serif`;
  ctx.fillText('SOURCE DETAIL', detailX + 16 * scale, sceneY + 30 * scale);
  line(ctx, detailX + 16 * scale, sceneY + 42 * scale, detailX + 82 * scale, sceneY + 42 * scale, '#E5AD5C', 3 * scale);
  ctx.fillStyle = '#38535A'; ctx.font = `600 ${Math.max(10, 15 * scale)}px Inter, Arial, sans-serif`;
  wrappedLines(ctx, detail, detailWidth - 32 * scale, 8)
    .forEach((text, index) => ctx.fillText(text, detailX + 16 * scale, sceneY + (76 + index * 21) * scale));
  const stepText = String(simulation.steps?.[active] || '').trim();
  if (stepText && stepText !== detail) {
    ctx.fillStyle = '#7B8E83'; ctx.font = `700 ${Math.max(8, 10 * scale)}px Inter, Arial, sans-serif`;
    ctx.fillText('LOOK FOR', detailX + 16 * scale, sceneY + sceneHeight - 58 * scale);
    ctx.fillStyle = '#5C7268'; ctx.font = `600 ${Math.max(9, 12 * scale)}px Inter, Arial, sans-serif`;
    wrappedLines(ctx, stepText, detailWidth - 32 * scale, 2)
      .forEach((text, index) => ctx.fillText(text, detailX + 16 * scale, sceneY + sceneHeight - (34 - index * 17) * scale));
  }
  ctx.restore();
}

function mathCanvasBackground(ctx, width, height) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#FFF2D6');
  gradient.addColorStop(0.52, '#FCE3E8');
  gradient.addColorStop(1, '#DDF5EE');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  for (let index = 0; index < 26; index += 1) {
    const x = (index * 97 + 31) % width;
    const y = 56 + ((index * 53 + 19) % Math.max(1, height - 76));
    circle(ctx, x, y, index % 3 === 0 ? 2.4 : 1.5, ['#F4B443', '#E77D73', '#51A991', '#8C75CB'][index % 4]);
  }
}

function drawMathItem(ctx, kind, x, y, radius, index = 0) {
  const colors = ['#F06F68', '#21A391', '#8066D2', '#F0AE39', '#4F9CDC', '#E58AB3'];
  const color = colors[index % colors.length];
  if (kind === 'flower') {
    for (let petal = 0; petal < 6; petal += 1) {
      const angle = petal * TAU / 6;
      circle(ctx, x + Math.cos(angle) * radius * 0.68, y + Math.sin(angle) * radius * 0.68,
        radius * 0.38, ['#15B9B0', '#22C0B5', '#F2C64A'][petal % 3], '#FFFFFF', 0.7);
    }
    circle(ctx, x, y, radius * 0.38, '#EF4B9B', '#FFFFFF', 1.2);
    circle(ctx, x, y, radius * 0.16, '#FFE27B');
    return;
  }
  if (kind === 'thread') {
    ctx.beginPath();
    ctx.moveTo(x - radius, y + radius * 0.25);
    ctx.bezierCurveTo(x - radius * 0.4, y - radius, x + radius * 0.35, y + radius, x + radius, y - radius * 0.18);
    ctx.strokeStyle = ['#F36B55', '#F2B936', '#E75CA7'][index % 3];
    ctx.lineWidth = Math.max(2, radius * 0.35);
    ctx.lineCap = 'round'; ctx.stroke();
    circle(ctx, x - radius * 0.75, y + radius * 0.22, radius * 0.16, '#FFD45D');
    circle(ctx, x + radius * 0.72, y - radius * 0.15, radius * 0.16, '#FFD45D');
    return;
  }
  if (kind === 'sweet') {
    circle(ctx, x, y + radius * 0.07, radius * 0.82, '#F5AE43', '#D47A2B', 1.2);
    circle(ctx, x - radius * 0.25, y - radius * 0.24, radius * 0.16, '#FFE8A9');
    for (let crumb = 0; crumb < 5; crumb += 1) {
      circle(ctx, x + Math.cos(crumb * TAU / 5) * radius * 0.46, y + Math.sin(crumb * TAU / 5) * radius * 0.46, radius * 0.07, '#C96C38');
    }
    return;
  }
  if (kind === 'katli') {
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4);
    ctx.beginPath(); ctx.roundRect(-radius * 0.62, -radius * 0.62, radius * 1.24, radius * 1.24, radius * 0.18);
    ctx.fillStyle = '#F5E5C8'; ctx.fill(); ctx.strokeStyle = '#B8A17B'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
    line(ctx, x - radius * 0.25, y, x + radius * 0.25, y, '#D6C3A4', 1);
    return;
  }
  circle(ctx, x, y, radius * 0.72, kind === 'bead' ? color : '#4F9CDC', '#FFFFFF', 1.1);
  circle(ctx, x - radius * 0.25, y - radius * 0.28, radius * 0.18, 'rgba(255,255,255,.84)');
}

function drawMathGroups(ctx, width, height, time, params = {}, simulation = {}, options = {}) {
  mathCanvasBackground(ctx, width, height);
  const scale = width / 576;
  ctx.save(); ctx.scale(scale, scale);
  width /= scale; height /= scale;
  const groups = Math.max(1, Math.min(8, Math.round(Number(params.groups ?? 5))));
  const perGroup = Math.max(1, Math.min(6, Math.round(Number(params.perGroup ?? 4))));
  const total = groups * perGroup;
  const item = simulation.visual?.item || 'counter';
  const itemNames = { flower: 'flowers', thread: 'threads', bead: 'beads', sweet: 'laddoos', katli: 'kaju katlis', counter: 'counters' };
  const plural = itemNames[item] || 'objects';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '800 17px Inter, Arial, sans-serif'; ctx.fillStyle = '#55436B';
  ctx.fillText('EQUAL GROUPS', 29, 73);
  ctx.font = '600 12px Inter, Arial, sans-serif'; ctx.fillStyle = '#766982';
  ctx.fillText(`${perGroup} ${plural} in each ${simulation.visual?.groupLabel?.toLowerCase() || 'group'}`, 30, 91);

  const columns = Math.min(4, groups), rows = Math.ceil(groups / columns);
  const gapX = 9, gapY = 8;
  const cardWidth = Math.min(122, (width - 62 - gapX * (columns - 1)) / columns);
  const cardHeight = rows === 1 ? 122 : 69;
  const gridWidth = cardWidth * columns + gapX * (columns - 1);
  const startX = (width - gridWidth) / 2;
  const startY = rows === 1 ? 113 : 105;
  const phase = ((time % 5) + 5) % 5 / 5;
  const visibleCount = options.animateControl ? Math.min(total, Math.max(1, Math.ceil(phase * (total + 1)))) : total;
  const palette = [
    ['#FFE1D7', '#E66E62'], ['#DAF3E8', '#24967E'], ['#E8E1FF', '#7963C7'], ['#FFF0C8', '#D79522'],
    ['#DDEFFA', '#4F91CA'], ['#F8DEEF', '#CA5E99'], ['#E4F0CB', '#719C42'], ['#FCE3D9', '#DC805B'],
  ];
  for (let group = 0; group < groups; group += 1) {
    const column = group % columns, row = Math.floor(group / columns);
    const visibleRowCount = Math.min(columns, groups - row * columns);
    const rowOffset = (gridWidth - visibleRowCount * cardWidth - (visibleRowCount - 1) * gapX) / 2;
    const x = startX + rowOffset + column * (cardWidth + gapX), y = startY + row * (cardHeight + gapY);
    const [fill, accent] = palette[group % palette.length];
    ctx.beginPath(); ctx.roundRect(x, y, cardWidth, cardHeight, 15);
    ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = accent; ctx.stroke();
    ctx.font = '800 10px Inter, Arial, sans-serif'; ctx.fillStyle = accent;
    ctx.fillText(`${simulation.visual?.groupLabel || 'GROUP'} ${group + 1}`, x + 9, y + 15);
    const itemRadius = rows === 1 ? Math.min(14, cardHeight * 0.18) : Math.min(11, cardHeight * 0.2);
    const colsInCard = Math.min(3, perGroup);
    const tokenGap = Math.min(28, (cardWidth - 22) / Math.max(1, colsInCard));
    const tokenStart = x + cardWidth / 2 - (Math.min(perGroup, 3) - 1) * tokenGap / 2;
    for (let object = 0; object < perGroup; object += 1) {
      const globalIndex = group * perGroup + object;
      if (globalIndex >= visibleCount) continue;
      const tokenColumn = object % colsInCard, tokenRow = Math.floor(object / colsInCard);
      const tokenX = tokenStart + tokenColumn * tokenGap;
      const rowCount = Math.ceil(perGroup / colsInCard);
      const tokenY = y + 39 + tokenRow * Math.min(24, (cardHeight - 44) / Math.max(1, rowCount));
      drawMathItem(ctx, item, tokenX, tokenY, itemRadius, globalIndex);
    }
  }
  const formula = `${groups} × ${perGroup} = ${total}`;
  ctx.beginPath(); ctx.roundRect(width * 0.26, height - 48, width * 0.48, 31, 15);
  ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.strokeStyle = '#D8C5E8'; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.textAlign = 'center'; ctx.font = '800 18px Inter, Arial, sans-serif'; ctx.fillStyle = '#5D4686';
  ctx.fillText(`${formula} ${plural}`, width / 2, height - 27);
  ctx.textAlign = 'left';
  ctx.restore();
}

function drawMathSharing(ctx, width, height, time, params = {}, simulation = {}, options = {}) {
  mathCanvasBackground(ctx, width, height);
  const scale = width / 576;
  ctx.save(); ctx.scale(scale, scale);
  width /= scale; height /= scale;
  const total = Math.max(2, Math.min(30, Math.round(Number(params.totalItems ?? 18))));
  const people = Math.max(2, Math.min(10, Math.round(Number(params.recipients ?? 9))));
  const share = Math.floor(total / people), remainder = total % people;
  const item = simulation.visual?.item || 'counter';
  const itemNames = { sweet: 'laddoos', katli: 'kaju katlis', counter: 'items' };
  const plural = itemNames[item] || 'items';
  const phase = ((time % 5) + 5) % 5 / 5;
  const distributable = total - remainder;
  const assigned = options.animateControl ? Math.min(distributable, Math.floor(phase * (distributable + 1))) : distributable;
  const distribution = Array.from({ length: people }, (_, index) => Math.max(0, Math.floor((assigned - index + people - 1) / people)));
  const leftInTray = total - assigned;
  ctx.font = '800 17px Inter, Arial, sans-serif'; ctx.fillStyle = '#55436B';
  ctx.fillText('ONE AT A TIME · FAIR SHARES', 29, 73);
  ctx.font = '600 12px Inter, Arial, sans-serif'; ctx.fillStyle = '#766982';
  ctx.fillText(`${total} ${plural} · ${people} people · no one is skipped`, 30, 91);

  const tray = { x: width * 0.37, y: 103, w: width * 0.26, h: 35 };
  ctx.beginPath(); ctx.roundRect(tray.x, tray.y, tray.w, tray.h, 12);
  ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.strokeStyle = '#E2A67F'; ctx.lineWidth = 2; ctx.stroke();
  ctx.font = '700 10px Inter, Arial, sans-serif'; ctx.fillStyle = '#8D5B58'; ctx.textAlign = 'center';
  ctx.fillText(options.animateControl ? `TRAY · ${leftInTray} LEFT` : leftInTray ? `TRAY · ${leftInTray} LEFT OVER` : 'ALL ITEMS SHARED', width / 2, tray.y + 22);
  ctx.textAlign = 'left';

  const columns = Math.min(5, people), rows = Math.ceil(people / columns);
  const cellWidth = Math.min(102, (width - 58) / columns), cellHeight = rows === 1 ? 88 : 72;
  const gridWidth = cellWidth * columns;
  const startX = (width - gridWidth) / 2;
  const startY = 150;
  const colors = ['#F06F68', '#20A18C', '#8066D2', '#E9A837', '#4E9BD2', '#D86BA9', '#7DAB4E', '#DA805E', '#43A6AC', '#A276C3'];
  for (let person = 0; person < people; person += 1) {
    const column = person % columns, row = Math.floor(person / columns);
    const cx = startX + column * cellWidth + cellWidth / 2, y = startY + row * cellHeight;
    const color = colors[person % colors.length];
    ctx.beginPath(); ctx.roundRect(cx - 42, y, 84, cellHeight - 7, 13);
    ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 1.7; ctx.stroke();
    circle(ctx, cx, y + 13, 7, '#FFD6A3', '#C47A5E', 1);
    ctx.beginPath(); ctx.moveTo(cx - 10, y + 26); ctx.quadraticCurveTo(cx, y + 18, cx + 10, y + 26);
    ctx.lineTo(cx + 10, y + 31); ctx.lineTo(cx - 10, y + 31); ctx.closePath();
    ctx.fillStyle = color; ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx, y + 43, 27, 10, 0, 0, TAU);
    ctx.fillStyle = '#F5EAFB'; ctx.fill(); ctx.strokeStyle = '#AB83BA'; ctx.lineWidth = 1.4; ctx.stroke();
    const amount = Math.min(6, distribution[person]);
    const tokenGap = 13;
    for (let index = 0; index < amount; index += 1) {
      const tokenX = cx + (index - (amount - 1) / 2) * tokenGap;
      drawMathItem(ctx, item, tokenX, y + 42, 6.3, person + index);
    }
    ctx.font = '800 9px Inter, Arial, sans-serif'; ctx.fillStyle = '#665477'; ctx.textAlign = 'center';
    ctx.fillText(distribution[person] > 6 ? `+${distribution[person] - 6}` : `PERSON ${person + 1}`, cx, y + cellHeight - 9);
  }
  ctx.textAlign = 'center';
  const currentPerson = assigned < distributable ? assigned % people : -1;
  if (options.animateControl && currentPerson >= 0) {
    const column = currentPerson % columns, row = Math.floor(currentPerson / columns);
    const targetX = startX + column * cellWidth + cellWidth / 2;
    const targetY = startY + row * cellHeight + 42;
    const travel = (phase * total) % 1;
    const x = width / 2 + (targetX - width / 2) * travel;
    const y = tray.y + tray.h + (targetY - tray.y - tray.h) * travel - Math.sin(travel * Math.PI) * 22;
    drawMathItem(ctx, item, x, y, 8, assigned);
  }
  const result = options.animateControl && assigned < distributable
    ? `${assigned} shared · ${leftInTray} remain`
    : `${total} ÷ ${people} = ${share} each${remainder ? ` · ${remainder} left` : ''}`;
  ctx.beginPath(); ctx.roundRect(width * 0.21, height - 35, width * 0.58, 24, 12);
  ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.strokeStyle = '#D8C5E8'; ctx.lineWidth = 1.3; ctx.stroke();
  ctx.font = '800 15px Inter, Arial, sans-serif'; ctx.fillStyle = '#5D4686'; ctx.fillText(result, width / 2, height - 18);
  ctx.textAlign = 'left';
  ctx.restore();
}

export function renderSimulationFrame(ctx, width, height, scene = 'physics', time = 0, params = {}, simulation = {}, options = {}) {
  ctx.clearRect(0, 0, width, height);
  if (simulation?.model === 'storybook' || simulation?.visual?.story) {
    const frameParams = animationParameters('storybook', simulation, params, time, options);
    drawStorybookAnimation(ctx, width, height, time, simulation, frameParams);
    return;
  }
  if (simulation?.model === 'generated' && simulation.visual) {
    if (simulation.visual.style === 'source_figure') {
      const background = ctx.createLinearGradient(0, 0, width, height);
      background.addColorStop(0, '#F7F4E8'); background.addColorStop(1, '#EAF3EE');
      ctx.fillStyle = background; ctx.fillRect(0, 0, width, height);
      for (let x = 24; x < width; x += 42) for (let y = 24; y < height; y += 42) {
        circle(ctx, x, y, Math.max(0.6, width * 0.0009), '#D7E2D7');
      }
    } else drawGrid(ctx, width, height);
    const frameParams = animationParameters('generated', simulation, params, time, options);
    drawGeneratedSimulation(ctx, width, height, time, frameParams, simulation, options);
    drawTeachingSteps(ctx, width, time, 'generated', simulation);
    return;
  }
  const frameParams = animationParameters(scene, simulation, params, time, options);
  const renderers = {
    physics: drawPhysics,
    physics_motion: drawPhysics,
    physics_distance_graph: drawPhysicsDistanceGraph,
    physics_wave: drawPhysicsWave,
    physics_circuit: drawPhysicsCircuit,
    math: drawMath,
    math_graph: drawMathGraph,
    math_balance: drawMathBalance,
    chemistry: drawChemistry,
    chemistry_particles: drawChemistryParticles,
    chemistry_reaction: drawChemistryReaction,
    biology: drawBiology,
    biology_cell: drawBiologyCell,
    biology_cycle: drawBiologyCycle,
    english: drawEnglish,
    social: drawSocial,
    social_timeline: drawSocial,
    robotics: drawRobotics,
    math_groups: (context, w, h, t, p, sim) => drawMathGroups(context, w, h, t, p, sim, options),
    math_sharing: (context, w, h, t, p, sim) => drawMathSharing(context, w, h, t, p, sim, options),
  };
  (renderers[scene] || drawPhysics)(ctx, width, height, time, frameParams, simulation);
  drawTeachingSteps(ctx, width, time, scene, simulation);
  if (!['math_groups', 'math_sharing'].includes(scene)) drawGuideCharacter(ctx, width, time, scene);
}
