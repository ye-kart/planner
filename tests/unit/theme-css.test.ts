import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { neonTheme } from '../../packages/web/src/themes/themes';
import { TOKEN_TO_VAR } from '../../packages/web/src/themes/css-vars';
import type { ColorTokens } from '../../packages/web/src/themes/tokens';

// The @theme block in index.css duplicates the neon theme so the app renders
// correctly before applyTheme() runs. This test is the drift guard: if either
// side changes without the other, it fails.
describe('index.css @theme defaults', () => {
  const css = readFileSync(resolve(__dirname, '../../packages/web/src/index.css'), 'utf8');
  const themeBlock = css.match(/@theme\s*\{([^}]*)\}/)?.[1];

  it('has an @theme block', () => {
    expect(themeBlock).toBeTruthy();
  });

  it('matches the neon theme token for token', () => {
    const cssVars = Object.fromEntries(
      [...themeBlock!.matchAll(/(--color-[a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]),
    );
    for (const [token, cssVar] of Object.entries(TOKEN_TO_VAR)) {
      expect(cssVars[cssVar], `${cssVar} should match neonTheme.colors.${token}`)
        .toBe(neonTheme.colors[token as keyof ColorTokens]);
    }
    // No stray vars in CSS that the theme system doesn't know about.
    expect(Object.keys(cssVars).sort()).toEqual(Object.values(TOKEN_TO_VAR).sort());
  });
});
