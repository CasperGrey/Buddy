export class DeepseekClient {
  private apiKey: string | null = null;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.init(apiKey);
    }
  }

  init(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendMessage(messages: { role: string; content: string }[], systemPrompt?: string) {
    if (!this.apiKey) {
      throw new Error('Deepseek client not initialized. Please provide an API key.');
    }

    try {
      // TODO: Implement actual Deepseek API call here once API documentation is available
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: messages,
          system: systemPrompt,
        }),
      });

      if (!response.ok) {
        throw new Error(`Deepseek API error: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        role: 'assistant',
        content: data.choices[0].message.content,
      };
    } catch (error) {
      console.error('Error calling Deepseek API:', error);
      throw error;
    }
  }
}

export const deepseekClient = new DeepseekClient();
