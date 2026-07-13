export type CourseContextState = {
  courseTitle: string;
  nodeTitle: string;
  contextText: string;
};

let currentState: CourseContextState = {
  courseTitle: "",
  nodeTitle: "",
  contextText: "",
};

const listeners = new Set<(state: CourseContextState) => void>();

export const courseContextStore = {
  getState: () => currentState,
  setState: (newState: CourseContextState) => {
    currentState = newState;
    listeners.forEach(listener => listener(currentState));
  },
  subscribe: (listener: (state: CourseContextState) => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
};
