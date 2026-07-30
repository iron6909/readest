# Local-Only Application and Third-Party Sync Design

## Goal

Remove Readest account login and every Readest Cloud feature while retaining local reading features and unrestricted WebDAV, Google Drive, S3, and OneDrive sync. Replace account-backed AI, DeepL, and metadata calls with local user configuration where applicable.

## Scope

The client no longer exposes or initializes Supabase account authentication, profile, subscription, billing, Readest Cloud storage, replica synchronization, sharing, or Send to Readest.

The application retains local libraries, imports, backups, OPDS, RSS, KOSync, Hardcover using its user-provided token, local reading statistics, local settings, and the four third-party file-sync providers. Google Drive and OneDrive OAuth remain because they authorize those providers, not a Readest account.

## Cloud Sync

Third-party sync providers are independent local configurations. WebDAV, Google Drive, S3, and OneDrive must be configurable, enabled, and runnable with no Readest login or plan. Their existing provider credentials, OAuth flows, file engines, and sync settings stay intact.

Remove plan-derived cloud-sync state, premium badges, profile redirects, and paused-by-plan behavior. The cloud-sync UI contains only third-party providers. The existing manual sync action runs enabled third-party backends; it does not navigate to login or invoke Readest Cloud.

Readest Cloud selection, native book rows/files, cover storage, progress and notes synchronization, settings replicas, remote custom assets, and cross-device statistics are removed rather than silently falling back to another service.

## Local Service Configuration

Readest retains its current settings placement rather than introducing a new Skills navigation area. ReadAny is used as a configuration model: settings are local, provider-specific, explicit about which fields are needed, and offer connection validation where the provider permits it.

### AI

Keep existing AI Gateway, OpenRouter, and OpenAI-compatible settings. AI requests must use the user-configured key only. Remove account validation and server environment-key fallback from the AI chat and embedding routes. Existing local/direct providers remain unchanged.

### Translation

Keep Google, Azure, and Tauri direct Yandex translation behavior. Add a local DeepL API key and optional base URL to the existing language settings. The DeepL provider calls the configured endpoint directly and no longer uses account plans, project credentials, or daily account usage. Web Yandex remains unavailable where browser CORS requires the current authenticated proxy; it must not become an unauthenticated project relay.

AI translation reuses the existing configured AI endpoint and model rather than a Readest account service.

### Metadata

Add a local Google Books key setting. Metadata lookup calls Google Books directly with that key when configured and otherwise uses the anonymous API. Rate-limit and provider errors surface normally. The project-held Google Books key and authenticated metadata route are removed.

### Edge TTS

Keep the direct Microsoft Edge Read Aloud WebSocket transport. It uses the built-in Edge client token and time-based Sec-MS-GEC request signature, not a user cloud API key or Readest server.

Remove the authenticated HTTP fallback (`/api/tts/edge`) and `tts-need-auth` behavior. A direct transport failure reports normal network/service unavailability. Existing player controls, sentence/word timing, cache, voice list, and cached-audio offline playback remain unchanged.

## Error Handling

Missing local credentials disable only the relevant provider and point to its configuration field. No error path redirects to login or subscription. Third-party provider connection failures retain their existing provider-specific messages.

No existing local or third-party cloud data is deleted by the migration. Unused legacy account settings may remain on disk but must no longer be read or sent.

## Testing

Tests will prove that all four third-party sync providers work with a free or absent user plan; the cloud-sync gate never pauses them; and the UI has no premium/login redirects.

Tests will cover direct Edge TTS failure without an auth event or HTTP fallback; AI routes rejecting requests without a supplied user key and accepting supplied keys without account validation; DeepL local-key behavior; and Google Books configured-key versus anonymous lookup selection.

Tests will also cover removal of account-dependent navigation and lifecycle hooks, then run affected Vitest suites, formatting, and TypeScript checking.
