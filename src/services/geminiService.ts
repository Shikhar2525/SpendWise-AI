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

export async function chatWithFinanceAI(
  message: string, 
  preferredCurrency: string, 
  data: any, 
  history: { role: 'user' | 'model', content: string }[],
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
        systemInstruction: `You are SpendWise AI, a helpful financial advisor. 
        User Preferred Currency: ${preferredCurrency}
        Current UTC Time: ${new Date().toISOString()}
        
        Capabilities:
        1. Answer questions about the user's finances using the provided data.
        2. Add new entries (Expenses, Salaries, Savings, Goals, Bills/Dues, Budgets).
        3. Edit existing entries.
        4. Provide advice on saving and budgeting.
        
        Voice Commands:
        - You may receive audio input. Listen carefully to the user's intent.
        - Transcribe the intent and perform the requested financial action.
        
        Guidelines:
        - Be concise, professional, and encouraging.
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
