'use strict';

const { calculateReadingTime } = require('../../src/utils/readingTime');

describe('calculateReadingTime()', () => {
  it('retourne 0 pour un contenu vide', () => {
    expect(calculateReadingTime('')).toBe(0);
    expect(calculateReadingTime(null)).toBe(0);
  });
  it('retourne au moins 1 minute pour un contenu court', () => {
    expect(calculateReadingTime('Ceci est un court paragraphe de test.')).toBe(1);
  });
  it('arrondit au supérieur (~200 mots/min)', () => {
    const mots = Array(450).fill('mot').join(' '); // 450 / 200 = 2.25 -> 3
    expect(calculateReadingTime(mots)).toBe(3);
  });
  it('dépouille le HTML avant de compter', () => {
    const html = '<p>' + Array(200).fill('mot').join(' ') + '</p>';
    expect(calculateReadingTime(html)).toBe(1);
  });
});
