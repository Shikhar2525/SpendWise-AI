import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function getFinancialInsights(data: any, preferredCurrency: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the following financial data and provide insights on overspending, saving suggestions, and future balance predictions. 
      The user's preferred currency is ${preferredCurrency}. Please ensure all monetary values in your insights are expressed in or relative to this currency.
      Return the response in a structured JSON format.
      
      Data: ${JSON.stringify(data)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overspending: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of categories or behaviors indicating overspending"
            },
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Actionable suggestions to save money"
            },
            prediction: {
              type: Type.STRING,
              description: "A short prediction of the future balance based on current trends"
            }
          },
          required: ["overspending", "suggestions", "prediction"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error('Gemini error:', error);
    return null;
  }
}

export async function chatWithFinanceAI(message: string, preferredCurrency: string, data: any, history: { role: 'user' | 'model', content: string }[]) {
  try {
    // Convert history to the format expected by the SDK
    const formattedHistory = history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...formattedHistory,
        { role: 'user', parts: [{ text: message }] }
      ],
      config: {
        systemInstruction: `You are SpendWise AI, a helpful financial advisor. You help users manage their expenses, plan budgets, and save money. 
        The user's preferred currency is ${preferredCurrency}. Always use this currency for your responses unless asked otherwise.
        Be concise, professional, and encouraging.
        
        Current Financial Data:
        ${JSON.stringify(data)}
        
        Use this data to answer specific questions about the user's finances. If they ask about their spending, budgets, or goals, refer to this data.`
      }
    });

    return response.text || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error('Chat error:', error);
    return "I'm sorry, I'm having trouble connecting to my brain right now. Please try again later.";
  }
}

export async function suggestCategory(description: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Based on this expense description: "${description}", suggest the most appropriate category from this list: Housing, Food, Transport, Entertainment, Utilities, Health, Shopping, Other. Return ONLY the category name.`,
      config: {
        temperature: 0.1,
      }
    });

    const category = response.text?.trim() || 'Other';
    return category;
  } catch (error) {
    console.error('Category suggestion error:', error);
    return 'Other';
  }
}
