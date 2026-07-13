export type UnlearningStatus = "INPUT" | "OUTPUT" | "FEEDBACK" | "REFLECTION" | "COMPLETED";

export interface UnlearningLoop {
  id: string;
  status: UnlearningStatus;
  inputData: {
    oldBelief: string;
    newPerspective: string;
  };
  outputData: {
    actionTaken: string;
    linkedDocId?: string; // Optional reference to a document or mindmap node
  };
  feedbackData: {
    expected: string;
    actual: string;
  };
  reflectionData: {
    keyTakeaway: string;
  };
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

export interface UnlearningData {
  loops: UnlearningLoop[];
  activeLoopId?: string;
}
