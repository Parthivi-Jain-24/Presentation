import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronRight, CircleHelp, Lightbulb, RotateCcw, Sparkles, X } from 'lucide-react';
import SimulationPlayer from './SimulationPlayer.jsx';

const LABS = [
  {
    id: 'motion', title: 'Force & motion', subject: 'Physics', level: 'Classes 8–10', icon: '↗', color: 'mint',
    description: 'Change the push or the cart mass. Compare the acceleration and the motion that follows.',
    scene: 'physics_motion', formula: 'a = F ÷ m', principle: 'For a constant force, a larger mass produces less acceleration.',
    steps: ['Set the applied force', 'Change the cart mass', 'Compare acceleration'],
    controls: [
      { key: 'force', label: 'Applied force', min: 1, max: 10, step: 1, value: 6, unit: 'N' },
      { key: 'mass', label: 'Cart mass', min: 1, max: 5, step: 1, value: 2, unit: 'kg' },
    ],
    metrics: (params) => [
      { label: 'Acceleration', value: `${(Number(params.force) / Number(params.mass)).toFixed(1)} m/s²` },
      { label: 'Speed after 5 s', value: `${(Number(params.force) / Number(params.mass) * 5).toFixed(1)} m/s` },
    ],
    plot: (params) => ({
      xLabel: 'Mass (kg)', yLabel: 'Acceleration (m/s²)', xDomain: [1, 5], yDomain: [0, 10],
      points: Array.from({ length: 17 }, (_, index) => { const x = 1 + index * 0.25; return { x, y: Number(params.force) / x }; }),
      marker: { x: Number(params.mass), y: Number(params.force) / Number(params.mass) },
    }),
    question: {
      prompt: 'Keep the force the same and double the mass. What happens to acceleration?',
      options: ['It doubles', 'It becomes half as large', 'It stays the same'], answer: 1,
      explanation: 'Newton’s second law gives a = F ÷ m. With the force fixed, doubling the mass halves the acceleration.',
      hint: 'Compare F ÷ m with F ÷ (2m).',
    },
    assumption: 'This ideal model keeps the applied force constant and ignores friction.',
  },
  {
    id: 'graphs', title: 'Graph explorer', subject: 'Mathematics', level: 'Classes 7–10', icon: 'ƒ', color: 'lilac',
    description: 'Change the slope and intercept, then read how each one changes the line and a point on it.',
    scene: 'math_graph', formula: 'y = mx + b', principle: 'The slope controls the change in y for each unit of x; the intercept sets y when x is zero.',
    steps: ['Choose a slope', 'Shift the intercept', 'Read a point on the line'],
    controls: [
      { key: 'slope', label: 'Slope (m)', min: -3, max: 3, step: 0.5, value: 1, unit: '' },
      { key: 'intercept', label: 'Y-intercept (b)', min: -5, max: 5, step: 1, value: 0, unit: '' },
    ],
    metrics: (params) => [
      { label: 'Slope', value: Number(params.slope).toFixed(1) },
      { label: 'At x = 2', value: `y = ${(Number(params.slope) * 2 + Number(params.intercept)).toFixed(1)}` },
    ],
    plot: (params) => ({
      xLabel: 'x', yLabel: 'y', xDomain: [-5, 5], yDomain: [-10, 10],
      points: Array.from({ length: 41 }, (_, index) => { const x = -5 + index * 0.25; return { x, y: Number(params.slope) * x + Number(params.intercept) }; }),
      marker: { x: 2, y: Number(params.slope) * 2 + Number(params.intercept) },
    }),
    question: {
      prompt: 'On y = mx + b, what does m tell you?',
      options: ['The change in y for each 1-unit increase in x', 'Where the line crosses the x-axis', 'The value of y when x is zero'], answer: 0,
      explanation: 'The slope m is the rate of change. The intercept b is the value of y when x = 0.',
      hint: 'Look at how much the line rises or falls as you move one step right.',
    },
    assumption: 'The plotted line follows the exact linear rule y = mx + b.',
  },
  {
    id: 'balance', title: 'Equation balance', subject: 'Mathematics', level: 'Classes 6–9', icon: '＝', color: 'lilac',
    description: 'Remove a value from both sides of an equation and keep the balance unchanged.',
    scene: 'math_balance', formula: 'x + b = 15', principle: 'Whatever operation is applied to one side must also be applied to the other.',
    steps: ['Choose the value added to x', 'Undo it on both sides', 'Read the value of x'],
    controls: [{ key: 'offset', label: 'Value to undo', min: 1, max: 12, step: 1, value: 7, unit: '' }],
    metrics: (params) => [
      { label: 'Value of x', value: `15 − ${Number(params.offset)} = ${15 - Number(params.offset)}` },
      { label: 'Balance rule', value: `Subtract ${Number(params.offset)} on both sides` },
    ],
    plot: (params) => ({
      xLabel: 'Value added to x', yLabel: 'Solved value of x', xDomain: [1, 12], yDomain: [0, 15],
      points: Array.from({ length: 23 }, (_, index) => { const x = 1 + index * 0.5; return { x, y: 15 - x }; }),
      marker: { x: Number(params.offset), y: 15 - Number(params.offset) },
    }),
    question: {
      prompt: 'To isolate x in x + b = 15, how do you keep the equation balanced?',
      options: ['Subtract b from both sides', 'Subtract b from the left side only', 'Divide both sides by b'], answer: 0,
      explanation: 'Subtracting the same value from each side preserves equality and leaves x by itself.',
      hint: 'An equation stays balanced when both sides get the same operation.',
    },
    assumption: 'The balance model uses whole-number values and the equation x + b = 15.',
  },
  {
    id: 'circuits', title: 'Circuit explorer', subject: 'Physics', level: 'Classes 8–10', icon: 'ϟ', color: 'gold',
    description: 'Adjust voltage and resistance. Watch current change in the circuit and on the graph.',
    scene: 'physics_circuit', formula: 'I = V ÷ R', principle: 'For a fixed voltage, increasing resistance reduces current.',
    steps: ['Set the voltage', 'Change the resistance', 'Compare the current'],
    controls: [
      { key: 'voltage', label: 'Voltage', min: 1, max: 12, step: 1, value: 6, unit: 'V' },
      { key: 'resistance', label: 'Resistance', min: 1, max: 12, step: 1, value: 3, unit: 'Ω' },
    ],
    metrics: (params) => [
      { label: 'Current', value: `${(Number(params.voltage) / Number(params.resistance)).toFixed(2)} A` },
      { label: 'Power', value: `${(Number(params.voltage) ** 2 / Number(params.resistance)).toFixed(1)} W` },
    ],
    plot: (params) => ({
      xLabel: 'Voltage (V)', yLabel: 'Current (A)', xDomain: [0, 12], yDomain: [0, 12],
      points: Array.from({ length: 25 }, (_, index) => { const x = index * 0.5; return { x, y: x / Number(params.resistance) }; }),
      marker: { x: Number(params.voltage), y: Number(params.voltage) / Number(params.resistance) },
    }),
    question: {
      prompt: 'Keep voltage fixed and increase resistance. What happens to current?',
      options: ['It increases', 'It decreases', 'It does not change'], answer: 1,
      explanation: 'Ohm’s law gives I = V ÷ R. At the same voltage, a larger resistance means less current.',
      hint: 'In I = V ÷ R, resistance is the divisor.',
    },
    assumption: 'The circuit is treated as an ideal ohmic circuit; wire resistance is ignored.',
  },
  {
    id: 'waves', title: 'Wave & sound lab', subject: 'Physics', level: 'Classes 8–10', icon: '∿', color: 'blue',
    description: 'Separate frequency from amplitude. See how the wave changes while its medium stays fixed.',
    scene: 'physics_wave', formula: 'v = fλ', principle: 'In a fixed medium, a higher frequency corresponds to a shorter wavelength.',
    steps: ['Set the frequency', 'Change the amplitude', 'Compare wavelength'],
    controls: [
      { key: 'frequency', label: 'Frequency', min: 1, max: 5, step: 1, value: 2, unit: 'Hz' },
      { key: 'amplitude', label: 'Amplitude', min: 0.5, max: 2, step: 0.1, value: 1, unit: '×' },
    ],
    metrics: (params) => [
      { label: 'Period', value: `${(1 / Number(params.frequency)).toFixed(2)} s` },
      { label: 'Wavelength', value: `${(4 / Number(params.frequency)).toFixed(2)} m*` },
    ],
    plot: (params) => ({
      xLabel: 'Position', yLabel: 'Displacement', xDomain: [0, Math.PI * 4], yDomain: [-2, 2],
      points: Array.from({ length: 81 }, (_, index) => { const x = index * Math.PI / 20; return { x, y: Number(params.amplitude) * Math.sin(x * Number(params.frequency) / 2) }; }),
      marker: { x: Math.PI, y: Number(params.amplitude) * Math.sin(Math.PI * Number(params.frequency) / 2) },
    }),
    question: {
      prompt: 'If frequency doubles in the same medium, what happens to wavelength?',
      options: ['It doubles', 'It becomes half as large', 'It stays the same'], answer: 1,
      explanation: 'Wave speed in the medium stays fixed. Since v = fλ, doubling frequency halves wavelength.',
      hint: 'Rearrange v = fλ to make wavelength the subject.',
    },
    assumption: 'For the wavelength readout, the model uses a constant wave speed of 4 m/s. *Illustrative value.',
  },
  {
    id: 'particles', title: 'Particle model', subject: 'Chemistry', level: 'Classes 6–9', icon: '·', color: 'coral',
    description: 'Add thermal energy and observe the particle motion. The model shows a qualitative relationship.',
    scene: 'chemistry_particles', formula: 'higher temperature → faster average motion', principle: 'Heating a substance increases the average kinetic energy of its particles.',
    steps: ['Set the temperature', 'Watch particle motion', 'Explain the energy change'],
    controls: [{ key: 'temperature', label: 'Relative temperature', min: 1, max: 10, step: 1, value: 4, unit: '' }],
    metrics: (params) => [
      { label: 'Relative energy', value: `${Number(params.temperature)} units` },
      { label: 'Motion level', value: Number(params.temperature) < 4 ? 'Gentle' : Number(params.temperature) < 8 ? 'Active' : 'Rapid' },
    ],
    plot: (params) => ({
      xLabel: 'Relative temperature', yLabel: 'Average kinetic energy', xDomain: [1, 10], yDomain: [0, 10],
      points: Array.from({ length: 19 }, (_, index) => { const x = 1 + index * 0.5; return { x, y: x }; }),
      marker: { x: Number(params.temperature), y: Number(params.temperature) },
    }),
    question: {
      prompt: 'As a gas is heated, how does its average particle motion change?',
      options: ['It becomes faster', 'It becomes slower', 'It stops'], answer: 0,
      explanation: 'Thermal energy raises the particles’ average kinetic energy, so their motion becomes faster.',
      hint: 'Temperature is related to the particles’ average kinetic energy.',
    },
    assumption: 'Temperature and particle speed are shown qualitatively; the particle paths are not experimental data.',
  },
  {
    id: 'cells', title: 'Cell explorer', subject: 'Biology', level: 'Classes 6–10', icon: '◉', color: 'green',
    description: 'Step through a cell model and connect visible structures to the jobs they perform.',
    scene: 'biology_cell', formula: 'structure → function', principle: 'Cell structures have specialized roles that support the cell as a system.',
    steps: ['Locate a structure', 'Follow its role', 'Connect form and function'],
    controls: [{ key: 'cellPhase', label: 'Focus stage', min: 1, max: 5, step: 1, value: 2, unit: '' }],
    metrics: (params) => [
      { label: 'Focus stage', value: `${Math.round(Number(params.cellPhase))} of 5` },
      { label: 'Model type', value: 'Illustrative cell' },
    ],
    question: {
      prompt: 'Which cell structure contains most of the genetic instructions?',
      options: ['Cell membrane', 'Nucleus', 'Cytoplasm'], answer: 1,
      explanation: 'The nucleus contains most of a eukaryotic cell’s DNA and helps regulate cell activity.',
      hint: 'Look for the structure usually shown near the center of the cell.',
    },
    stages: [
      { label: 'Membrane', detail: 'Surrounds the cell and controls what enters and leaves.' },
      { label: 'Nucleus', detail: 'Holds most genetic instructions and helps direct cell activity.' },
      { label: 'Mitochondrion', detail: 'Releases usable energy through cellular respiration.' },
      { label: 'Cytoplasm', detail: 'Fluid region where many cell reactions take place.' },
      { label: 'Division', detail: 'An illustrative stage where genetic material is separating.' },
    ],
    assumption: 'This is a simplified cell diagram. Cell size, shape, and organelle proportions are not to scale.',
  },
];

