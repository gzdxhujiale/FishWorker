import type {
  CourseCreateInput,
  CourseMoveInput,
  CourseRenameInput,
  CourseReorderInput,
  CourseSectionReorderInput,
  CourseStore,
  CourseSyncStatus
} from "./courseTypes";

declare global {
  interface Window {
    aistudyCourses?: {
      load: () => Promise<CourseStore>;
      save: (store: CourseStore) => Promise<CourseStore>;
      create: (input: CourseCreateInput) => Promise<CourseStore>;
      rename: (input: CourseRenameInput) => Promise<CourseStore>;
      move: (input: CourseMoveInput) => Promise<CourseStore>;
      reorder: (input: CourseReorderInput) => Promise<CourseStore>;
      delete: (courseId: string) => Promise<CourseStore>;
      select: (courseId: string | null) => Promise<CourseStore>;
      syncStatus: () => Promise<CourseSyncStatus>;
    };
    aistudyCourseSections?: {
      create: (input: { name: string }) => Promise<CourseStore>;
      rename: (input: { id: string; name: string }) => Promise<CourseStore>;
      toggle: (input: { id: string; collapsed: boolean }) => Promise<CourseStore>;
      toggleAll: (input: { collapsed: boolean }) => Promise<CourseStore>;
      reorder: (input: CourseSectionReorderInput) => Promise<CourseStore>;
      delete: (sectionId: string) => Promise<CourseStore>;
    };
  }
}

let mockStore: CourseStore = {
  sections: [],
  courses: [{
    id: "mock-course-1",
    name: "示例知识库",
    description: "本地调试",
    sectionId: null,
    lastWorkspaceMode: "mindmap",
    sortOrder: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }],
  activeCourseId: "mock-course-1"
};

function requireCourseApi() {
  if (window.aistudyCourses) {
    return window.aistudyCourses;
  }
  return {
    load: async () => mockStore,
    save: async (store: CourseStore) => { mockStore = store; return mockStore; },
    create: async (input: CourseCreateInput) => {
      const newCourse: typeof mockStore.courses[0] = {
        id: `c${Date.now()}`,
        name: input.name,
        description: input.description,
        sectionId: input.sectionId,
        lastWorkspaceMode: "mindmap",
        sortOrder: mockStore.courses.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      mockStore = { ...mockStore, courses: [...mockStore.courses, newCourse], activeCourseId: newCourse.id };
      return mockStore;
    },
    rename: async (input: CourseRenameInput) => {
      mockStore = { ...mockStore, courses: mockStore.courses.map(c => c.id === input.id ? { ...c, name: input.name, description: input.description } : c) };
      return mockStore;
    },
    move: async (input: CourseMoveInput) => {
      mockStore = { ...mockStore, courses: mockStore.courses.map(c => c.id === input.id ? { ...c, sectionId: input.sectionId } : c) };
      return mockStore;
    },
    reorder: async (_input: CourseReorderInput) => mockStore,
    delete: async (courseId: string) => {
      mockStore = { ...mockStore, courses: mockStore.courses.filter(c => c.id !== courseId), activeCourseId: mockStore.activeCourseId === courseId ? null : mockStore.activeCourseId };
      return mockStore;
    },
    select: async (courseId: string | null) => {
      mockStore = { ...mockStore, activeCourseId: courseId };
      return mockStore;
    },
    syncStatus: async (): Promise<CourseSyncStatus> => ({ state: "saved", pendingCount: 0 })
  };
}

function requireCourseSectionApi() {
  if (window.aistudyCourseSections) {
    return window.aistudyCourseSections;
  }
  return {
    create: async (input: { name: string }) => {
      const newSection = {
        id: `s${Date.now()}`,
        name: input.name,
        sortOrder: mockStore.sections.length,
        collapsed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      mockStore = { ...mockStore, sections: [...mockStore.sections, newSection] };
      return mockStore;
    },
    rename: async (input: { id: string; name: string }) => {
      mockStore = { ...mockStore, sections: mockStore.sections.map(s => s.id === input.id ? { ...s, name: input.name } : s) };
      return mockStore;
    },
    toggle: async (input: { id: string; collapsed: boolean }) => {
      mockStore = { ...mockStore, sections: mockStore.sections.map(s => s.id === input.id ? { ...s, collapsed: input.collapsed } : s) };
      return mockStore;
    },
    toggleAll: async (input: { collapsed: boolean }) => {
      mockStore = { ...mockStore, sections: mockStore.sections.map(s => ({ ...s, collapsed: input.collapsed })) };
      return mockStore;
    },
    reorder: async (_input: CourseSectionReorderInput) => mockStore,
    delete: async (sectionId: string) => {
      mockStore = { ...mockStore, sections: mockStore.sections.filter(s => s.id !== sectionId) };
      return mockStore;
    }
  };
}

export const courseApi = {
  load: () => requireCourseApi().load(),
  saveStore: (store: CourseStore) => requireCourseApi().save(store),
  createCourse: (input: CourseCreateInput) => requireCourseApi().create(input),
  renameCourse: (input: CourseRenameInput) => requireCourseApi().rename(input),
  moveCourse: (input: CourseMoveInput) => requireCourseApi().move(input),
  reorderCourse: (input: CourseReorderInput) => requireCourseApi().reorder(input),
  deleteCourse: (courseId: string) => requireCourseApi().delete(courseId),
  selectCourse: (courseId: string | null) => requireCourseApi().select(courseId),
  syncStatus: () => requireCourseApi().syncStatus(),
  createSection: (name: string) => requireCourseSectionApi().create({ name }),
  renameSection: (id: string, name: string) => requireCourseSectionApi().rename({ id, name }),
  toggleSection: (id: string, collapsed: boolean) => requireCourseSectionApi().toggle({ id, collapsed }),
  toggleAllSections: (collapsed: boolean) => requireCourseSectionApi().toggleAll({ collapsed }),
  reorderSection: (id: string, beforeSectionId: string | null) => requireCourseSectionApi().reorder({ id, beforeSectionId }),
  deleteSection: (sectionId: string) => requireCourseSectionApi().delete(sectionId)
};
