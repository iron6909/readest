# Local-Only Cloud Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Readest a local-first reader with unrestricted user-owned cloud sync and no Readest account, plan, billing, or hosted-storage dependency.

**Architecture:** Preserve the four existing file-sync providers and their credentials while removing plan gates. Delete account-backed features at their entry points and transport clients rather than leaving dormant calls. Retain local/direct providers and move AI, DeepL, metadata, and Edge TTS onto user configuration or existing direct transports.

**Tech Stack:** Next.js 16, React, TypeScript, Zustand, Vitest, Tauri v2, existing WebDAV/Drive/S3/OneDrive providers.

---

### Task 1: Make Third-Party Cloud Sync Unconditional

**Files:**
- Modify: `apps/readest-app/src/services/sync/cloudSyncProvider.ts`
- Modify: `apps/readest-app/src/components/settings/integrations/cloudSyncStatus.ts`
- Modify: `apps/readest-app/src/components/settings/IntegrationsPanel.tsx`
- Test: `apps/readest-app/src/__tests__/services/sync/cloudSyncProvider.test.ts`
- Test: `apps/readest-app/src/__tests__/components/settings/cloudSync.test.ts`

- [ ] **Step 1: Write failing gate tests**

```ts
test('keeps every enabled third-party backend active for a free plan', () => {
  const settings = s({ webdav: { enabled: true } as never });
  expect(resolveCloudSyncGate(settings, 'free')).toEqual({
    readest: false,
    backends: ['webdav'],
    paused: false,
  });
  expect(getActiveFileSyncBackends(settings, 'free')).toEqual(['webdav']);
});
```

- [ ] **Step 2: Run the focused test and verify the pre-change premium pause failure**

Run: `pnpm test -- src/__tests__/services/sync/cloudSyncProvider.test.ts --run`

Expected: the new test fails because `paused` is `true` and active backends are empty.

- [ ] **Step 3: Remove plan-driven gating**

```ts
export const resolveCloudSyncGate = (
  settings: SystemSettings | null | undefined,
): CloudSyncGate => ({
  readest: isReadestCloudEnabled(settings),
  backends: getEnabledFileSyncBackends(settings),
  paused: false,
});

export const getActiveFileSyncBackends = (
  settings: SystemSettings | null | undefined,
): FileSyncBackendKind[] => getEnabledFileSyncBackends(settings);
```

Remove `UserPlan`, `isCloudSyncAllowed`, cached plan setters, premium badges, plan redirects, and the `canToggleCloudProvider` premium input. Provider rows must open their configuration when unconfigured or configured, without a Readest profile route.

- [ ] **Step 4: Update UI expectations**

Replace premium-gate assertions with assertions that unconfigured providers open configuration, configured providers toggle, and no provider status can be `Paused — plan required`.

- [ ] **Step 5: Run focused cloud-sync suites**

Run: `pnpm test -- src/__tests__/services/sync/cloudSyncProvider.test.ts src/__tests__/components/settings/cloudSync.test.ts src/__tests__/components/settings/cloudSyncStatus.test.ts --run`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/readest-app/src/services/sync/cloudSyncProvider.ts \
  apps/readest-app/src/components/settings/integrations/cloudSyncStatus.ts \
  apps/readest-app/src/components/settings/IntegrationsPanel.tsx \
  apps/readest-app/src/__tests__/services/sync/cloudSyncProvider.test.ts \
  apps/readest-app/src/__tests__/components/settings/cloudSync.test.ts
