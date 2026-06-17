"use client";

import { Modal } from "@/components/ui/Modal";
import type { CommandDef } from "@/lib/utils/commands";
import { useCommandConsole } from "./CommandConsoleContext";

export function CommandHelpModal({ commands }: { commands: CommandDef[] }) {
  const { helpOpen, closeHelp } = useCommandConsole();

  return (
    <Modal open={helpOpen} onClose={closeHelp} title="COMMAND REFERENCE" className="max-w-[520px]">
      <div className="flex flex-col">
        {commands.map((c) => (
          <div key={c.cmd} className="datarow">
            <span className="mono" style={{ color: "var(--gold)", fontSize: 12, fontWeight: 700 }}>
              {c.cmd}
            </span>
            <span className="mono" style={{ color: "var(--muted)", fontSize: 11.5 }}>
              {c.desc.toUpperCase()}
            </span>
          </div>
        ))}
        <p className="mono mt-3.5" style={{ fontSize: 10.5, color: "var(--dim)", lineHeight: 1.7 }}>
          PRESS / TO FOCUS THE COMMAND LINE · ENTER TO RUN · FUNCTION KEYS JUMP DIRECTLY
        </p>
      </div>
    </Modal>
  );
}
