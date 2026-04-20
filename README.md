# 🛡️ SpendWise AI

**Smart Monthly Expense Planner & Financial Intelligence Platform**

SpendWise AI is a comprehensive full-stack application designed to help users track expenses, manage budgets, and achieve financial goals through an intuitive, AI-enhanced interface. Developed using modern web technologies, it provides real-time insights and automated financial planning.

---

## 🚀 Key Features

-   **🧠 AI-Powered Insights**: Leveraging Google Gemini AI to auto-suggest expense categories and provide intelligent financial nudges.
-   **📅 Monthly Planning**: Plan your finances based on custom monthly periods with full history tracking.
-   **💹 Expense Management**: Detailed expense logging with smart classification and multi-currency support.
-   **🧾 Bills & Dues Tracking**: Never miss a payment with a dedicated dues tracker, recurring bill management, and status updates.
-   **🎯 Savings Goals**: Define, track, and visualize your progress toward long-term financial milestones.
-   **📊 Visual Analytics**: Real-time charts and progress bars (powered by Recharts) to understand spending patterns and budget leaks.
-   **🔔 Intelligence Notifications**: A central hub for upcoming dues, budget alerts, and financial achievements.
-   **🔐 Secure Authentication**: Integrated with Firebase Auth for secure user data isolation and sync across devices.
-   **🌗 Dark Mode & Polish**: A sleek, high-contrast UI with full support for dark mode and smooth animations (Framer Motion).

---

## 🛠️ Tech Stack

-   **Frontend**: React (Vite), TypeScript, Tailwind CSS (v4)
-   **UI Components**: shadcn/ui, Lucide Icons
-   **Backend/Database**: Firebase Firestore, Firebase Authentication
-   **AI Engine**: Google Gemini API (@google/genai)
-   **Animations**: Framer Motion
-   **Data Viz**: Recharts
-   **Utils**: date-fns, sonner, lodash

---

## 📁 Project Structure

```text
src/
├── components/          # Reusable UI components (Table, Dialog, Pagination, etc.)
│   ├── ui/              # shadcn base components
│   └── ...              # Feature-specific views (Expenses, Dues, Savings)
├── contexts/            # React Contexts (Auth, Currency, Financial Period)
├── lib/                 # Shared utilities and Firebase configuration
├── services/            # API services (Gemini AI interaction)
├── types.ts             # Global TypeScript interface definitions
└── App.tsx              # Main application routing and shell
```

---

## 🛠️ Getting Started

### 1. Prerequisites
- Node.js (v18+)
- Firebase Project

### 2. Environment Setup
Create a `.env` file in the root and add your configuration (see `.env.example`):
```env
# Required for AI features
GEMINI_API_KEY=your_key_here

# Firebase configuration is typically handled via firebase-applet-config.json in this environment
```

### 3. Installation
```bash
npm install
```

### 4. Run Development Server
```bash
npm run dev
```

---

## 👨‍💻 Developer

**Shikhar Mandloi**  
*Lead Developer & Product Designer*

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
