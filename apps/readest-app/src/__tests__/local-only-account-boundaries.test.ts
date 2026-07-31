import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const sourceRoot = resolve(import.meta.dirname, '..');

describe('local-only account boundaries', () => {
  test('does not ship account-hosted share or inbox clients', () => {
    const removedModules = [
      'app/library/components/ShareBookDialog.tsx',
      'hooks/useInboxDrainer.ts',
      'hooks/useOpenShareLink.ts',
      'libs/share.ts',
      'services/send/inboxDrainer.ts',
    ];

    for (const modulePath of removedModules) {
      expect(existsSync(resolve(sourceRoot, modulePath)), modulePath).toBe(false);
    }
  });
});
