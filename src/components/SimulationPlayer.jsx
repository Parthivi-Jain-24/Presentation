import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Sparkles } from 'lucide-react';
import { renderSimulationFrame } from '../lib/simulation.js';

export default function SimulationPlayer({ scene = 'physics', simulation = {}, sourceFigure = null, playing, onPlayingChange, progress, onProgressChange, params = {}, onParamsChange }) {
  const canvasRef = useRef(null);
  const sourceImageRef = useRef(null);
  const latest = useRef({ progress, onProgressChange, params, simulation, scene, sourceFigure, playing });
  latest.current = { progress, onProgressChange, params, simulation, scene, sourceFigure, playing };
  const storyPanels = simulation?.visual?.story?.panels?.slice(0, 3) || [];
  const stageControl = simulation?.controls?.find((control) => control.key === 'stage');
  const selectedBeat = playing
    ? Math.min(storyPanels.length - 1, Math.floor(progress * storyPanels.length))
    : Number.isFinite(Number(params.stage)) ? Math.max(0, Math.min(storyPanels.length - 1, Math.round(Number(params.stage))))
      : Math.min(storyPanels.length - 1, Math.floor(progress * storyPanels.length));
  const focusControl = simulation?.controls?.find((control) => control.key === 'focus_step');
  const focusSteps = focusControl ? (simulation.steps || []).slice(0, 4) : [];
  const selectedFocus = playing && focusSteps.length > 1
    ? Math.round(Number(focusControl.min || 0) + (Number(focusControl.max) - Number(focusControl.min || 0)) * (1 - Math.cos(progress * Math.PI)) / 2)
    : Math.round(Number(params[focusControl?.key] ?? focusControl?.value ?? 0));

  const drawCurrentFrame = (frameProgress = latest.current.progress, animateControl = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderSimulationFrame(canvas.getContext('2d'), canvas.width, canvas.height,
      latest.current.scene, frameProgress * 5, latest.current.params, latest.current.simulation,
      { animateControl, sourceFigureImage: sourceImageRef.current, sourceFigurePage: latest.current.sourceFigure?.pages?.[0], sourceFigureCaption: latest.current.sourceFigure?.caption });
  };

  useEffect(() => {
    sourceImageRef.current = null;
    if (!sourceFigure?.data || typeof Image === 'undefined') return undefined;
    const image = new Image();
    sourceImageRef.current = image;
    image.onload = () => { if (sourceImageRef.current === image && !latest.current.playing) drawCurrentFrame(); };
    image.onerror = () => { if (sourceImageRef.current === image) sourceImageRef.current = null; };
    image.src = `data:${sourceFigure.data}`;
    return () => { if (sourceImageRef.current === image) sourceImageRef.current = null; };
  }, [sourceFigure?.data]);

  useEffect(() => {
    if (!playing) return undefined;
    let raf = 0;
    const speed = Math.max(0.5, params.speed || 1);
    const duration = 4200 / speed;
    let began = performance.now() - latest.current.progress * duration;
    let lastProgressUpdate = 0;
    const render = (now) => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const next = ((now - began) / duration) % 1;
        latest.current.progress = next;
        if (now - lastProgressUpdate > 100) {
          latest.current.onProgressChange(next);
          lastProgressUpdate = now;
        }
        renderSimulationFrame(ctx, canvas.width, canvas.height, scene, next * 5, latest.current.params, latest.current.simulation,
          { animateControl: true, sourceFigureImage: sourceImageRef.current, sourceFigurePage: latest.current.sourceFigure?.pages?.[0], sourceFigureCaption: latest.current.sourceFigure?.caption });
      }
      raf = requestAnimationFrame(render);
    };
    render(performance.now());
    return () => cancelAnimationFrame(raf);
  }, [scene, simulation, sourceFigure, playing, params]);

  useEffect(() => {
    if (playing) return;
    drawCurrentFrame(progress, false);
  }, [scene, simulation, sourceFigure, playing, progress, params]);

  const toggle = () => {
    if (playing && stageControl) onParamsChange?.({ ...params, [stageControl.key]: Math.min(2, Math.floor(progress * storyPanels.length)) });
    onPlayingChange(!playing);
  };
  const restart = () => {
    onProgressChange(0);
    onPlayingChange(true);
  };

  const selectBeat = (index) => {
    onPlayingChange(false);
    if (stageControl) onParamsChange?.({ ...params, [stageControl.key]: index });
    onProgressChange((index + 0.08) / Math.max(1, storyPanels.length));
  };

  const selectFocus = (index) => {
    if (!focusControl) return;
    onPlayingChange(false);
    onParamsChange?.({ ...params, [focusControl.key]: index });
  };

  return (
    <div className="sim-player">
      <canvas ref={canvasRef} width="960" height="540" aria-label={`${scene} animation preview`} />
      {focusSteps.length > 1 && <div className="simulation-focus-nav" role="group" aria-label="Focus a chapter source detail">
        {focusSteps.map((step, index) => <button key={`${step}-${index}`} className={index === selectedFocus ? 'is-active' : ''}
          aria-pressed={index === selectedFocus} onClick={() => selectFocus(index)}>
          <span>{String(index + 1).padStart(2, '0')}</span>{step}
        </button>)}
      </div>}
      {storyPanels.length > 1 && <div className="story-beat-nav" role="group" aria-label="Story animation beats">
        {storyPanels.map((panel, index) => <button
          key={`${panel.beat || 'beat'}-${index}`}
          className={index === selectedBeat ? 'story-beat-button is-active' : 'story-beat-button'}
          aria-pressed={index === selectedBeat}
          onClick={() => selectBeat(index)}
        ><span>{String(index + 1).padStart(2, '0')}</span>{panel.beat || ['Question', 'Explore', 'Explain'][index]}</button>)}
      </div>}
      <div className="sim-controlbar">
        <div className="sim-actions">
          <button className="player-button play-button" onClick={toggle} aria-label={playing ? 'Pause simulation' : 'Play simulation'}>
            {playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
          </button>
          <button className="player-button" onClick={restart} aria-label="Restart simulation"><RotateCcw size={15} /></button>
          <span className="sim-time">{(progress * 5).toFixed(1)}s <span>/</span> 5.0s</span>
        </div>
        <input
          className="sim-seek"
          aria-label="Simulation timeline"
          type="range" min="0" max="1" step="0.01" value={progress}
          onChange={(event) => {
            const next = Number(event.target.value);
            onProgressChange(next);
            onPlayingChange(false);
            if (stageControl) onParamsChange?.({ ...params, [stageControl.key]: Math.min(2, Math.floor(next * 3)) });
          }}
        />
        <div className="sim-engine"><Sparkles size={13} /> <span>CLASSROOM MODEL</span></div>
      </div>
    </div>
  );
}
