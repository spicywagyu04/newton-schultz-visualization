(function (root) {
  'use strict';
  const defaults = Object.freeze({ a: 3.4445, b: -4.7750, c: 2.0315 });
  const classical = Object.freeze({ a: 1.5, b: -0.5, c: 0 });
  function iterate(start, steps, coefficients = defaults) {
    let value = start;
    let signChanged = false;
    for (let k = 0; k < steps; k++) {
      const squared = value * value;
      // Avoid 0 × Infinity when the fifth- or third-degree term is absent.
      const multiplier = coefficients.c !== 0
        ? coefficients.a + squared * (coefficients.b + coefficients.c * squared)
        : coefficients.b !== 0 ? coefficients.a + coefficients.b * squared : coefficients.a;
      value *= multiplier;
      if (!Number.isFinite(value)) return { magnitude: Infinity, signChanged };
      if (value < 0) signChanged = true;
      // Singular values are magnitudes. Oddness makes this equivalent to
      // tracking signed polynomial outputs and taking the final absolute value.
      value = Math.abs(value);
    }
    return { magnitude: value, signChanged };
  }
  function samples(steps, coefficients, count = 2401) {
    return Array.from({ length: count }, (_, i) => {
      const x = Math.pow(10, -3 + 3 * i / (count - 1));
      return { x, ...iterate(x, steps, coefficients) };
    });
  }
  const api = { defaults, classical, iterate, samples };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.NSMath = api;
})(typeof window !== 'undefined' ? window : globalThis);
