/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function rule(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? '';
}

function zIndex(declarations: string): number {
  return Number(declarations.match(/z-index:\s*(\d+)/)?.[1] ?? 0);
}

describe('Company Explorer stacking', () => {
  it('keeps the search dropdown above the sibling Layer Manager', () => {
    const explorerCss = readFileSync(
      new URL('./CompanyExplorer.css', import.meta.url),
      'utf8'
    );
    const layerCss = readFileSync(
      new URL('./LayerManager.css', import.meta.url),
      'utf8'
    );

    expect(zIndex(rule(explorerCss, '.company-explorer')))
      .toBeGreaterThan(zIndex(rule(layerCss, '.layer-manager')));
    expect(zIndex(rule(explorerCss, '.search-dropdown'))).toBeGreaterThan(0);
  });
});