function MiniPlot({ lab, params }) {
  if (!lab.plot) return null;
  const plot = lab.plot(params);
  const box = { left: 46, top: 12, width: 414, height: 150 };
  const [xMin, xMax] = plot.xDomain;
  const [yMin, yMax] = plot.yDomain;
  const toX = (x) => box.left + ((x - xMin) / (xMax - xMin)) * box.width;
  const toY = (y) => box.top + box.height - ((Math.max(yMin, Math.min(yMax, y)) - yMin) / (yMax - yMin)) * box.height;
  const path = plot.points.map((point, index) => `${index ? 'L' : 'M'}${toX(point.x).toFixed(2)},${toY(point.y).toFixed(2)}`).join(' ');
  const xTicks = Array.from({ length: 5 }, (_, index) => xMin + (xMax - xMin) * index / 4);
  const yTicks = Array.from({ length: 5 }, (_, index) => yMin + (yMax - yMin) * index / 4);
  return (
    <div className="simlab-chart-wrap">
      <svg className="simlab-plot" viewBox="0 0 480 205" role="img" aria-label={`${lab.title} graph: ${plot.yLabel} by ${plot.xLabel}`}>
        {xTicks.map((tick) => <g key={`x-${tick}`}><line x1={toX(tick)} x2={toX(tick)} y1={box.top} y2={box.top + box.height} /><text x={toX(tick)} y={box.top + box.height + 16} textAnchor="middle">{Number(tick.toFixed(1))}</text></g>)}
        {yTicks.map((tick) => <g key={`y-${tick}`}><line x1={box.left} x2={box.left + box.width} y1={toY(tick)} y2={toY(tick)} /><text x={box.left - 8} y={toY(tick) + 3} textAnchor="end">{Number(tick.toFixed(1))}</text></g>)}
        <path className="simlab-plot-line" d={path} />
        <line className="simlab-plot-axis" x1={box.left} x2={box.left + box.width} y1={toY(Math.max(yMin, Math.min(yMax, 0)))} y2={toY(Math.max(yMin, Math.min(yMax, 0)))} />
        <circle className="simlab-plot-point" cx={toX(plot.marker.x)} cy={toY(plot.marker.y)} r="5" />
        <text className="simlab-axis-x" x={box.left + box.width / 2} y="198" textAnchor="middle">{plot.xLabel}</text>
        <text className="simlab-axis-y" x="12" y={box.top + box.height / 2} textAnchor="middle" transform={`rotate(-90 12 ${box.top + box.height / 2})`}>{plot.yLabel}</text>
      </svg>
    </div>
  );
}

