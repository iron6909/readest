import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('local-only sync architecture', () => {
  test('does not mount Readest account sync at application or reader entry points', () => {
    expect(source('src/components/Providers.tsx')).not.toContain('initSettingsSync');
    expect(source('src/app/library/page.tsx')).not.toContain('useReplicaPull');
    expect(source('src/app/reader/components/Reader.tsx')).not.toContain('useReplicaPull');
    expect(source('src/app/reader/components/FoliateViewer.tsx')).not.toContain('useProgressSync');
    expect(source('src/app/reader/components/annotator/Annotator.tsx')).not.toContain(
      'useNotesSync',
    );
  });
});
