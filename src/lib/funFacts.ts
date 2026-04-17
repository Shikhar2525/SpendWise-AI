export const FINANCIAL_FUN_FACTS = [
  "The world's first credit card was issued in 1950 by Diners Club.",
  "Warren Buffett bought his first stock at the age of 11.",
  "The word 'bank' comes from the Italian word 'banco', which means 'bench'.",
  "A penny costs more than one cent to manufacture.",
  "The first paper money was created in China over 1,000 years ago.",
  "The S&P 500 has historically returned an average of about 10% annually.",
  "Saving just $5 a day can grow to over $100,000 in 20 years with 7% interest.",
  "Compound interest was called the 'eighth wonder of the world' by Albert Einstein.",
  "The life expectancy of a $5 bill is only about 5.5 years.",
  "There are more than 1.6 million ATMs in the world today."
];

export function getFunFactsForSession(): string[] {
  // Return 4-5 stable random facts for the session
  const seed = sessionStorage.getItem('fun_fact_seed') || Math.random().toString();
  sessionStorage.setItem('fun_fact_seed', seed);
  
  const rng = (s: string) => {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
        hash = ((hash << 5) - hash) + s.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash) / 2147483647;
  };

  const shuffled = [...FINANCIAL_FUN_FACTS].sort(() => rng(seed) - 0.5);
  return shuffled.slice(0, 5);
}

export function getCurrentFunFact(): string {
  const sessionFacts = getFunFactsForSession();
  const reloadCount = parseInt(sessionStorage.getItem('fun_fact_reload_count') || '0');
  sessionStorage.setItem('fun_fact_reload_count', (reloadCount + 1).toString());
  
  return sessionFacts[reloadCount % sessionFacts.length];
}
