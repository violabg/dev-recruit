import { Fact, FactStrip } from "@/components/detail-blocks";
import { Briefcase, Clock, GraduationCap, ListChecks } from "lucide-react";
import { getQuizById } from "@/lib/data/quizzes";

type Props = {
  params: Promise<{ id: string }>;
};

/** Facts of the quiz: position, level, time limit, questions by type. */
export async function QuizSettingsContent({ params }: Props) {
  const { id } = await params;
  const quiz = await getQuizById(id);

  if (!quiz) {
    return null;
  }

  const position = quiz.position;
  const typeCounts = [
    ["multiple_choice", "multiple"],
    ["open_question", "aperte"],
    ["code_snippet", "codice"],
    ["behavioral_scenario", "scenari"],
  ]
    .map(([type, label]) => {
      const count = quiz.questions.filter((q) => q.type === type).length;
      return count > 0 ? `${count} ${label}` : null;
    })
    .filter(Boolean)
    .join(" · ");

  return (
    <FactStrip>
      <Fact icon={Briefcase} label="Posizione">
        {position?.title ?? "—"}
      </Fact>
      <Fact icon={GraduationCap} label="Livello">
        {position?.experienceLevel ?? "—"}
      </Fact>
      <Fact icon={Clock} label="Limite di tempo">
        {quiz.timeLimit ? `${quiz.timeLimit} minuti` : "Nessun limite"}
      </Fact>
      <Fact icon={ListChecks} label="Domande">
        {quiz.questions.length}
        {typeCounts && (
          <span className="block font-normal text-muted-foreground text-xs">
            {typeCounts}
          </span>
        )}
      </Fact>
    </FactStrip>
  );
}
