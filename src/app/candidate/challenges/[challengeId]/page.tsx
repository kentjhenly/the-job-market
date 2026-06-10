"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatTimeRemaining } from "@/lib/utils/formatters";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { DataRow } from "@/components/terminal/DataRow";

interface Option {
  id: string;
  text: string;
}

interface Question {
  id: string;
  type: string;
  prompt: string;
  options: Option[] | null;
  weight: number;
  order_index: number;
}

interface Challenge {
  id: string;
  title: string;
  time_limit_sec: number;
  max_score: number;
  vertical: string;
}

export default function ChallengeRunnerPage() {
  const { challengeId } = useParams<{ challengeId: string }>();
  const router = useRouter();

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [started, setStarted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/challenges/${challengeId}`);
      if (res.ok) {
        const { challenge: c, questions: q } = await res.json();
        setChallenge(c as Challenge);
        setTimeLeft(c.time_limit_sec);
        setQuestions(q as Question[]);
      }
      setLoading(false);
    }
    load();
  }, [challengeId]);

  useEffect(() => {
    if (!started || timeLeft <= 0) return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id);
          handleSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [started, timeLeft]);

  function beginChallenge() {
    setStarted(true);
    setStartTime(Date.now());
  }

  function setAnswer(qId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  }

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    setConfirmOpen(false);

    const timeTaken = Math.floor((Date.now() - startTime) / 1000);

    const res = await fetch(`/api/challenges/${challengeId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers, time_taken_sec: timeTaken }),
    });

    if (res.ok) {
      const { resultId } = await res.json();
      router.push(`/candidate/challenges/${challengeId}/results?resultId=${resultId}`);
    } else {
      alert("Submission failed. Please try again.");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="kicker animate-pulse">LOADING CHALLENGE...</span>
      </div>
    );
  }

  if (!challenge) return <p className="mono" style={{ fontSize: 13, color: "var(--down)" }}>Challenge not found.</p>;

  if (!started) {
    return (
      <div className="view-enter max-w-2xl">
        <div className="panel p-8">
          <div className="mb-6">
            <p className="kicker">{challenge.vertical.toUpperCase()}</p>
            <h1 className="mono mt-1" style={{ fontSize: 20, fontWeight: 700, color: "var(--up)" }}>
              {challenge.title.toUpperCase()}
            </h1>
          </div>
          <div className="mb-8">
            <DataRow label="TIME LIMIT" value={formatTimeRemaining(challenge.time_limit_sec)} />
            <DataRow label="QUESTIONS" value={String(questions.length)} />
            <DataRow label="MAX SCORE" value={`${challenge.max_score} PTS`} />
          </div>
          <div className="hr mb-6" />
          <p className="mono mb-4" style={{ fontSize: 11, color: "var(--muted)" }}>
            THE TIMER STARTS WHEN YOU CLICK BEGIN. ENSURE YOU HAVE ENOUGH TIME TO COMPLETE.
          </p>
          <div className="flex gap-3">
            <Button onClick={beginChallenge} size="lg">
              BEGIN CHALLENGE →
            </Button>
            <Button variant="ghost" size="lg" onClick={() => router.push("/candidate/challenges")}>
              BACK
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const answered = Object.keys(answers).length;
  const total = questions.length;

  return (
    <div className="max-w-3xl">
      {/* Sticky header */}
      <div className="panel sticky top-0 z-10 mb-6 flex items-center justify-between px-4 py-3">
        <span className="kicker">{challenge.title.toUpperCase()}</span>
        <div className="flex items-center gap-6">
          <span className="mono tnum" style={{ fontSize: 11, color: "var(--muted)" }}>
            {answered}/{total} ANSWERED
          </span>
          <span
            className="mono tnum"
            style={{ fontSize: 14, fontWeight: 700, color: timeLeft < 300 ? "var(--down)" : "var(--up)" }}
          >
            {formatTimeRemaining(timeLeft)}
          </span>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((q, idx) => (
          <div key={q.id} className="panel p-6">
            <div className="mb-3 flex items-center gap-3">
              <p className="kicker">Q{idx + 1}</p>
              <Badge variant="muted">{q.type === "coding" ? "CODE" : "MULTIPLE CHOICE"}</Badge>
              {q.weight > 1 && (
                <span className="mono" style={{ fontSize: 10, color: "var(--gold)" }}>
                  ×{q.weight} WEIGHT
                </span>
              )}
            </div>
            <p className="mb-4" style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6 }}>
              {q.prompt}
            </p>

            {q.type === "multiple_choice" && q.options && (
              <div className="space-y-2">
                {q.options.map((opt) => {
                  const selected = answers[q.id] === opt.id;
                  return (
                    <label
                      key={opt.id}
                      className="flex cursor-pointer items-center gap-3 rounded p-3 transition-colors"
                      style={{
                        border: `1px solid ${selected ? "var(--up)" : "var(--border)"}`,
                        background: selected ? "var(--up-dim)" : "transparent",
                        color: selected ? "var(--up)" : "var(--muted)",
                      }}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        value={opt.id}
                        checked={selected}
                        onChange={() => setAnswer(q.id, opt.id)}
                        className="sr-only"
                      />
                      <span className="mono shrink-0" style={{ fontSize: 11, width: 16 }}>
                        {opt.id.toUpperCase()}.
                      </span>
                      <span className="mono" style={{ fontSize: 12 }}>
                        {opt.text}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            {q.type === "coding" && (
              <textarea
                value={answers[q.id] ?? ""}
                onChange={(e) => setAnswer(q.id, e.target.value)}
                placeholder="// Write your answer here..."
                rows={8}
                className="field"
                style={{ color: "var(--up)" }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Submit */}
      <div className="mt-6 flex justify-end">
        <Button onClick={() => setConfirmOpen(true)} loading={submitting} size="lg">
          SUBMIT CHALLENGE
        </Button>
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="CONFIRM SUBMISSION">
        <p className="mono mb-4" style={{ fontSize: 12, color: "var(--muted)" }}>
          YOU HAVE ANSWERED {answered} OF {total} QUESTIONS.
          {answered < total && <span style={{ color: "var(--down)" }}> {total - answered} UNANSWERED.</span>}
        </p>
        <p className="mono mb-6" style={{ fontSize: 12, color: "var(--text)" }}>
          SUBMIT NOW?
        </p>
        <div className="flex gap-3">
          <Button onClick={handleSubmit} loading={submitting}>
            SUBMIT
          </Button>
          <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
            CANCEL
          </Button>
        </div>
      </Modal>
    </div>
  );
}
