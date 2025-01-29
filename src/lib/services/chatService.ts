import { anthropicClient } from '../api/anthropic';
import { deepseekClient } from '../api/deepseek';
import { openaiClient } from '../api/openai';
import { RootState } from '../store/store';
import { OpenAIModel } from '../store/slices/settingsSlice';

const ANTHROPIC_MODELS = ['claude-3-opus-20240229'];
const OPENAI_MODELS = ['gpt-4', 'gpt-4-turbo-preview', 'gpt-3.5-turbo'];
const DEEPSEEK_MODELS = [
  'deepseek-chat-7b',
  'deepseek-chat-67b',
  'deepseek-coder-6.7b',
  'deepseek-coder-33b',
];

export class ChatService {
  async initializeClients(state: RootState) {
    const { anthropicKey, deepseekKey, openAIKey } = state.settings.apiKeys;
    
    if (anthropicKey) {
      anthropicClient.init(anthropicKey);
    }
    if (deepseekKey) {
      deepseekClient.init(deepseekKey);
    }
    if (openAIKey) {
      openaiClient.init(openAIKey);
    }
  }

  async sendMessage(
    messages: { role: string; content: string }[],
    model: string,
    systemPrompt?: string
  ) {
    if (ANTHROPIC_MODELS.includes(model)) {
      return anthropicClient.sendMessage(messages, systemPrompt);
    } else if (DEEPSEEK_MODELS.includes(model)) {
      return deepseekClient.sendMessage(messages, systemPrompt);
    } else if (OPENAI_MODELS.includes(model)) {
      return openaiClient.sendMessage(messages, systemPrompt, model as OpenAIModel);
    } else {
      throw new Error(`Unsupported model: ${model}`);
    }
  }

  isModelSupported(model: string): boolean {
    return [...ANTHROPIC_MODELS, ...DEEPSEEK_MODELS, ...OPENAI_MODELS].includes(model);
  }

  getRequiredApiKey(model: string): 'anthropicKey' | 'deepseekKey' | 'openAIKey' {
    if (ANTHROPIC_MODELS.includes(model)) {
      return 'anthropicKey';
    } else if (DEEPSEEK_MODELS.includes(model)) {
      return 'deepseekKey';
    } else if (OPENAI_MODELS.includes(model)) {
      return 'openAIKey';
    }
    throw new Error(`Unsupported model: ${model}`);
  }
}

export const chatService = new ChatService();
