export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: readonly ChatMessage[];
  timeoutMs: number;
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}

export interface ChatCompletion {
  text: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  rawUsage?: Record<string, unknown>;
}

export class AiProviderError extends Error {
  public constructor(
    message: string,
    public readonly status: number | undefined,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = "AiProviderError";
  }
}

export interface AiProvider {
  readonly id: string;
  readonly displayName: string;
  chat(request: ChatRequest): Promise<ChatCompletion>;
}

interface OpenAIStyleResponse {
  choices?: Array<{ message?: { content?: string } }>;
  model?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } & Record<
    string,
    unknown
  >;
  error?: { message?: string };
}

/**
 * Talks to any provider exposing the widely documented OpenAI-compatible
 * chat-completions endpoint. The base URL and key come from the environment;
 * no model names are invented by the application.
 */
export class OpenAICompatibleProvider implements AiProvider {
  public readonly id: string;
  public readonly displayName = "OpenAI-compatible provider";
  private readonly endpoint: string;

  public constructor(
    id: string,
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {
    this.id = id;
    const trimmed = baseUrl.replace(/\/$/, "");
    this.endpoint = trimmed.endsWith("/chat/completions") ? trimmed : `${trimmed}/chat/completions`;
  }

  public async chat(request: ChatRequest): Promise<ChatCompletion> {
    let response: Response;
    try {
      response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          ...(request.maxTokens !== undefined ? { max_tokens: request.maxTokens } : {}),
          ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
        }),
        signal: request.signal ?? AbortSignal.timeout(request.timeoutMs),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "network error";
      throw new AiProviderError(`AI provider request failed: ${message}`, undefined, true);
    }

    const text = await response.text();
    let payload: OpenAIStyleResponse;
    try {
      payload = JSON.parse(text) as OpenAIStyleResponse;
    } catch {
      throw new AiProviderError(
        "AI provider returned a non-JSON response.",
        response.status,
        response.status >= 500,
      );
    }
    if (!response.ok) {
      const detail = payload.error?.message ?? `HTTP ${response.status}`;
      throw new AiProviderError(
        `AI provider rejected the request: ${detail}`,
        response.status,
        response.status === 429 || response.status >= 500,
      );
    }
    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.length === 0) {
      throw new AiProviderError("AI provider returned an empty response.", response.status, false);
    }
    return {
      text: content,
      model: payload.model ?? request.model,
      inputTokens: payload.usage?.prompt_tokens,
      outputTokens: payload.usage?.completion_tokens,
      rawUsage: payload.usage,
    };
  }
}
