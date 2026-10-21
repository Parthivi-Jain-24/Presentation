const COLORS = {
  ink: '18333C',
  muted: '60757A',
  green: '477E70',
  pale: 'EEF3ED',
  line: 'D6E2D9',
  gold: 'D7AB6D',
};

export function addEditableDiagram(slide, diagram, { left, top, width, height, orientation = 'stack' }) {
  if (!diagram?.nodes?.length) return;
  const nodes = diagram.nodes.slice(0, 5).map((node) => typeof node === 'string' ? { label: node } : node);
  const titleHeight = 0.38;
  slide.addText(String(diagram.title || 'Chapter diagram').slice(0, 100), {
    x: left, y: top, w: width, h: titleHeight, margin: 0,
    fontFace: 'Aptos Display', fontSize: 15, bold: true, color: COLORS.green,
    fit: 'shrink', valign: 'mid',
  });

  if (orientation === 'row') {
    const gap = 0.23;
    const nodeWidth = (width - gap * (nodes.length - 1)) / nodes.length;
    const nodeTop = top + titleHeight + 0.16;
    const nodeHeight = Math.min(1.65, Math.max(1.25, height - titleHeight - 0.45));
    nodes.forEach((node, index) => {
      const x = left + index * (nodeWidth + gap);
      slide.addShape('roundRect', { x, y: nodeTop, w: nodeWidth, h: nodeHeight, rectRadius: 0.08,
        line: { color: COLORS.line, width: 1 }, fill: { color: 'F8FAF6' } });
      slide.addText(String(index + 1).padStart(2, '0'), { x: x + 0.12, y: nodeTop + 0.13, w: 0.35, h: 0.22,
        margin: 0, fontFace: 'Aptos', fontSize: 10, bold: true, color: COLORS.gold });
      slide.addText(String(node.label || '').slice(0, 90), { x: x + 0.12, y: nodeTop + 0.43, w: nodeWidth - 0.24, h: 0.38,
        margin: 0, fontFace: 'Aptos Display', fontSize: 14, bold: true, color: COLORS.ink, fit: 'shrink', valign: 'mid' });
      if (node.detail) slide.addText(String(node.detail).slice(0, 160), { x: x + 0.12, y: nodeTop + 0.86, w: nodeWidth - 0.24, h: nodeHeight - 1.0,
        margin: 0, fontFace: 'Aptos', fontSize: 10, color: COLORS.muted, fit: 'shrink', valign: 'top' });
      if (index < nodes.length - 1 && diagram.kind === 'parts') {
        slide.addText('+', { x: x + nodeWidth + 0.035, y: nodeTop + nodeHeight / 2 - 0.12, w: gap - 0.07, h: 0.24,
          margin: 0, fontFace: 'Aptos Display', fontSize: 15, bold: true, color: COLORS.green, align: 'center', valign: 'mid' });
      } else if (index < nodes.length - 1) {
        slide.addShape('line', { x: x + nodeWidth + 0.03, y: nodeTop + nodeHeight / 2,
          w: gap - 0.06, h: 0, line: { color: COLORS.gold, width: 1.6, endArrowType: 'triangle' } });
      }
    });
  } else {
    const gap = diagram.kind === 'parts' ? 0.23 : 0.12;
    const nodeHeight = Math.min(0.78, (height - titleHeight - gap * (nodes.length - 1) - 0.25) / nodes.length);
    const startY = top + titleHeight + 0.13;
    nodes.forEach((node, index) => {
      const y = startY + index * (nodeHeight + gap);
      slide.addShape('roundRect', { x: left, y, w: width, h: nodeHeight, rectRadius: 0.06,
        line: { color: COLORS.line, width: 1 }, fill: { color: 'F8FAF6' } });
      slide.addText(String(index + 1).padStart(2, '0'), { x: left + 0.14, y: y + 0.11, w: 0.34, h: 0.22,
        margin: 0, fontFace: 'Aptos', fontSize: 10, bold: true, color: COLORS.gold });
      slide.addText(String(node.label || '').slice(0, 90), { x: left + 0.58, y: y + 0.08, w: width - 0.76, h: node.detail ? 0.27 : nodeHeight - 0.16,
        margin: 0, fontFace: 'Aptos Display', fontSize: 13, bold: true, color: COLORS.ink, fit: 'shrink', valign: 'mid' });
      if (node.detail) slide.addText(String(node.detail).slice(0, 180), { x: left + 0.58, y: y + 0.37, w: width - 0.76, h: Math.max(0.2, nodeHeight - 0.43),
        margin: 0, fontFace: 'Aptos', fontSize: 10, color: COLORS.muted, fit: 'shrink', valign: 'mid' });
      if (index < nodes.length - 1 && diagram.kind === 'parts') {
        slide.addText('+', { x: left + width / 2 - 0.1, y: y + nodeHeight + gap / 2 - 0.1, w: 0.2, h: 0.2,
          margin: 0, fontFace: 'Aptos Display', fontSize: 12, bold: true, color: COLORS.green, align: 'center', valign: 'mid' });
      } else if (index < nodes.length - 1) {
        slide.addShape('line', { x: left + 0.3, y: y + nodeHeight, w: 0, h: gap,
          line: { color: COLORS.gold, width: 1.5, endArrowType: 'triangle' } });
      }
    });
    if (diagram.kind === 'cycle') slide.addText('The sequence repeats', { x: left, y: top + height - 0.2, w: width, h: 0.18,
      margin: 0, fontFace: 'Aptos', fontSize: 9, italic: true, color: COLORS.muted, align: 'center' });
  }
  if (diagram.caption) slide.addText(String(diagram.caption).slice(0, 200), { x: left, y: top + height - 0.13,
    w: width, h: 0.28, margin: 0, fontFace: 'Aptos', fontSize: 10, color: COLORS.muted, fit: 'shrink', valign: 'mid' });
}
