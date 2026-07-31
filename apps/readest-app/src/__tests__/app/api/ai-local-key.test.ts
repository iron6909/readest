import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createGateway: vi.fn(),
  streamText: vi.fn(),
  embed: vi.fn(),
  embedMany: vi.fn(),
}));

vi.mock('ai', () => ({
  createGateway: mocks.createGateway,
  streamText: mocks.streamText,
  embed: mocks.embed,
  embedMany: mocks.embedMany,
}));

import { POST as chat } from '@/app/api/ai/chat/route';
import { POST as embed } from '@/app/api/ai/embed/route';

const request = (path: string, body: object) =>
  new Request(`http://localhost/api/ai/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('local AI credentials', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const gateway = Object.assign(
      vi.fn(() => ({ model: true })),
      {
        embeddingModel: vi.fn(() => ({ embeddingModel: true })),
      },
    );
    mocks.createGateway.mockReturnValue(gateway);
    mocks.streamText.mockReturnValue({
      toTextStreamResponse: () => new Response('ok'),
    });
    mocks.embed.mockResolvedValue({ embedding: [1] });
  });

  test('chat accepts a supplied key without validating a Readest account', async () => {
    const response = await chat(
      request('chat', {
        apiKey: 'user-key',
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.createGateway).toHaveBeenCalledWith({ apiKey: 'user-key' });
  });

  test('chat rejects requests without a user-supplied key', async () => {
    vi.stubEnv('AI_GATEWAY_API_KEY', 'hosted-fallback-key');
    const response = await chat(request('chat', { messages: [] }));

    expect(response.status).toBe(401);
    expect(mocks.createGateway).not.toHaveBeenCalled();
  });

  test('embedding accepts a supplied key without validating a Readest account', async () => {
    const response = await embed(
      request('embed', { apiKey: 'user-key', texts: ['hello'], single: true }),
    );

    expect(response.status).toBe(200);
    expect(mocks.createGateway).toHaveBeenCalledWith({ apiKey: 'user-key' });
  });
});
