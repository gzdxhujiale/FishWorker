import { create } from 'zustand';
import { Template, DEFAULT_TEMPLATES } from './templateTypes';
import * as templateService from './templateService';

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

interface TemplateStoreState {
  templates: Template[];
  initialized: boolean;
  
  getTemplates: () => Template[];
  addTemplate: (name: string, content: string) => Template;
  updateTemplate: (id: string, updates: Partial<Template>) => void;
  deleteTemplate: (id: string) => void;
  setTemplates: (templates: Template[]) => void;
}

export const useTemplateStore = create<TemplateStoreState>((set, get) => ({
  templates: DEFAULT_TEMPLATES,
  initialized: true,

  getTemplates: () => {
    return get().templates;
  },

  setTemplates: (templates: Template[]) => {
    if (templates.length > 0) {
      set({ templates, initialized: true });
    }
  },

  addTemplate: (name, content) => {
    const templates = get().templates;
    const newTemplate: Template = {
      id: genId('tpl'),
      name,
      content,
    };

    set({ templates: [...templates, newTemplate] });
    templateService.upsertTemplate(newTemplate).catch(() => {});
    return newTemplate;
  },

  updateTemplate: (id, updates) => {
    const templates = get().templates;
    const index = templates.findIndex(t => t.id === id);
    if (index !== -1) {
      const newTemplates = [...templates];
      newTemplates[index] = { ...newTemplates[index], ...updates };
      set({ templates: newTemplates });
      templateService.upsertTemplate(newTemplates[index]).catch(() => {});
    }
  },

  deleteTemplate: (id) => {
    const templates = get().templates;
    set({ templates: templates.filter(t => t.id !== id) });
    templateService.deleteTemplate(id).catch(() => {});
  },
}));
