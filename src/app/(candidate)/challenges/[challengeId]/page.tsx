"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatTimeRemaining } from "@/lib/utils/formatters";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

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
  const supabase = getSupabaseBrowserClient();

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
      const [{ data: c }, { data: q }] = await Promise.all([
        supabase.from("challenges").select("*").eq("id", challengeId).single(),
        supabase
          .from("questions")
          .select("id, type, prompt, options, weight, order_index")
          .eq("challenge_id", challengeId)
          .order("order_index"),
      ]);

      if (c) {
        setChallenge(c as Challenge);
        setTimeLeft(c.time_limit_sec);
      }
      if (q) setQuestions(q as Question[]);
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
      router.push(`/challenges/${challengeId}/results?resultId=${resultId}`);
    } else {
      alert("Submission failed. Please try again.");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="font-mono text-muted text-xs animate-pulse">LOADING CHALLENGE...</span>
      </div>
    );
  }

  if (!challenge) return <p className="font-mono text-danger">Challenge not found.</p>;

  if (!started) {
    return (
      <div className="max-w-2xl">
        <div className="border border-border bg-surface p-8">
          <div className="mb-6">
            <p className="font-mono text-muted text-xs tracking-widest">{challenge.vertical.toUpperCase()}</p>
            <h1 className="font-mono text-green text-xl mt-1">{challenge.title.toUpperCase()}</h1>
          </div>
          <div className="space-y-2 mb-8">
            <p className="font-mono text-xs text-muted">
              TIME LIMIT: <span className="text-white">{formatTimeRemaining(challenge.time_limit_sec)}</span>
            </p>
            <p className="font-mono text-xs text-muted">
              QUESTIONS: <span className="text-white">{questions.length}</span>
            </p>
            <p className="font-mono text-xs text-muted">
              MAX SCORE: <span className="text-white">{challenge.max_score} PTS</span>
            </p>
          </div>
          <div className="border-t border-border pt-6">
            <p className="text-muted text-xs font-mono mb-4">
              THE TIMER STARTS WHEN YOU CLICK BEGIN. ENSURE YOU HAVE ENOUGH TIME TO COMPLETE.
            </p>
            <Button onClick={beginChallenge} size="lg">
              BEGIN CHALLENGE →
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
      <div className="sticky top-0 z-10 bg-surface border border-border px-4 py-3 flex items-center justify-between mb-6">
        <span className="font-mono text-xs text-muted tracking-widest">{challenge.title.toUpperCase()}</span>
        <div className="flex items-center gap-6">
          <span className="font-mono text-xs text-muted">
            {answered}/{total} ANSWERED
          </span>
          <span className={`font-mono text-sm tabular-nums ${timeLeft < 300 ? "text-danger" : "text-green"}`}>
            {formatTimeRemaining(timeLeft)}
          </span>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {questions.map((q, idx) => (
          <div key={q.id} className="border border-border bg-surface p-6">
            <p className="font-mono text-muted text-xs mb-3 tracking-widest">Q{idx + 1}</p>
            <p className="text-white text-sm mb-4 leading-relaxed">{q.prompt}</p>

            {q.type === "multiple_choice" && q.options && (
              <div className="space-y-2">
                {q.options.map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-center gap-3 p-3 border cursor-pointer transition-colors ${
                      answers[q.id] === opt.id
                        ? "border-green bg-green/5 text-green"
                        : "border-border hover:border-muted text-muted"
                    }`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={opt.id}
                      checked={answers[q.id] === opt.id}
                      onChange={() => setAnswer(q.id, opt.id)}
                      className="sr-only"
                    />
                    <span className="font-mono text-xs w-4 shrink-0">
                      {opt.id.toUpperCase()}.
                    </span>
                    <span className="font-mono text-xs">{opt.text}</span>
                  </label>
                ))}
              </div>
            )}

            {q.type === "coding" && (
              <textarea
                value={answers[q.id] ?? ""}
                onChange={(e) => setAnswer(q.id, e.target.value)}
                placeholder="// Write your answer here..."
                rows={8}
                className="w-full bg-bg border border-border text-green font-mono text-xs p-3 resize-y focus:outline-none focus:border-green"
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
        <p className="font-mono text-xs text-muted mb-4">
          YOU HAVE ANSWERED {answered} OF {total} QUESTIONS.
          {answered < total && (
            <span className="text-danger"> {total - answered} UNANSWERED.</span>
          )}
        </p>
        <p className="font-mono text-xs text-white mb-6">SUBMIT NOW?</p>
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
