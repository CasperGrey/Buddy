import Anthropic from '@anthropic-ai/sdk';

export class AnthropicClient {
  private client: Anthropic | null = null;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.init(apiKey);
    }
  }

  init(apiKey: string) {
    this.client = new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true
    });
  }

  async sendMessage(messages: { role: string; content: string }[], systemPrompt?: string) {
    if (!this.client) {
      throw new Error('Anthropic client not initialized. Please provide an API key.');
    }

    // Convert messages to Anthropic's expected format
    const messageContent = messages.map(msg => {
      if (msg.role !== 'user' && msg.role !== 'assistant') {
        throw new Error(`Invalid role: ${msg.role}. Must be 'user' or 'assistant'`);
      }
      return {
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      };
    });

    try {
      const response = await this.client.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: 4096,
        messages: messageContent,
        system: systemPrompt,
      });

      // Handle different content block types
      const content = response.content[0];
      if ('text' in content) {
        return {
          role: 'assistant',
          content: content.text,
        };
      } else {
        throw new Error('Unexpected response format from Anthropic API');
      }
    } catch (error) {
      console.error('Error calling Anthropic API:', error);
      throw error;
    }
  }
}

export const anthropicClient = new AnthropicClient();