function RangeControl({ control, value, onChange }) {
  const decimalPlaces = String(control.step).includes('.') ? String(control.step).split('.')[1].length : 0;
  return (
    <label className="simlab-control">
      <span><span>{control.label}</span><strong>{Number(value).toFixed(decimalPlaces)} {control.unit}</strong></span>
      <input type="range" min={control.min} max={control.max} step={control.step} value={value}
        onChange={(event) => onChange(control.key, Number(event.target.value))} />
      <small><span>{control.min} {control.unit}</span><span>{control.max} {control.unit}</span></small>
    </label>
  );
}

function CellStageGuide({ lab, params, onSelect }) {
  const selectedStage = Math.round(Number(params.cellPhase ?? 1));
  return (
    <div className="simlab-stage-guide">
      <div className="simlab-stage-track" role="group" aria-label="Select a cell structure to focus">
        {lab.stages.map((stage, index) => <button key={stage.label} className={selectedStage === index + 1 ? 'selected' : ''}
          aria-pressed={selectedStage === index + 1} onClick={() => onSelect('cellPhase', index + 1)}>
          <span>{String(index + 1).padStart(2, '0')}</span><strong>{stage.label}</strong>
        </button>)}
      </div>
      <p><strong>{lab.stages[selectedStage - 1]?.label}:</strong> {lab.stages[selectedStage - 1]?.detail}</p>
    </div>
  );
}