git commit -m "feat: remove cloud sync plan gate"
```

### Task 2: Remove Account-Only Sync Selection and Lifecycle Calls

**Files:**
- Modify: `apps/readest-app/src/components/Providers.tsx`
- Modify: `apps/readest-app/src/app/library/hooks/useBooksSync.ts`
- Modify: `apps/readest-app/src/app/reader/hooks/useNotesSync.ts`
- Modify: `apps/readest-app/src/app/reader/hooks/useProgressSync.ts`
- Delete: `apps/readest-app/src/hooks/useReplicaPull.ts`
- Delete: `apps/readest-app/src/services/sync/replicaSync.ts`
- Delete: `apps/readest-app/src/services/sync/replicaSettingsSync.ts`
- Delete: `apps/readest-app/src/services/sync/replicaBinaryUpload.ts`
- Delete: `apps/readest-app/src/services/sync/replicaPullAndApply.ts`
- Test: `apps/readest-app/src/__tests__/app/library/useBooksSync-routing.test.tsx`
- Test: `apps/readest-app/src/__tests__/hooks/useProgressSync.test.tsx`

- [ ] **Step 1: Write failing file-sync-only routing tests**

```ts
test('runs enabled file providers without a Readest user', async () => {
  renderHook(() => useBooksSync());
  await act(async () => eventDispatcher.dispatch('pull-library'));
  expect(runFileLibrarySyncPass).toHaveBeenCalledOnce();
  expect(syncBooks).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the routing test and verify it fails due to the user guard**

Run: `pnpm test -- src/__tests__/app/library/useBooksSync-routing.test.tsx --run`

Expected: FAIL because the current hook only pulls after `useAuth().user` resolves.

- [ ] **Step 3: Remove native Readest Cloud legs**

Remove `useAuth`, `useSync`, native `syncBooks`, `syncNotes`, and `syncProgress` branches. `useBooksSync` must invoke `runFileLibrarySyncPass` whenever third-party providers are enabled. Remove `AuthProvider`, replica initialization, replica pull hooks, and their imports from application startup.

- [ ] **Step 4: Delete remote replica code and update imports/tests**

Delete only modules whose transport is a Readest account/replica API. Remove related tests or replace them with file-sync routing coverage; preserve file provider engine tests.

- [ ] **Step 5: Run local and file-sync tests**

Run: `pnpm test -- src/__tests__/app/library/useBooksSync-routing.test.tsx src/__tests__/services/sync/file/runLibrarySync.test.ts --run`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A apps/readest-app/src/components/Providers.tsx \
  apps/readest-app/src/app/library/hooks/useBooksSync.ts \
  apps/readest-app/src/app/reader/hooks/useNotesSync.ts \
  apps/readest-app/src/app/reader/hooks/useProgressSync.ts \
  apps/readest-app/src/hooks/useReplicaPull.ts \
  apps/readest-app/src/services/sync
git commit -m "refactor: remove Readest Cloud synchronization"
```

### Task 3: Remove Account UI, Navigation, and Hosted Features

**Files:**
- Delete: `apps/readest-app/src/context/AuthContext.tsx`
- Delete: `apps/readest-app/src/app/auth/`
- Delete: `apps/readest-app/src/app/user/`
- Delete: `apps/readest-app/src/app/send/`
- Delete: `apps/readest-app/src/app/s/`
- Delete: `apps/readest-app/src/components/settings/integrations/SendToReadestForm.tsx`
- Delete: `apps/readest-app/src/hooks/useInboxDrainer.ts`
- Delete: `apps/readest-app/src/hooks/useOpenShareLink.ts`
- Delete: `apps/readest-app/src/libs/share.ts`
- Delete: `apps/readest-app/src/libs/storage.ts`
- Modify: `apps/readest-app/src/app/library/components/LibraryEmptyState.tsx`
- Modify: `apps/readest-app/src/app/reader/components/ViewMenu.tsx`
- Modify: `apps/readest-app/src/app/reader/components/ReaderContent.tsx`
- Test: `apps/readest-app/src/__tests__/app/library/library-empty-state.test.tsx`
- Test: `apps/readest-app/src/__tests__/utils/nav.test.ts`

- [ ] **Step 1: Write failing navigation tests**

```tsx
test('does not render a sign-in action in an empty local library', () => {
  render(<LibraryEmptyState onImport={vi.fn()} />);
  expect(screen.queryByText('Sign in to sync your library')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test and verify the current sign-in action is present**

Run: `pnpm test -- src/__tests__/app/library/library-empty-state.test.tsx --run`

Expected: FAIL because the component renders a login link for anonymous users.

- [ ] **Step 3: Remove account-only routes and UI**

Delete the auth, profile, billing, share, Send to Readest, account storage, and user API routes. Remove account menu handlers, login redirects, Readest Cloud row, share entry points, and user-state conditions from remaining components. Keep unrelated route helpers used by supported paths.

- [ ] **Step 4: Remove unreferenced account transports**

Delete Supabase storage/sync clients and server endpoints under `src/pages/api/{storage,sync,user,send}` and `src/app/api/{share,stripe,apple,google}`. Preserve `/api/opds/proxy`, `/api/hardcover/graphql`, and `/api/kosync`.

- [ ] **Step 5: Run navigation and type checks**

Run: `pnpm test -- src/__tests__/app/library/library-empty-state.test.tsx src/__tests__/utils/nav.test.ts --run && pnpm lint`

Expected: PASS with no unresolved `AuthContext`, `/auth`, or `/user` imports.

- [ ] **Step 6: Commit**

```bash
git add -A apps/readest-app/src
git commit -m "refactor: remove Readest account features"
```

### Task 4: Make Edge TTS Direct-Only

**Files:**
- Modify: `apps/readest-app/src/services/tts/EdgeTTSClient.ts`
- Modify: `apps/readest-app/src/services/tts/TTSController.ts`
- Modify: `apps/readest-app/src/app/reader/hooks/useTTSControl.ts`
- Modify: `apps/readest-app/src/libs/edgeTTS.ts`
- Delete: `apps/readest-app/src/app/api/tts/edge/route.ts`
- Test: `apps/readest-app/src/__tests__/services/edge-tts-client.test.ts`
- Test: `apps/readest-app/src/__tests__/services/tts-offline-init.test.ts`

- [ ] **Step 1: Write a failing direct-only error test**

```ts
test('does not dispatch an account-auth event when the Edge WebSocket fails', async () => {
  createBehavior = () => Promise.reject(new Error('wss failed'));
  const dispatchEvent = vi.fn();
  const client = new EdgeTTSClient({ dispatchEvent } as unknown as TTSController);

  expect(await client.init()).toBe(false);
  expect(dispatchEvent).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the Edge client test and verify the current auth event failure**

Run: `pnpm test -- src/__tests__/services/edge-tts-client.test.ts --run`

Expected: FAIL because the old client emits `tts-need-auth` after a direct transport failure.

- [ ] **Step 3: Delete HTTP fallback and account state**

Make `EdgeTTSClient.init()` attempt only `wss`; keep cache-only initialization when persistent audio is available. Remove `isAuthenticated`, `tts-need-auth`, `navigateToLogin`, `/api/tts/edge`, `fetchWithAuth`, and the HTTP Edge protocol branch.

- [ ] **Step 4: Update cache and failure tests**

Replace account-auth expectations with direct transport failure expectations; retain tests that cached audio initializes while offline.

- [ ] **Step 5: Run TTS tests**

Run: `pnpm test -- src/__tests__/services/edge-tts-client.test.ts src/__tests__/services/tts-offline-init.test.ts --run`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A apps/readest-app/src/services/tts apps/readest-app/src/libs/edgeTTS.ts \
  apps/readest-app/src/app/reader/hooks/useTTSControl.ts \
  apps/readest-app/src/app/api/tts/edge \
  apps/readest-app/src/__tests__/services/edge-tts-client.test.ts \
  apps/readest-app/src/__tests__/services/tts-offline-init.test.ts
git commit -m "refactor: use direct Edge TTS only"
```

### Task 5: Make AI and DeepL User-Key Only

**Files:**
- Modify: `apps/readest-app/src/app/api/ai/chat/route.ts`
- Modify: `apps/readest-app/src/app/api/ai/embed/route.ts`
- Modify: `apps/readest-app/src/services/translators/providers/deepl.ts`
- Modify: `apps/readest-app/src/components/settings/AIPanel.tsx`
- Modify: `apps/readest-app/src/components/settings/LangPanel.tsx`
- Modify: `apps/readest-app/src/types/settings.ts`
- Delete: `apps/readest-app/src/pages/api/deepl/translate.ts`
- Test: `apps/readest-app/src/__tests__/app/api/ai-chat.test.ts`
- Test: `apps/readest-app/src/__tests__/services/translators/deepl.test.ts`

- [ ] **Step 1: Write failing API route tests**

```ts
test('accepts a supplied AI Gateway key without validating a Readest account', async () => {
  const response = await POST(
    new Request('http://localhost/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ apiKey: 'user-key', messages: [{ role: 'user', content: 'Hi' }] }),
    }),
  );
  expect(response.status).not.toBe(403);
});

test('rejects a request with no user AI key', async () => {
  const response = await POST(new Request('http://localhost/api/ai/chat', { method: 'POST', body: JSON.stringify({ messages: [] }) }));
  expect(response.status).toBe(401);
});
```

- [ ] **Step 2: Run the route test and verify the account-auth failure**

Run: `pnpm test -- src/__tests__/app/api/ai-chat.test.ts --run`

Expected: FAIL because the route currently returns 403 before considering the user key.

- [ ] **Step 3: Remove hosted key and account quota paths**

Remove `validateUserAndToken` and `AI_GATEWAY_API_KEY` fallback from AI routes. Add `deeplApiKey` and `deeplBaseUrl` to local system settings, render password/base URL fields in the existing language panel, and make the DeepL provider call that configured endpoint with `DeepL-Auth-Key`. Remove plan, usage, and `/api/deepl/translate` dependencies.

- [ ] **Step 4: Add DeepL configuration tests**

```ts
test('sends the configured local DeepL key directly', async () => {
  await deeplProvider.translate(['Hello'], 'EN', 'DE');
  expect(fetch).toHaveBeenCalledWith(
    expect.stringContaining('/translate'),
    expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'DeepL-Auth-Key user-key' }) }),
  );
});
```

- [ ] **Step 5: Run AI and translation tests**

Run: `pnpm test -- src/__tests__/app/api/ai-chat.test.ts src/__tests__/services/translators/deepl.test.ts --run`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A apps/readest-app/src/app/api/ai apps/readest-app/src/services/translators \
  apps/readest-app/src/components/settings/AIPanel.tsx \
  apps/readest-app/src/components/settings/LangPanel.tsx \
  apps/readest-app/src/types/settings.ts apps/readest-app/src/pages/api/deepl
git commit -m "feat: use local AI and DeepL credentials"
```

### Task 6: Move Metadata Search to Google Books Direct Access

**Files:**
- Modify: `apps/readest-app/src/services/metadata/providers/googlebooks.ts`
- Modify: `apps/readest-app/src/components/metadata/useMetadataEdit.ts`
- Modify: `apps/readest-app/src/components/settings/IntegrationsPanel.tsx`
- Modify: `apps/readest-app/src/types/settings.ts`
- Delete: `apps/readest-app/src/app/api/metadata/search/route.ts`
- Delete: `apps/readest-app/src/libs/metadata.ts`
- Test: `apps/readest-app/src/__tests__/services/metadata/googlebooks.test.ts`

- [ ] **Step 1: Write failing direct metadata tests**

```ts
test('uses the locally configured Google Books key when searching', async () => {
  await provider.search({ title: 'The Left Hand of Darkness' });
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining('key=user-google-books-key'));
});

test('searches anonymously when no Google Books key is configured', async () => {
  await provider.search({ isbn: '9780441478125' });
  expect(fetch).toHaveBeenCalledWith(expect.not.stringContaining('key='));
});
```

- [ ] **Step 2: Run the provider test and verify the current no-key constructor behavior**

Run: `pnpm test -- src/__tests__/services/metadata/googlebooks.test.ts --run`

Expected: FAIL because `GoogleBooksProvider` currently requires a non-empty key list.

- [ ] **Step 3: Permit anonymous Google Books lookup**

Make `GoogleBooksProvider` build a `key` query parameter only when the locally configured key list is non-empty. Replace `searchMetadata()` authenticated route use with the provider/service directly. Add a local Google Books key field in settings UI.

- [ ] **Step 4: Run metadata tests**

Run: `pnpm test -- src/__tests__/services/metadata/googlebooks.test.ts src/__tests__/components/BookDetailModal.test.tsx --run`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A apps/readest-app/src/services/metadata apps/readest-app/src/components/metadata \
  apps/readest-app/src/components/settings/IntegrationsPanel.tsx \
  apps/readest-app/src/types/settings.ts apps/readest-app/src/app/api/metadata apps/readest-app/src/libs/metadata.ts
git commit -m "feat: use local Google Books metadata configuration"
```

### Task 7: Remove Remaining Account References and Verify the Local-Only Build

**Files:**
- Modify: all remaining imports identified by `rg 'AuthContext|useAuth|supabase|Readest Cloud|navigateToLogin|navigateToProfile' apps/readest-app/src`
- Test: affected existing tests under `apps/readest-app/src/__tests__/`

- [ ] **Step 1: Add regression search checks to the test script documentation**

```bash
rg -n 'AuthContext|useAuth\(|navigateToLogin|navigateToProfile|isCloudSyncAllowed|tts-need-auth' apps/readest-app/src
```

The command must produce no active application references. Exceptions are only migration comments that do not import removed code; remove those comments where they are misleading.

- [ ] **Step 2: Delete stale account tests and add replacements**

Remove tests that assert account login, native cloud sync, billing, sharing, hosted storage, or send inbox behavior. Keep and update tests for local UI, file sync, provider OAuth, and direct transports.

- [ ] **Step 3: Run focused regression suites**

Run: `pnpm test -- src/__tests__/services/sync/cloudSyncProvider.test.ts src/__tests__/services/edge-tts-client.test.ts src/__tests__/app/library/library-empty-state.test.tsx --run`

Expected: PASS.

- [ ] **Step 4: Run project verification**

Run: `pnpm lint && pnpm format:check && pnpm test -- --run`

Expected: all commands pass. Record any unrelated pre-existing failure with its command and test name.

- [ ] **Step 5: Commit**

```bash
git add -A apps/readest-app/src apps/readest-app/package.json apps/readest-app/src/__tests__
git commit -m "test: verify local-only application paths"
```
