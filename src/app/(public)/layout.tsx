import { TopBar } from "@/components/terminal/TopBar";
import { CommandBar } from "@/components/terminal/CommandBar";
import { StatusBar } from "@/components/terminal/StatusBar";
import { MatchTickerTapeLazy as MatchTickerTape } from "@/components/terminal/MatchTickerTapeLazy";
import { CommandHelpModal } from "@/components/terminal/CommandHelpModal";
import { CommandConsoleProvider } from "@/components/terminal/CommandConsoleContext";
import { PublicTabBar } from "@/components/terminal/PublicTabBar";
import { PUBLIC_COMMANDS, PUBLIC_FKEYS } from "@/lib/utils/commands";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <CommandConsoleProvider>
      <div className="flex h-screen flex-col" style={{ background: "var(--bg)" }}>
        <TopBar homeHref="/" showSignOut={false} />
        <CommandBar commands={PUBLIC_COMMANDS} />
        <MatchTickerTape />
        <PublicTabBar />
        <div className="flex-1 overflow-auto">{children}</div>
        <StatusBar fkeys={PUBLIC_FKEYS} />
      </div>
      <CommandHelpModal commands={PUBLIC_COMMANDS} />
    </CommandConsoleProvider>
  );
}
