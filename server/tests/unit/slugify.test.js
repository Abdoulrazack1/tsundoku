'use strict';

const slugify = require('../../src/utils/slugify');

describe('slugify()', () => {
  it('convertit les espaces en tirets', () => {
    expect(slugify('Mon article de blog')).toBe('mon-article-de-blog');
  });
  it('supprime les accents', () => {
    expect(slugify('Été à Paris')).toBe('ete-a-paris');
  });
  it('supprime les caractères spéciaux', () => {
    expect(slugify('Hello, World!')).toBe('hello-world');
  });
  it('gère les chaînes vides et non-string', () => {
    expect(slugify('')).toBe('');
    expect(slugify(null)).toBe('');
    expect(slugify(undefined)).toBe('');
  });
  it('normalise les titres japonais translittérés', () => {
    expect(slugify('Vinland Saga : la longue route')).toBe('vinland-saga-la-longue-route');
  });
});
