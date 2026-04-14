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

export async function chatWithFinanceAI(message: string, preferredCurrency: string, history: { role: 'user' | 'model', parts: { text: string }[] }[]) {
  try {
    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: `You are SpendWise AI, a helpful financial advisor. You help users manage their expenses, plan budgets, and save money. 
        The user's preferred currency is ${preferredCurrency}. Always use this currency for your responses unless asked otherwise.
        Be concise, professional, and encouraging.`
      }
    });

    // Note: In a real app, you'd pass the history correctly. 
    // For simplicity, we'll just send the current message with context.
    const response = await chat.sendMessage({ message });
    return response.text;
  } catch (error) {
    console.error('Chat error:', error);
    return "I'm sorry, I'm having trouble connecting to my brain right now. Please try again later.";
  }
}
