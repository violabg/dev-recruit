export type InterviewListItem = {
  id: string;
  token: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  score: number | null;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  quizId: string;
  quizTitle: string;
  positionId: string | null;
  positionTitle: string | null;
  positionSkills: string[];
};

export type AssignedInterview = {
  id: string;
  token: string;
  status: string;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  quizId: string;
  quizTitle: string;
};

export type UnassignedCandidate = {
  id: string;
  name: string;
  email: string;
  status: string;
};

export type QuizAssignmentData = {
  quiz: {
    id: string;
    title: string;
    positionId: string;
    timeLimit: number | null;
    createdBy: string;
  };
  position: {
    id: string;
    title: string;
  } | null;
  assignedInterviews: AssignedInterview[];
  unassignedCandidates: UnassignedCandidate[];
};

export type CandidateQuizData = {
  candidate: {
    id: string;
    name: string;
    email: string;
    status: string;
    positionId: string;
  };
  position: {
    id: string;
    title: string;
  } | null;
  availableQuizzes: Array<{
    id: string;
    title: string;
    createdAt: string;
    timeLimit: number | null;
    positionId: string;
  }>;
  assignedInterviews: AssignedInterview[];
};
