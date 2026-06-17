export interface FaqEntry {
  q: string;
  a: string;
}

export const CANDIDATE_FAQ: FaqEntry[] = [
  {
    q: "How is my composite score calculated?",
    a: "Your score blends portfolio breadth, skill coverage, portfolio completeness, employer feedback ratings, reputation, response rate, and profile completeness. It recalculates automatically whenever you add, edit, or remove a portfolio project.",
  },
  {
    q: "How do employers find me?",
    a: "Employers browse a ranked feed sorted by composite score, highest first. A broader portfolio with more tagged skills and complete projects raises your score and your position in that feed.",
  },
  {
    q: "What happens when I accept a pitch?",
    a: "The match moves to accepted and an in-app chat opens with the employer. Accepting (and sending) pitches is always free, no credits required.",
  },
  {
    q: "What is the anti-ghosting policy?",
    a: "A pending pitch expires after 72 hours if you don't accept or decline it. Once a chat is accepted, 72 hours of silence from either side auto-closes the match and counts against that party's reputation score.",
  },
  {
    q: "Where does the salary data come from?",
    a: "The salary curve and percentile on your dashboard blend real market benchmarks with real accepted-match outcomes from this platform, filtered to your role, vertical, and experience where possible.",
  },
  {
    q: "Can I edit my portfolio after publishing?",
    a: "Yes. Add, edit, or remove projects anytime from the Portfolio page. Your composite score and percentile rank update automatically after each change.",
  },
];

export const EMPLOYER_FAQ: FaqEntry[] = [
  {
    q: "How does the candidate feed ranking work?",
    a: "Candidates are sorted by composite score, a weighted blend of portfolio breadth, skill coverage, completeness, reputation, response rate, and profile completeness. The feed updates live as candidates improve their portfolios.",
  },
  {
    q: "Do I need a subscription to post jobs?",
    a: "Your first 3 job postings are free regardless of subscription status. From the 4th posting onward, an active subscription (Starter or Pro) is required for unlimited postings.",
  },
  {
    q: "What requires an active subscription?",
    a: "Browsing the ranked candidate feed and sending pitches both require an active subscription. Job postings beyond your first 3 also require one. Sending and accepting pitches cost candidates nothing either way.",
  },
  {
    q: "What is the anti-ghosting policy?",
    a: "A pending pitch expires after 72 hours if the candidate doesn't respond. Once a chat is accepted, 72 hours of silence from either side auto-closes the match and counts against that party's reputation score.",
  },
  {
    q: "How is the market data on a job posting sourced?",
    a: "The market data panel blends real salary benchmarks with real accepted-match outcomes from this platform, cascading from the specific role to your industry to the overall market depending on how much data is available.",
  },
  {
    q: "Why do I need to verify my work email?",
    a: "Email verification confirms your account is tied to a real company before you can access the candidate feed or send pitches, keeping the feed free of fake employer accounts.",
  },
];
