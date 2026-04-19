import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const addEntryTool: FunctionDeclaration = {
  name: "addFinancialEntry",
  description: "Add a new financial entry to the user's records (Expense, Salary/Income, Saving, Goal, Due/Bill, or Budget).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      category: {
        type: Type.STRING,
        description: "The category of the entry (e.g., Food, Housing, Transport).",
      },
      amount: {
        type: Type.NUMBER,
        description: "The monetary amount.",
      },
      date: {
        type: Type.STRING,
        description: "The date of the entry (YYYY-MM-DD).",
      },
      description: {
        type: Type.STRING,
        description: "A brief description.",
      },
      type: {
        type: Type.STRING,
        enum: ["expense", "income", "saving", "goal", "due", "budget"],
        description: "The type of financial entry.",
      },
      // Specific fields for different types
      currency: { type: Type.STRING },
      isRecurring: { type: Type.BOOLEAN },
      dueDate: { type: Type.STRING, description: "Required for 'due' type." },
      deadline: { type: Type.STRING, description: "Required for 'goal' type." },
      targetAmount: { type: Type.NUMBER, description: "Required for 'goal' type." },
      savingType: { 
        type: Type.STRING, 
        enum: ['RD', 'FD', 'Mutual Fund', 'Stocks', 'Crypto', 'Gold', 'Provident Fund', 'Other'],
        description: "Required for 'saving' type." 
      },
      month: { type: Type.STRING, description: "Required for 'budget' type (YYYY-MM)." }
    },
    required: ["type", "amount", "description"],
  },
};

const editEntryTool: FunctionDeclaration = {
  name: "editFinancialEntry",
  description: "Edit an existing financial entry. Use this when the user wants to update or correct a specific entry found in their history.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING, description: "The ID of the entry to edit." },
      collection: { 
        type: Type.STRING, 
        enum: ["expenses", "salaries", "savings", "goals", "dues", "budgets"],
        description: "The collection name where the entry is stored." 
      },
      updates: {
        type: Type.OBJECT,
        description: "The fields to update.",
        properties: {
          amount: { type: Type.NUMBER },
          category: { type: Type.STRING },
          description: { type: Type.STRING },
          date: { type: Type.STRING },
          dueDate: { type: Type.STRING },
          deadline: { type: Type.STRING },
          targetAmount: { type: Type.NUMBER },
          currentAmount: { type: Type.NUMBER },
          isPaid: { type: Type.BOOLEAN }
        }
      }
    },
    required: ["id", "collection", "updates"],
  },
};

export async function getFinancialInsights(data: any, preferredCurrency: string, liveRates?: Record<string, number>) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the following financial data and provide insights on overspending, saving suggestions, and future balance predictions. 
      The user's preferred currency is ${preferredCurrency}. Please ensure all monetary values in your insights are expressed in or relative to this currency.
      ${liveRates ? `Real-time Exchange Rates (Base USD): ${JSON.stringify(liveRates)}` : ''}
      Return the response in a structured JSON format.
      
      Data: ${JSON.stringify(data)}`,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2, // Increased precision
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

export async function chatWithFinanceAI(
  message: string, 
  preferredCurrency: string, 
  data: any, 
  history: { role: 'user' | 'model', content: string }[],
  liveRates?: Record<string, number>,
  audioData?: { data: string, mimeType: string }
) {
  try {
    const formattedHistory = history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));

    const userParts: any[] = [{ text: message || "Please process my voice command." }];
    if (audioData) {
      userParts.push({
        inlineData: audioData
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...formattedHistory,
        { role: 'user', parts: userParts }
      ],
      config: {
        tools: [{ functionDeclarations: [addEntryTool, editEntryTool] }],
        temperature: 0.3, // Lower temperature for more precise financial advice
        systemInstruction: `You are SpendWise AI, a highly precise financial advisor. 
        User Preferred Currency: ${preferredCurrency}
        Current UTC Time: ${new Date().toISOString()}
        ${liveRates ? `Real-time Exchange Rates (Base USD): ${JSON.stringify(liveRates)}` : ''}
        
        Capabilities:
        1. Answer questions about the user's finances using ONLY the provided data.
        2. Add new entries (Expenses, Salaries, Savings, Goals, Bills/Dues, Budgets).
        3. Edit existing entries.
        4. Provide advice on saving and budgeting based on real trends.
        
        Voice Commands & Transcription:
        - You may receive audio input. Listen carefully to the user's intent.
        - IMPORTANT: If audio input is provided, you MUST begin your response with the following format:
          [TRANSCRIPTION: <your accurate transcription of the user's speech>]
          After the transcription tag, proceed with your actual response.
        - perform the requested financial action based on the voice intent.
        
        Guidelines:
        - Be concise, professional, and data-driven. 
        - When performing currency conversions, use the provided Real-time Exchange Rates.
        - If the user's question is not related to their provided finances or general financial best practices, politely steer them back to their budget.
        - NEVER hallucinate data. If a transaction isn't in the data, say you don't see it.
        - If the user provides incomplete info for adding/editing an entry, ASK for the missing fields clearly. 
        - DO NOT call the tool until you have the necessary information.
        
        Current Financial Data for reference:
        ${JSON.stringify(data)}`
      }
    });

    return response;
  } catch (error) {
    console.error('Chat error:', error);
    throw error;
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
