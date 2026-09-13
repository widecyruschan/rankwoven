import { createHash } from 'node:crypto';
import type {
  AiGatewayAdapter,
  GatewayEmbeddingRequest,
  GatewayEmbeddingResult,
  GatewayImageRequest,
  GatewayImageResult,
  GatewayModel,
  GatewayTextRequest,
  GatewayTextResult
} from './phase2.js';

interface GatewayOptions {
  baseUrl: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

interface GatewayModelResponse {
  id?: string;
  owned_by?: string;
  supported_endpoint_types?: string[];
  capabilities?: string[];
}

interface ModelsResponse {
  data?: GatewayModelResponse[];
}

interface ChatResponse {
  id?: string;
  model?: string;
  choices?: Array<{
    message?: { content?: unknown };
    finish_reason?: string | null;
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

interface EmbeddingResponse {
  data?: Array<{ embedding?: unknown }>;
  usage?: { prompt_tokens?: number; total_tokens?: number };
}

interface ImageResponse {
  data?: Array<{ url?: string }>;
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, '');
}

function createCatalogHash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function endpointTypes(model: GatewayModelResponse) {
  const values = model.supported_endpoint_types ?? model.capabilities ?? [];
  return values.map((value) => {
    if (value === 'chat.completions') return 'chat';
    if (value === 'embeddings') return 'embedding';
    if (value === 'images') return 'image';
    return value;
  }).filter((value): value is 'chat' | 'embedding' | 'image' =>
    value === 'chat' || value === 'embedding' || value === 'image'
  ).filter((value, index, normalizedValues) => normalizedValues.indexOf(value) === index);
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

async function requestJson<T>(
  fetchImpl: typeof fetch,
  url: string,
  apiKey: string,
  init: RequestInit = {},
  timeoutMs = 30_000
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      ...init,
      signal: init.signal ?? controller.signal,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers
      }
    });
    if (!response.ok) {
      throw new Error(`AI_GATEWAY_HTTP_${response.status}`);
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new Error('AI_GATEWAY_RESPONSE_INVALID');
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('AI_GATEWAY_TIMEOUT', { cause: error });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function createAiGatewayAdapter(options: GatewayOptions): AiGatewayAdapter {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = normalizeBaseUrl(options.baseUrl);

  return {
    gateway: 'wenwen',

    async listModels() {
      const body = await requestJson<ModelsResponse>(fetchImpl, `${baseUrl}/v1/models`, options.apiKey, {}, options.timeoutMs);
      const data = Array.isArray(body.data) ? body.data : [];
      const catalogHash = createCatalogHash(data);
      return data
        .filter((model): model is GatewayModelResponse & { id: string } =>
          typeof model.id === 'string' && model.id.length > 0
        )
        .map<GatewayModel>((model) => ({
          gateway: 'wenwen',
          modelId: model.id,
          ownedBy: model.owned_by,
          supportedEndpointTypes: endpointTypes(model),
          capabilityStatus: 'pending',
          catalogHash
        }));
    },

    async generateText(input: GatewayTextRequest): Promise<GatewayTextResult> {
      const body = await requestJson<ChatResponse>(
        fetchImpl,
        `${baseUrl}/v1/chat/completions`,
        options.apiKey,
        {
          method: 'POST',
          body: JSON.stringify({
            model: input.modelId,
            messages: input.messages,
            ...(input.temperature === undefined ? {} : { temperature: input.temperature }),
            ...(input.maxTokens === undefined ? {} : { max_tokens: input.maxTokens }),
            ...(input.responseFormat === 'json_object' ? { response_format: { type: 'json_object' } } : {})
          })
        },
        options.timeoutMs
      );
      const choice = body.choices?.[0];
      const content = typeof choice?.message?.content === 'string' ? choice.message.content : '';
      const finishReason = choice?.finish_reason ?? undefined;

      return {
        gateway: 'wenwen',
        modelId: input.modelId,
        text: content,
        inputTokens: readNumber(body.usage?.prompt_tokens),
        outputTokens: readNumber(body.usage?.completion_tokens),
        requestId: body.id ?? input.requestId,
        finishReason,
        refused: content.length === 0 && finishReason === 'content_filter',
        truncated: finishReason === 'length'
      };
    },

    async createEmbedding(input: GatewayEmbeddingRequest): Promise<GatewayEmbeddingResult> {
      const body = await requestJson<EmbeddingResponse>(
        fetchImpl,
        `${baseUrl}/v1/embeddings`,
        options.apiKey,
        {
          method: 'POST',
          body: JSON.stringify({ model: input.modelId, input: input.input })
        },
        options.timeoutMs
      );
      const embeddings = (body.data ?? []).map((item) =>
        Array.isArray(item.embedding) && item.embedding.every((value) => typeof value === 'number')
          ? item.embedding as number[]
          : []
      );

      if (embeddings.some((embedding) => embedding.length === 0)) {
        throw new Error('AI_GATEWAY_EMBEDDING_RESPONSE_INVALID');
      }

      return {
        gateway: 'wenwen',
        modelId: input.modelId,
        embeddings,
        inputTokens: readNumber(body.usage?.prompt_tokens ?? body.usage?.total_tokens),
        requestId: input.requestId
      };
    },

    async generateImage(input: GatewayImageRequest): Promise<GatewayImageResult> {
      const body = await requestJson<ImageResponse>(
        fetchImpl,
        `${baseUrl}/v1/images/generations`,
        options.apiKey,
        {
          method: 'POST',
          body: JSON.stringify({
            model: input.modelId,
            prompt: input.prompt,
            ...(input.size ? { size: input.size } : {})
          })
        },
        options.timeoutMs
      );
      const urls = (body.data ?? [])
        .map((item) => item.url)
        .filter((url): url is string => typeof url === 'string' && url.length > 0);

      return {
        gateway: 'wenwen',
        modelId: input.modelId,
        urls,
        imageCount: urls.length,
        requestId: input.requestId
      };
    }
  };
}
