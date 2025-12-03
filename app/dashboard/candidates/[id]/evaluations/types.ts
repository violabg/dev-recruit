export interface Position {
  id: string;
  title: string;
}

export interface StreamingEvaluationState {
  evaluation?: string | undefined;
  strengths?: string[] | undefined;
  weaknesses?: string[] | undefined;
  recommendation?: string | undefined;
  fitScore?: number | undefined;
}
