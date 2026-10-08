(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const math = window.NSMath;
  const svg = $('chart');
  const shell = $('chart-shell');
  const tooltip = $('chart-tooltip');
  const limit = 1e6;
  const state = { iterations: 5, max: 5, coefficients: { ...math.defaults }, comparison: true };
  let layout, activeSamples, referenceSamples, hoverX = null, framePending = false;
  const ns = 'http://www.w3.org/2000/svg';
  const node = (tag, attrs = {}, parent = svg, text) => {
    const element = document.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
    if (text !== undefined) element.textContent = text;
    parent.append(element);
    return element;
  };
  const format = value => !Number.isFinite(value) ? 'Overflow' : value === 0 ? '0' : Math.abs(value) >= 1e4 || Math.abs(value) < .001 ? value.toExponential(2) : Number(value.toPrecision(4)).toString();
  const isDefault = () => ['a', 'b', 'c'].every(key => state.coefficients[key] === math.defaults[key]);

  const defs = node('defs');
  const clip = node('clipPath', { id: 'plot-clip' }, defs);
  const clipRect = node('rect', {}, clip);
  const grid = node('g');
  const frame = node('rect', { class: 'plot-frame' });
  const target = node('line', { class: 'target-line' });
  const lines = node('g', { 'clip-path': 'url(#plot-clip)' });
  const referencePath = node('path', { class: 'curve curve-reference' }, lines);
  const activePath = node('path', { class: 'curve curve-active' }, lines);
  const labels = node('g');
  const hover = node('g', { visibility: 'hidden', 'pointer-events': 'none' });
  const hoverLine = node('line', { class: 'hover-line' }, hover);
  const activeDot = node('circle', { r: 5, class: 'hover-dot', fill: '#315bec' }, hover);
  const referenceDot = node('circle', { r: 4, class: 'hover-dot', fill: '#9ca8bb' }, hover);
  const hit = node('rect', { fill: 'transparent', 'aria-hidden': 'true' });
  hit.style.touchAction = 'pan-y';

  function tickStep(max) {
    const rough = max / 4;
    const power = 10 ** Math.floor(Math.log10(rough));
    const fraction = rough / power;
    return (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10) * power;
  }

  function draw() {
    framePending = false;
    activeSamples = math.samples(state.iterations, state.coefficients);
    referenceSamples = state.comparison ? math.samples(state.iterations, math.classical) : [];
    const all = [...activeSamples, ...referenceSamples];
    const values = all.filter(p => Number.isFinite(p.magnitude) && p.magnitude <= limit).map(p => p.magnitude);
    const beyond = activeSamples.some(p => !Number.isFinite(p.magnitude) || p.magnitude > limit);
    const hasNegative = activeSamples.some(p => p.signChanged);
    const largest = Math.max(1.2, ...values);
    const step = tickStep(largest * 1.04);
    const yMax = Math.min(limit, Math.ceil(largest * 1.04 / step) * step);
    const width = shell.clientWidth;
    const height = svg.clientHeight;
    const left = width < 420 ? 51 : 64, right = width < 420 ? 17 : 27, top = 26, bottom = 57;
    const plotWidth = width - left - right, plotHeight = height - top - bottom;
    const x = value => left + (Math.log10(value) + 3) / 3 * plotWidth;
    const y = value => top + plotHeight * (1 - value / yMax);
    layout = { width, height, left, right, top, bottom, plotWidth, plotHeight, x, y, yMax };
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    for (const element of [frame, clipRect, hit]) {
      element.setAttribute('x', left); element.setAttribute('y', top);
      element.setAttribute('width', plotWidth); element.setAttribute('height', plotHeight);
    }
    grid.replaceChildren(); labels.replaceChildren();
    for (const value of [.001, .01, .1, 1]) {
      node('line', { x1: x(value), x2: x(value), y1: top, y2: top + plotHeight, class: 'grid-line' }, grid);
      node('text', { x: x(value), y: top + plotHeight + 23, 'text-anchor': value === .001 ? 'start' : value === 1 ? 'end' : 'middle' }, labels, format(value));
    }
    for (let value = 0; value <= yMax + step * .01; value += step) {
      node('line', { x1: left, x2: left + plotWidth, y1: y(value), y2: y(value), class: 'grid-line' }, grid);
      node('text', { x: left - 11, y: y(value) + 4, 'text-anchor': 'end' }, labels, format(value));
    }
    node('text', { class: 'axis-label', x: left + plotWidth / 2, y: height - 7, 'text-anchor': 'middle' }, labels, width < 420 ? 'Starting value · log scale' : 'Starting singular value · log scale');
    node('text', { class: 'axis-label', transform: `translate(${width < 420 ? 12 : 16},${top + plotHeight / 2}) rotate(-90)`, 'text-anchor': 'middle' }, labels, 'Singular value after iterations');
    target.setAttribute('x1', left); target.setAttribute('x2', left + plotWidth);
    target.setAttribute('y1', y(1)); target.setAttribute('y2', y(1));
    const pathFor = points => {
      let d = '', previous = null;
      for (const point of points) {
        // Break the path at overflow; never connect across undefined results.
        if (!Number.isFinite(point.magnitude)) { previous = null; continue; }
        const py = y(Math.min(point.magnitude, yMax * 2));
        d += `${previous ? 'L' : 'M'}${x(point.x).toFixed(2)},${py.toFixed(2)}`;
        previous = point;
      }
      return d;
    };
    activePath.setAttribute('d', pathFor(activeSamples));
    referencePath.setAttribute('d', pathFor(referenceSamples));
    const notices = [];
    if (beyond) notices.push('Some results exceed the plotting limit of 1,000,000. Those parts of the curve are omitted.');
    if (hasNegative) notices.push('The polynomial produces negative outputs. The chart shows singular magnitudes; these updates can reverse singular directions.');
    $('plot-notice').textContent = notices.join(' ');
    $('plot-notice').hidden = notices.length === 0;
    $('chart-desc').textContent = `After ${state.iterations} iterations with coefficients a = ${state.coefficients.a}, b = ${state.coefficients.b}, c = ${state.coefficients.c}. Input singular values range from 0.001 to 1 on a logarithmic scale. ${notices.join(' ')}`;
    if (hoverX !== null) showHover(hoverX);
  }

  function scheduleDraw() {
    if (!framePending) { framePending = true; requestAnimationFrame(draw); }
  }

  function sync() {
    $('iterations').max = state.max;
    $('iterations').value = state.iterations;
    $('iterations').style.setProperty('--progress', `${100 * state.iterations / state.max}%`);
    $('iteration-output').value = state.iterations;
    $('iteration-output').textContent = state.iterations;
    $('iteration-total').textContent = ` / ${state.max}`;
    $('slider-max-label').textContent = `${state.max} ${state.max === 1 ? 'iteration' : 'iterations'}`;
    $('method-tag').textContent = isDefault() ? 'MUON DEFAULTS' : 'CUSTOM COEFFICIENTS';
    $('curve-name').textContent = isDefault() ? 'Muon quintic' : 'Custom polynomial';
    $('coefficient-note').textContent = isDefault() ? "Muon's coefficients raise small singular values quickly, allowing overshoot around 1." : 'Custom coefficients may amplify, shrink, or destabilize singular values.';
    scheduleDraw();
  }

  function showHover(start) {
    if (!layout) return;
    hoverX = start;
    const { x, y, left, top, plotHeight, width, yMax } = layout;
    const current = math.iterate(start, state.iterations, state.coefficients).magnitude;
    const reference = math.iterate(start, state.iterations, math.classical).magnitude;
    hover.setAttribute('visibility', 'visible');
    hoverLine.setAttribute('x1', x(start)); hoverLine.setAttribute('x2', x(start));
    hoverLine.setAttribute('y1', top); hoverLine.setAttribute('y2', top + plotHeight);
    activeDot.setAttribute('cx', x(start)); activeDot.setAttribute('cy', y(Math.min(current, yMax)));
    activeDot.setAttribute('visibility', Number.isFinite(current) && current <= yMax ? 'visible' : 'hidden');
    referenceDot.setAttribute('cx', x(start)); referenceDot.setAttribute('cy', y(reference));
    referenceDot.setAttribute('visibility', state.comparison ? 'visible' : 'hidden');
    tooltip.innerHTML = `<div class="tooltip-title">STARTING VALUE <strong>${format(start)}</strong></div><div class="tooltip-row"><span class="tooltip-series"><i></i>${isDefault() ? 'Muon' : 'Custom'}</span><strong>${format(current)}</strong></div>${state.comparison ? `<div class="tooltip-row"><span class="tooltip-series reference"><i></i>Classical cubic</span><strong>${format(reference)}</strong></div>` : ''}`;
    tooltip.hidden = false;
    const desired = x(start) + 16;
    tooltip.style.left = `${Math.max(4, Math.min(desired, width - tooltip.offsetWidth - 4))}px`;
    tooltip.style.top = `${top + 12}px`;
  }

  function inspect(event) {
    const bounds = svg.getBoundingClientRect();
    const px = Math.max(layout.left, Math.min(layout.left + layout.plotWidth, event.clientX - bounds.left));
    showHover(10 ** (-3 + 3 * (px - layout.left) / layout.plotWidth));
  }
  hit.addEventListener('pointermove', inspect);
  hit.addEventListener('pointerdown', inspect);
  hit.addEventListener('pointerleave', event => { if (event.pointerType !== 'touch') { hoverX = null; tooltip.hidden = true; hover.setAttribute('visibility', 'hidden'); } });
  $('iterations').addEventListener('input', event => { state.iterations = Number(event.target.value); sync(); });
  $('max-iterations').addEventListener('input', event => {
    const raw = event.target.value;
    const value = Number(raw);
    const valid = raw.trim() !== '' && Number.isInteger(value) && value >= 1 && value <= 100;
    event.target.setAttribute('aria-invalid', String(!valid));
    $('max-error').hidden = valid;
    if (!valid) return;
    state.max = value;
    state.iterations = Math.min(state.iterations, state.max);
    sync();
  });
  for (const key of ['a', 'b', 'c']) $('coefficient-' + key).addEventListener('input', () => {
    let valid = true;
    const next = {};
    for (const field of ['a', 'b', 'c']) {
      const input = $('coefficient-' + field);
      next[field] = Number(input.value);
      const fieldValid = input.value.trim() !== '' && Number.isFinite(next[field]);
      input.setAttribute('aria-invalid', String(!fieldValid));
      valid = valid && fieldValid;
    }
    $('coefficient-error').hidden = valid;
    if (valid) { state.coefficients = next; sync(); }
  });
  $('comparison').addEventListener('change', event => { state.comparison = event.target.checked; scheduleDraw(); });
  $('reset-coefficients').addEventListener('click', () => {
    state.coefficients = { ...math.defaults };
    for (const key of ['a', 'b', 'c']) { $('coefficient-' + key).value = math.defaults[key].toFixed(4); $('coefficient-' + key).setAttribute('aria-invalid', 'false'); }
    $('coefficient-error').hidden = true;
    sync();
  });
  new ResizeObserver(scheduleDraw).observe(shell);
  sync();
})();
