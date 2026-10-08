# Newton–Schulz singular value explorer

Open `index.html` in any modern browser. No installation, build, or internet connection is needed.

For a local server, run `python3 -m http.server 8000 --bind 127.0.0.1` in this folder, then open http://127.0.0.1:8000.

## Controls

- Drag the iteration slider from zero to the selected maximum.
- Set **Maximum iterations** to an integer from 1 to 100. Lowering it clamps the current iteration when necessary.
- Edit **a**, **b**, and **c** to change `p(x) = ax + bx³ + cx⁵` immediately.
- **Reset coefficients** restores Muon's defaults: `(3.4445, -4.7750, 2.0315)`.
- Toggle the classical cubic reference, `1.5x − 0.5x³`.
- Hover or touch the chart to inspect an exact starting value and its outputs.

The horizontal axis covers normalized starting singular values from 0.001 to 1 on a logarithmic scale. Iteration zero is the identity map. The vertical axis shows singular magnitudes, so custom polynomials are evaluated as `σ[k+1] = |p(σ[k])|`. A notice appears for negative polynomial outputs or results beyond the plotting limit of 1,000,000. The plotted curve samples 2,401 starting values; hover values are calculated directly. Many iterations can produce fine oscillations below the chart's sampling resolution.

The Muon coefficients permit overshoot and do not converge exactly to 1. Zero singular values stay zero, and very small singular values need not reach the scale of 1 after five iterations.

Source: [Keller Jordan's Muon explanation](https://kellerjordan.github.io/posts/muon/).

## Files

- `index.html`: page structure and controls
- `styles.css`: responsive visual design
- `math.js`: polynomial iteration and sampling
- `app.js`: chart rendering and interactions
