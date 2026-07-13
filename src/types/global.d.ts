import type {
  UpdateManagerInfo,
  UpdateCheckResult,
  UpdateDownloadResult,
  UpdateDownloadProgress,
  ErrorLogEntry,
  RuntimeDiagnosticResult,
  RuntimeDiagnosticReportCopyResult
} from "./updates";

declare global {
  interface Window {
    aistudyLifecycle?: {
      onBeforeClose: (callback: () => Promise<unknown> | unknown) => () => void;
    };
    aistudyClipboard?: {
      writeText: (text: string) => Promise<boolean>;
    };
    aistudyCourseLocators?: {
      createPath: (input: {
        courseId: string;
        courseName: string;
        courseDescription: string;
        sectionId: string | null;
        sectionName: string;
      }) => Promise<string>;
    };
    aistudyUpdates?: {
      loadInfo: () => Promise<UpdateManagerInfo>;
      check: () => Promise<UpdateCheckResult>;
      download: (downloadUrl: string, expectedSize?: number) => Promise<UpdateDownloadResult>;
      pauseDownload: () => Promise<boolean>;
      resumeDownload: () => Promise<boolean>;
      cancelDownload: () => Promise<boolean>;
      install: (filePath: string) => Promise<boolean>;
      openReleasePage: (releaseUrl: string) => Promise<boolean>;
      onDownloadProgress: (callback: (progress: UpdateDownloadProgress) => void) => () => void;
    };
    aistudyErrorLogs?: {
      list: (limit?: number) => Promise<ErrorLogEntry[]>;
    };
    aistudyRuntime?: {
      diagnose: () => Promise<RuntimeDiagnosticResult>;
      copyDiagnosticReport: () => Promise<RuntimeDiagnosticReportCopyResult>;
      openDataRoot: () => Promise<boolean>;
    };
    aistudyDatabase?: {
      getConfig: () => Promise<any>;
      saveConfig: (config: any) => Promise<void>;
    };
  }
}

export {};
