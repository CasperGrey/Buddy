import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export class OpenAIClient {
  private client: OpenAI | null = null;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.init(apiKey);
    }
  }

  init(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true
    });
  }

  async sendMessage(messages: { role: string; content: string }[], systemPrompt?: string, model: string = 'gpt-4') {
    if (!this.client) {
      throw new Error('OpenAI client not initialized. Please provide an API key.');
    }

    // Convert messages to OpenAI's expected format and add system message if provided
    const messageContent: ChatCompletionMessageParam[] = [
      ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
      ...messages.map(msg => {
        if (msg.role !== 'user' && msg.role !== 'assistant') {
          throw new Error(`Invalid role: ${msg.role}. Must be 'user' or 'assistant'`);
        }
        return {
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        };
      }),
    ];

    try {
      const response = await this.client.chat.completions.create({
        model,
        messages: messageContent,
        temperature: 0.7,
        max_tokens: 4096,
        store: true,
      });

      return {
        role: 'assistant',
        content: response.choices[0].message.content || '',
      };
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      throw error;
    }
  }
}

export const openaiClient = new OpenAIClient();
