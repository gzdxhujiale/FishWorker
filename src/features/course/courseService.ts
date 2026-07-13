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

import { invoke } from "@tauri-apps/api/core";

const LOCAL_STORAGE_ACTIVE_COURSE_KEY = "aistudy_active_course_id";

function requireCourseApi() {
  if (window.aistudyCourses) {
    return window.aistudyCourses;
  }

  // Tauri backend fallback
  return {
    load: async (): Promise<CourseStore> => {
      const store = await invoke<CourseStore>("courses_load");
      const savedActiveCourseId = localStorage.getItem(LOCAL_STORAGE_ACTIVE_COURSE_KEY);
      if (savedActiveCourseId && store.courses.some(c => c.id === savedActiveCourseId)) {
         store.activeCourseId = savedActiveCourseId;
      }
      return store;
    },
    save: async (store: CourseStore): Promise<CourseStore> => {
      return await invoke<CourseStore>("courses_save_store", { store });
    },
    create: async (input: CourseCreateInput): Promise<CourseStore> => {
      return await invoke<CourseStore>("course_create", { input });
    },
    rename: async (input: CourseRenameInput): Promise<CourseStore> => {
      return await invoke<CourseStore>("course_rename", { input });
    },
    move: async (input: CourseMoveInput): Promise<CourseStore> => {
      return await invoke<CourseStore>("course_move", { input });
    },
    reorder: async (input: CourseReorderInput): Promise<CourseStore> => {
      return await invoke<CourseStore>("course_reorder", { input });
    },
    delete: async (courseId: string): Promise<CourseStore> => {
      return await invoke<CourseStore>("course_delete", { id: courseId });
    },
    select: async (courseId: string | null): Promise<CourseStore> => {
      if (courseId) {
        localStorage.setItem(LOCAL_STORAGE_ACTIVE_COURSE_KEY, courseId);
      } else {
        localStorage.removeItem(LOCAL_STORAGE_ACTIVE_COURSE_KEY);
      }
      const store = await requireCourseApi().load();
      return { ...store, activeCourseId: courseId };
    },
    syncStatus: async (): Promise<CourseSyncStatus> => ({ state: "saved", pendingCount: 0 })
  };
}

function requireCourseSectionApi() {
  if (window.aistudyCourseSections) {
    return window.aistudyCourseSections;
  }
  
  // Tauri backend fallback
  return {
    create: async (input: { name: string }): Promise<CourseStore> => {
      return await invoke<CourseStore>("section_create", { input });
    },
    rename: async (input: { id: string; name: string }): Promise<CourseStore> => {
      return await invoke<CourseStore>("section_rename", { input });
    },
    toggle: async (input: { id: string; collapsed: boolean }): Promise<CourseStore> => {
      return await invoke<CourseStore>("section_toggle", { input });
    },
    toggleAll: async (input: { collapsed: boolean }): Promise<CourseStore> => {
      return await invoke<CourseStore>("section_toggle_all", { input });
    },
    reorder: async (input: CourseSectionReorderInput): Promise<CourseStore> => {
      return await invoke<CourseStore>("section_reorder", { input });
    },
    delete: async (sectionId: string): Promise<CourseStore> => {
      return await invoke<CourseStore>("section_delete", { id: sectionId });
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
