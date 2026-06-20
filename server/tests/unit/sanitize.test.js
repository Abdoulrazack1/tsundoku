'use strict';

const { sanitizeHtml, escapeHtml } = require('../../src/utils/sanitize');

describe('sanitizeHtml()', () => {
  it('retire les balises script', () => {
    expect(sanitizeHtml('<p>ok</p><script>alert(1)</script>')).not.toMatch(/script/i);
  });
  it('neutralise les gestionnaires inline (onerror, onclick)', () => {
    expect(sanitizeHtml('<img src=x onerror="alert(1)">')).not.toMatch(/onerror/i);
  });
  it('neutralise les URLs javascript:', () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).not.toMatch(/javascript:/i);
  });
  it('préserve le contenu légitime', () => {
    expect(sanitizeHtml('<p>Bonjour <strong>monde</strong></p>')).toBe('<p>Bonjour <strong>monde</strong></p>');
  });
});

describe('escapeHtml()', () => {
  it('échappe les caractères HTML', () => {
    expect(escapeHtml('<b>&"')).toBe('&lt;b&gt;&amp;&quot;');
  });
});
