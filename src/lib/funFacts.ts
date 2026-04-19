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
  "There are more than 1.6 million ATMs in the world today.",
  "The largest banknote ever printed was a 100 trillion dollar bill in Zimbabwe.",
  "The most expensive coin ever sold was the 1794 Flowing Hair Silver Dollar for $10 million.",
  "Roughly 90% of the world's currency only exists on computers.",
  "The US Secret Service was originally created to fight currency counterfeiting.",
  "Cattle are likely the oldest form of money, used as early as 9000 BC.",
  "The Romans used salt as a form of currency—hence the word 'salary'.",
  "The first ATM was installed in London in 1967.",
  "A gold bar is fairly soft and can be scratched with a fingernail.",
  "The average lifespan of a $100 bill is 15 years.",
  "Money is actually not paper; it's a blend of 75% cotton and 25% linen.",
  "The game of Monopoly was originally created to teach about the dangers of wealth inequality.",
  "If you spent $1 every second, it would take you 31,710 years to spend $1 trillion."
];

export function getFunFactsForSession(): string[] {
  // Use a rotating seed based on the current hour to change facts more frequently
  const currentHour = new Date().getHours();
  const seed = `fun_fact_seed_${currentHour}`;
  
  const rng = (s: string) => {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
        hash = ((hash << 5) - hash) + s.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash) / 2147483647;
  };

  const seedValue = rng(seed);
  const shuffled = [...FINANCIAL_FUN_FACTS].sort((a, b) => rng(a + seed) - 0.5);
  return shuffled;
}

export function getCurrentFunFact(): string {
  const sessionFacts = getFunFactsForSession();
  // Use a shorter rotation interval (every 10 minutes)
  const tenMinuteBlock = Math.floor(new Date().getMinutes() / 10);
  const index = (new Date().getHours() + tenMinuteBlock) % sessionFacts.length;
  
  return sessionFacts[index];
}
