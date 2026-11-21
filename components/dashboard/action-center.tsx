import { ApplicationStageBadge } from "@/components/applications/application-stage-badge";
import {
  QueueList,
  QueueRow,
  QueueSummary,
  StationDivider,
  StationLine,
  StationStop,
  type QueueSummaryItem,
} from "@/components/flow";
import type { ActionCenterData } from "@/lib/data/applications";
import { formatDate } from "@/lib/utils";
import { STALE_APPLICATION_DAYS } from "@/lib/utils/application-stage";
import { formatInterviewDateTime } from "@/lib/utils/interview-calendar";
import { SETUP_STEP_LABEL, SETUP_STEP_TAB } from "@/lib/utils/position-setup";

type StaleApplications = ActionCenterData["openApplications"];

/**
 * The home queues in the order of the selection: position setup, tests,
 * interview kits, scorecards; stale applications sit apart after the flow.
 * Titles are shared by the summary, the stops and the skeleton.
 */
export const QUEUE_TITLES = {
  setup: "Posizioni con setup incompleto",
  tests: "Test da valutare",
  kits: "Colloqui senza kit pronto",
  scorecards: "Schede da compilare",
  stale: `Candidature ferme da più di ${STALE_APPLICATION_DAYS} giorni`,
} as const;

/** Short labels of the summary in the header band. */
const SUMMARY_LABELS: Record<keyof typeof QUEUE_TITLES, string> = {
  setup: "Posizioni da completare",
  tests: "Test da valutare",
  kits: "Kit colloquio",
  scorecards: "Schede da compilare",
  stale: "Candidature ferme",
};

/** Anchor of each stop: the summary links to it. */
const QUEUE_ANCHOR: Record<keyof typeof QUEUE_TITLES, string> = {
  setup: "coda-posizioni",
  tests: "coda-test",
  kits: "coda-kit",
  scorecards: "coda-schede",
  stale: "coda-ferme",
};

export const QUEUE_KEYS = Object.keys(QUEUE_TITLES) as (keyof typeof QUEUE_TITLES)[];

function queueCounts(
  data: ActionCenterData,
  stale: StaleApplications,
): Record<keyof typeof QUEUE_TITLES, number> {
  return {
    setup: data.positionsWithIncompleteSetup.length,
    tests: data.assessmentsToEvaluate.length,
    kits: data.interviewsWithoutKit.length,
    scorecards: data.feedbackToFill.length,
    stale: stale.length,
  };
}

/** Counts of the queues, for the header band. */
export function ActionSummary({
  data,
  staleApplications,
}: {
  data: ActionCenterData;
  staleApplications: StaleApplications;
}) {
  const counts = queueCounts(data, staleApplications);
  const items: QueueSummaryItem[] = QUEUE_KEYS.map((key) => ({
    key,
    label: SUMMARY_LABELS[key],
    count: counts[key],
    href: `#${QUEUE_ANCHOR[key]}`,
    tone: key === "stale" ? "warn" : "flow",
  }));
  return <QueueSummary items={items} />;
}

export { SUMMARY_LABELS as QUEUE_SUMMARY_LABELS };

/**
 * Home "Le mie azioni": what waits for an action, one stop per queue. The
 * data arrives already filtered by the page; staleness is decided by the
 * page as well. Every row leads to the page where the action is done.
 */
export function ActionCenter({
  data,
  staleApplications,
}: {
  data: ActionCenterData;
  staleApplications: StaleApplications;
}) {
  const counts = queueCounts(data, staleApplications);
  const tone = (key: keyof typeof QUEUE_TITLES) =>
    counts[key] === 0 ? "clear" : key === "stale" ? "warn" : "active";

  return (
    <StationLine>
      <StationStop
        id={QUEUE_ANCHOR.setup}
        title={QUEUE_TITLES.setup}
        count={counts.setup}
        tone={tone("setup")}
        clearText="Tutte pronte"
      >
        <QueueList>
          {data.positionsWithIncompleteSetup.map((item) => (
            <QueueRow
              key={item.positionId}
              href={`/dashboard/positions/${item.positionId}?tab=${SETUP_STEP_TAB[item.missing[0]]}`}
              title={item.title}
              detail={`Manca: ${item.missing
                .map((part) => SETUP_STEP_LABEL[part])
                .join(", ")}`}
              verb="Completa"
            />
          ))}
        </QueueList>
      </StationStop>

      <StationStop
        id={QUEUE_ANCHOR.tests}
        title={QUEUE_TITLES.tests}
        count={counts.tests}
        tone={tone("tests")}
        clearText="Nessuno"
      >
        <QueueList>
          {data.assessmentsToEvaluate.map((item) => (
            <QueueRow
              key={item.assessmentId}
              href={`/dashboard/assessments/${item.assessmentId}`}
              title={item.candidateName}
              context={item.positionTitle}
              detail={item.quizTitle}
              verb="Valuta"
            />
          ))}
        </QueueList>
      </StationStop>

      <StationStop
        id={QUEUE_ANCHOR.kits}
        title={QUEUE_TITLES.kits}
        count={counts.kits}
        tone={tone("kits")}
        clearText="Kit pronti per oggi e domani"
      >
        <QueueList>
          {data.interviewsWithoutKit.map((item) => (
            <QueueRow
              key={item.interviewId}
              href={`/dashboard/applications/${item.applicationId}/interviews/${item.interviewId}/prepare`}
              title={item.candidateName}
              context={item.positionTitle}
              detail={`Round ${item.round}, ${formatInterviewDateTime(item.scheduledAt)}`}
              verb="Prepara"
            />
          ))}
        </QueueList>
      </StationStop>

      <StationStop
        id={QUEUE_ANCHOR.scorecards}
        title={QUEUE_TITLES.scorecards}
        count={counts.scorecards}
        tone={tone("scorecards")}
        clearText="Tutte compilate"
      >
        <QueueList>
          {data.feedbackToFill.map((item) => (
            <QueueRow
              key={`${item.interviewId}-${item.interviewerId}`}
              href={`/dashboard/applications/${item.applicationId}/interviews/${item.interviewId}/feedback`}
              title={item.candidateName}
              context={item.positionTitle}
              detail={`Round ${item.round}, ${item.interviewerName}`}
              verb="Compila scheda"
            />
          ))}
        </QueueList>
      </StationStop>

      <StationDivider />

      <StationStop
        id={QUEUE_ANCHOR.stale}
        title={QUEUE_TITLES.stale}
        count={counts.stale}
        tone={tone("stale")}
        clearText="Nessuna"
      >
        <QueueList>
          {staleApplications.map((item) => (
            <QueueRow
              key={item.applicationId}
              href={`/dashboard/applications/${item.applicationId}`}
              title={item.candidateName}
              context={item.positionTitle}
              detail={
                <span className="inline-flex items-center gap-2">
                  <ApplicationStageBadge stage={item.stage} />
                  {`dal ${formatDate(new Date(item.stageChangedAt).toISOString())}`}
                </span>
              }
              verb="Apri"
            />
          ))}
        </QueueList>
      </StationStop>
    </StationLine>
  );
}
