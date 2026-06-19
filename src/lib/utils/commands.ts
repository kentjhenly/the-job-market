export interface CommandDef {
  cmd: string;
  desc: string;
  href?: string;
  action?: "help";
}

export const CANDIDATE_COMMANDS: CommandDef[] = [
  { cmd: "DASH", desc: "Score terminal", href: "/candidate/terminal" },
  { cmd: "PORT", desc: "Portfolio projects", href: "/candidate/portfolio" },
  { cmd: "POST", desc: "Job postings", href: "/candidate/postings" },
  { cmd: "PITCH", desc: "Incoming pitches", href: "/candidate/matches" },
  { cmd: "SET", desc: "Settings & profile", href: "/candidate/settings" },
  { cmd: "HELP", desc: "Command reference", action: "help" },
];

export const CANDIDATE_FKEYS: [string, CommandDef][] = [
  ["F1", CANDIDATE_COMMANDS[0]],
  ["F2", CANDIDATE_COMMANDS[1]],
  ["F3", CANDIDATE_COMMANDS[2]],
  ["F4", CANDIDATE_COMMANDS[3]],
  ["F6", CANDIDATE_COMMANDS[4]],
  ["F7", CANDIDATE_COMMANDS[5]],
];

export const EMPLOYER_COMMANDS: CommandDef[] = [
  { cmd: "DASH", desc: "Market overview", href: "/employer/terminal" },
  { cmd: "FEED", desc: "Ranked candidate feed", href: "/employer/feed" },
  { cmd: "POST", desc: "Job postings", href: "/employer/postings" },
  { cmd: "SENT", desc: "Sent pitches", href: "/employer/matches" },
  { cmd: "HELP", desc: "Command reference", action: "help" },
  { cmd: "SET", desc: "Settings & company", href: "/employer/settings" },
];

export const EMPLOYER_FKEYS: [string, CommandDef][] = [
  ["F1", EMPLOYER_COMMANDS[0]],
  ["F2", EMPLOYER_COMMANDS[1]],
  ["F3", EMPLOYER_COMMANDS[2]],
  ["F4", EMPLOYER_COMMANDS[3]],
  ["F6", EMPLOYER_COMMANDS[4]],
  ["F7", EMPLOYER_COMMANDS[5]],
];

export const PUBLIC_COMMANDS: CommandDef[] = [
  { cmd: "HOME", desc: "Public landing", href: "/" },
  { cmd: "MKT", desc: "Live match feed", href: "/ticker" },
  { cmd: "HELP", desc: "Command reference", action: "help" },
];

export const PUBLIC_FKEYS: [string, CommandDef][] = [
  ["F1", PUBLIC_COMMANDS[0]],
  ["F2", PUBLIC_COMMANDS[1]],
  ["F9", PUBLIC_COMMANDS[2]],
];