export default function SimulationLab({ onClose }) {
  const [activeId, setActiveId] = useState(LABS[0].id);
  const [params, setParams] = useState(() => Object.fromEntries(LABS[0].controls.map((control) => [control.key, control.value])));
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [choice, setChoice] = useState(null);
  const [checked, setChecked] = useState(false);
  const [reflection, setReflection] = useState('');
  const lab = LABS.find((item) => item.id === activeId) || LABS[0];
  const simulation = useMemo(() => ({
    model: lab.scene, principle: lab.principle, equation: lab.formula, steps: lab.steps,
    controls: lab.controls, assumption: lab.assumption,
  }), [lab]);
  const metrics = lab.metrics(params);

  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  const chooseLab = (next) => {
    setActiveId(next.id);
    setParams(Object.fromEntries(next.controls.map((control) => [control.key, control.value])));
    setPlaying(false); setProgress(0); setChoice(null); setChecked(false); setReflection('');
  };
  const changeParam = (key, value) => {
    setParams((current) => ({ ...current, [key]: value }));
    setPlaying(false); setChoice(null); setChecked(false);
  };
  const verifyPrediction = () => { if (choice !== null) setChecked(true); };

  return (
    <div className="simlab-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="simlab-window" role="dialog" aria-modal="true" aria-labelledby="simlab-title">
        <header className="simlab-topbar">
          <div className="simlab-brand"><span className="simlab-brand-mark"><Sparkles size={17} /></span><span><strong>Simulation lab</strong><small>Explore · predict · explain</small></span></div>
          <div className="simlab-topbar-right"><span className="simlab-private"><i /> BROWSER-BASED INTERACTIVE MODELS</span><button className="simlab-close" onClick={onClose} aria-label="Close simulation lab"><X size={18} /></button></div>
        </header>
        <div className="simlab-layout">
          <aside className="simlab-library">
            <div className="simlab-library-heading"><small>EXPLORE A CONCEPT</small><strong>{LABS.length} interactive models</strong></div>
            <nav className="simlab-lab-list" aria-label="Available simulations">
              {LABS.map((item, index) => <button key={item.id} className={`simlab-lab-card ${item.id === activeId ? 'selected' : ''}`} onClick={() => chooseLab(item)} aria-current={item.id === activeId ? 'page' : undefined}>
                <span className={`simlab-lab-icon ${item.color}`}>{item.icon}</span><span className="simlab-lab-copy"><small>{item.subject.toUpperCase()} · {String(index + 1).padStart(2, '0')}</small><strong>{item.title}</strong><em>{item.level}</em></span><ChevronRight size={15} className="simlab-lab-chevron" />
              </button>)}
            </nav>
            <div className="simlab-library-note"><CircleHelp size={14} /><p><strong>Models simplify reality.</strong><span>Read the assumptions and compare each model with your lesson source.</span></p></div>
          </aside>

          <main className="simlab-content">
            <div className="simlab-heading-row"><div><div className="simlab-eyebrow"><span /> INTERACTIVE STEM TOOL · {lab.subject.toUpperCase()}</div><h1 id="simlab-title">{lab.title}</h1><p>{lab.description}</p></div><span className="simlab-grade-chip">{lab.level}</span></div>
            <div className="simlab-workbench">
              <section className="simlab-visual-card">
                <div className="simlab-card-heading"><span><small>LIVE MODEL</small><strong>{lab.formula}</strong></span><span className="simlab-live"><i /> READY</span></div>
                <SimulationPlayer key={activeId} scene={lab.scene} simulation={simulation} progress={progress} playing={playing}
                  onProgressChange={setProgress} onPlayingChange={setPlaying} params={params} onParamsChange={setParams} />
                <div className="simlab-assumption"><Lightbulb size={14} /><span>{lab.assumption}</span></div>
              </section>
              <section className="simlab-control-card">
                <div className="simlab-card-heading"><span><small>ADJUST THE MODEL</small><strong>Set the conditions</strong></span><button className="simlab-reset" onClick={() => chooseLab(lab)} title="Reset this model"><RotateCcw size={14} /> Reset</button></div>
                <div className="simlab-control-list">{lab.controls.map((control) => <RangeControl key={control.key} control={control} value={params[control.key] ?? control.value} onChange={changeParam} />)}</div>
                <div className="simlab-metrics">{metrics.map((metric) => <div className="simlab-metric" key={metric.label}><small>{metric.label}</small><strong>{metric.value}</strong></div>)}</div>
                <p className="simlab-principle"><span>MODEL RELATIONSHIP</span>{lab.principle}</p>
              </section>
            </div>

            <div className="simlab-learning-row">
              <section className="simlab-analysis-card">
                <div className="simlab-card-heading"><span><small>{lab.plot ? 'MEASURE THE CHANGE' : 'STRUCTURE AND FUNCTION'}</small><strong>{lab.plot ? 'Live relationship graph' : 'Cell structure guide'}</strong></span>{lab.plot && <span className="simlab-chart-key"><i /> Current setting</span>}</div>
                {lab.plot ? <><MiniPlot lab={lab} params={params} /><p className="simlab-chart-caption">The highlighted point updates when you change a control.</p></> : <CellStageGuide lab={lab} params={params} onSelect={changeParam} />}
              </section>
              <section className="simlab-predict-card">
                <div className="simlab-card-heading"><span><small>01 · PREDICT BEFORE YOU PLAY</small><strong>Check your understanding</strong></span><span className="simlab-question-mark">?</span></div>
                <p className="simlab-question-prompt">{lab.question.prompt}</p>
                <div className="simlab-options" role="group" aria-label="Choose your prediction">
                  {lab.question.options.map((option, index) => <button key={option} aria-pressed={choice === index} className={`simlab-option ${choice === index ? 'selected' : ''}`} onClick={() => { setChoice(index); setChecked(false); }}><span>{String.fromCharCode(65 + index)}</span>{option}</button>)}
                </div>
                {checked && <div className={`simlab-feedback ${choice === lab.question.answer ? 'correct' : 'try-again'}`} role="status"><span>{choice === lab.question.answer ? <Check size={15} /> : <CircleHelp size={15} />}</span><p><strong>{choice === lab.question.answer ? 'That prediction follows the model.' : 'Review the relationship and try again.'}</strong><small>{choice === lab.question.answer ? lab.question.explanation : lab.question.hint}</small></p></div>}
                <button className="simlab-check-button" disabled={choice === null} onClick={checked && choice !== lab.question.answer ? () => setChecked(false) : verifyPrediction}>
                  {checked && choice !== lab.question.answer ? 'Try again' : checked ? 'Prediction checked' : 'Check my prediction'} <ChevronRight size={15} />
                </button>
              </section>
            </div>

            <label className="simlab-reflection"><span><small>02 · EXPLAIN WHAT YOU OBSERVED</small><strong>Write a one-sentence takeaway</strong></span><textarea value={reflection} onChange={(event) => setReflection(event.target.value)} placeholder={`What changed when you adjusted ${lab.controls[0].label.toLowerCase()}?`} rows="2" /></label>
            <div className="simlab-footer"><span><Sparkles size={13} /> Inspired by classroom STEM tools: interactive models, graphing, and prediction.</span><span>Browser-rendered · values follow the stated model</span></div>
          </main>
        </div>
      </section>
    </div>
  );
}
