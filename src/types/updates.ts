export type UpdateManagerInfo = {
  appVersion: string;
  repositoryUrl: string;
  repositoryWebUrl: string;
  branch: string;
  commit: string;
  dirty: boolean;
  canUseGit: boolean;
  updateIndexPath: string;
  releaseDir: string;
  installerPath: string;
};

export type UpdateCheckResult = {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  releaseName: string;
  publishedAt: string;
  releaseUrl: string;
  notes: string[];
  assetName: string;
  assetSize: number;
  downloadUrl: string;
};

export type UpdateDownloadResult = {
  filePath: string;
  fileName: string;
  fileSize: number;
};

export type UpdateDownloadStatus = "starting" | "downloading" | "paused" | "complete" | "cancelled";

export type UpdateDownloadProgress = {
  fileName: string;
  downloadedBytes: number;
  totalBytes: number;
  percent: number;
  status: UpdateDownloadStatus;
};

export type ErrorLogEntry = {
  id: string;
  source: string;
  userMessage: string;
  errorCode: string;
  domain: string;
  reason: string;
  action: string;
  retryable: boolean;
  createdAt: string;
};

export type RuntimeDiagnosticStatus = "ok" | "warning" | "error" | "disabled";

export type RuntimeDiagnosticItem = {
  id: string;
  name: string;
  status: RuntimeDiagnosticStatus;
  message: string;
  action: string;
  retryable: boolean;
};

export type RuntimeDiagnosticResult = {
  checkedAt: string;
  summary: {
    ok: number;
    warning: number;
    error: number;
    disabled: number;
  };
  items: RuntimeDiagnosticItem[];
};

export type RuntimeDiagnosticReportCopyResult = {
  copied: boolean;
  diagnostic: RuntimeDiagnosticResult;
};

export type SettingsPage = "database" | "shortcuts" | "updates";
