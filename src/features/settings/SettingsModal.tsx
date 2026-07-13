import React from "react";
import {
  CheckCircle2,
  Database,
  Download,
  ExternalLink,
  GitBranch,
  Keyboard,
  Pause,
  Play,
  RefreshCw,
  Settings,
  X,
} from "lucide-react";
import type {
  UpdateManagerInfo,
  UpdateCheckResult,
  UpdateDownloadResult,
  UpdateDownloadProgress,
  SettingsPage,
} from "../../types/updates";
import {
  formatMindMapShortcutFromEvent,
  MIND_MAP_BRANCH_SHORTCUTS,
  readMindMapShortcutSettings,
  resetMindMapShortcutSettings,
  writeMindMapShortcutSettings,
  type MindMapBranchShortcutCommand,
  type MindMapShortcutSettings,
} from "../mindmap/mindMapShortcutSettings";
import { DatabaseSettingsPanel } from "./components/DatabaseSettingsPanel";

function formatFileSize(size: number) {
  if (!size) return "";
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
}

async function loadUpdateInfo() {
  if (!window.aistudyUpdates) {
    throw new Error("更新服务不可用。");
  }
  return window.aistudyUpdates.loadInfo();
}

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const [activePage, setActivePage] = React.useState<SettingsPage>("database");
  const [updateInfo, setUpdateInfo] = React.useState<UpdateManagerInfo | null>(null);
  const [checkResult, setCheckResult] = React.useState<UpdateCheckResult | null>(null);
  const [downloadResult, setDownloadResult] = React.useState<UpdateDownloadResult | null>(null);
  const [downloadProgress, setDownloadProgress] = React.useState<UpdateDownloadProgress | null>(null);
  const [status, setStatus] = React.useState("");
  const [error, setError] = React.useState("");
  const [isChecking, setIsChecking] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [lastCheckedAt, setLastCheckedAt] = React.useState("");
  const [shortcutSettings, setShortcutSettings] = React.useState<MindMapShortcutSettings>(() => readMindMapShortcutSettings());

  React.useEffect(() => {
    loadUpdateInfo()
      .then((info) => {
        setUpdateInfo(info);
        setError("");
      })
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : "更新服务初始化失败。");
      });
  }, []);

  React.useEffect(() => {
    if (!window.aistudyUpdates?.onDownloadProgress) return undefined;
    return window.aistudyUpdates.onDownloadProgress((progress) => {
      setDownloadProgress(progress);
      if (progress.status === "complete") {
        setStatus("安装包下载完成，可以开始安装。");
        return;
      }
      if (progress.status === "paused") {
        setStatus("下载已暂停。");
        return;
      }
      if (progress.status === "cancelled") {
        setStatus("下载已取消。");
        return;
      }
      if (progress.totalBytes > 0) {
        setStatus(`正在下载更新：${progress.percent}%`);
      } else {
        setStatus("正在下载更新...");
      }
    });
  }, []);



  const checkUpdate = React.useCallback(() => {
    if (!window.aistudyUpdates) return;
    setIsChecking(true);
    setStatus("正在检测更新...");
    setError("");
    setDownloadResult(null);
    setDownloadProgress(null);

    window.aistudyUpdates.check()
      .then((result) => {
        setCheckResult(result);
        setLastCheckedAt(new Date().toLocaleString());
        setStatus(result.hasUpdate ? `检测到新版本 ${result.latestVersion}` : "当前已是最新版本。");
      })
      .catch((checkError: unknown) => {
        setCheckResult(null);
        setStatus("");
        setError(checkError instanceof Error ? checkError.message : "检测更新失败。");
      })
      .finally(() => setIsChecking(false));
  }, []);

  const downloadUpdate = React.useCallback(() => {
    if (!window.aistudyUpdates || !checkResult?.downloadUrl) return;
    setIsDownloading(true);
    setStatus("正在下载安装包...");
    setError("");
    setDownloadResult(null);
    setDownloadProgress({
      fileName: checkResult.assetName || "AIstudy 安装包",
      downloadedBytes: 0,
      totalBytes: checkResult.assetSize || 0,
      percent: 0,
      status: "starting"
    });

    window.aistudyUpdates.download(checkResult.downloadUrl, checkResult.assetSize)
      .then((result) => {
        setDownloadResult(result);
        setDownloadProgress({
          fileName: result.fileName,
          downloadedBytes: result.fileSize,
          totalBytes: result.fileSize,
          percent: 100,
          status: "complete"
        });
        setStatus("下载完成，正在启动安装程序...");
        return window.aistudyUpdates?.install(result.filePath);
      })
      .then(() => {
        setStatus("安装程序已启动，当前应用将自动关闭。");
      })
      .catch((downloadError: unknown) => {
        const message = downloadError instanceof Error ? downloadError.message : "下载更新失败。";
        if (message.includes("取消")) {
          setStatus("下载已取消。");
          setDownloadProgress(null);
          return;
        }
        setError(message);
      })
      .finally(() => setIsDownloading(false));
  }, [checkResult]);

  const pauseDownload = React.useCallback(() => {
    if (!window.aistudyUpdates) return;
    void window.aistudyUpdates.pauseDownload()
      .then((paused) => {
        if (!paused) return;
        setStatus("下载已暂停。");
        setDownloadProgress((current) => current ? { ...current, status: "paused" } : current);
      })
      .catch((pauseError: unknown) => {
        setError(pauseError instanceof Error ? pauseError.message : "下载暂时无法暂停。");
      });
  }, []);

  const resumeDownload = React.useCallback(() => {
    if (!window.aistudyUpdates) return;
    void window.aistudyUpdates.resumeDownload()
      .then((resumed) => {
        if (!resumed) return;
        setStatus("继续下载更新...");
        setDownloadProgress((current) => current ? { ...current, status: "downloading" } : current);
      })
      .catch((resumeError: unknown) => {
        setError(resumeError instanceof Error ? resumeError.message : "下载暂时无法继续。");
      });
  }, []);

  const cancelDownload = React.useCallback(() => {
    if (!window.aistudyUpdates) return;
    void window.aistudyUpdates.cancelDownload()
      .then((cancelled) => {
        if (!cancelled) return;
        setIsDownloading(false);
        setDownloadProgress(null);
        setDownloadResult(null);
        setStatus("下载已取消。");
      })
      .catch((cancelError: unknown) => {
        setError(cancelError instanceof Error ? cancelError.message : "下载暂时无法取消。");
      });
  }, []);

  const installUpdate = React.useCallback(() => {
    if (!window.aistudyUpdates || !downloadResult?.filePath) return;
    setStatus("正在启动安装程序...");
    setError("");
    window.aistudyUpdates.install(downloadResult.filePath)
      .then(() => setStatus("安装程序已启动，当前应用将自动关闭。"))
      .catch((installError: unknown) => {
        setError(installError instanceof Error ? installError.message : "安装程序没有启动。");
        setStatus("");
      });
  }, [downloadResult]);

  const updateShortcut = React.useCallback((command: MindMapBranchShortcutCommand, shortcut: string) => {
    setShortcutSettings((current) => {
      const next = { ...current, [command]: shortcut };
      writeMindMapShortcutSettings(next);
      return next;
    });
  }, []);

  const captureShortcut = React.useCallback((command: MindMapBranchShortcutCommand, event: React.KeyboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.key === "Backspace" || event.key === "Delete") {
      updateShortcut(command, "");
      return;
    }
    const shortcut = formatMindMapShortcutFromEvent(event);
    if (shortcut) {
      updateShortcut(command, shortcut);
    }
  }, [updateShortcut]);

  const resetAllShortcuts = React.useCallback(() => {
    setShortcutSettings(resetMindMapShortcutSettings());
  }, []);

  const updateStateLabel = checkResult ? (checkResult.hasUpdate ? "发现新版本" : "已是最新") : "待检测";
  const updateStateClass = checkResult ? (checkResult.hasUpdate ? "available" : "latest") : "idle";
  const updateHeadline = checkResult
    ? (checkResult.hasUpdate ? `发现可更新版本 ${checkResult.latestVersion}` : "当前已是最新版本")
    : "检查是否有可用更新";
  const updateDescription = checkResult
    ? (checkResult.hasUpdate
      ? "新版本已准备好，你可以下载安装包并启动安装。"
      : `当前版本 ${updateInfo?.appVersion ?? checkResult.currentVersion} 已与线上版本一致。`)
    : "点击检测更新后，将自动对比线上发布版本。";
  const onlineVersion = checkResult?.latestVersion ?? "未检测";
  const downloadDescription = downloadResult
    ? `已下载 ${downloadResult.fileName}${downloadResult.fileSize ? `（${formatFileSize(downloadResult.fileSize)}）` : ""}`
    : (checkResult?.hasUpdate ? "下载完成后自动启动安装程序。" : "检测到可更新版本后可用。");
  const installDescription = downloadResult ? "启动安装程序并退出当前应用。" : "安装包下载完成后可用。";
  const isDownloadPaused = downloadProgress?.status === "paused";
  const visibleDownloadProgress = downloadProgress && (isDownloading || downloadProgress.status === "complete" || isDownloadPaused) ? downloadProgress : null;
  const progressPercent = visibleDownloadProgress ? Math.max(0, Math.min(100, visibleDownloadProgress.percent)) : 0;
  const progressSizeText = visibleDownloadProgress
    ? (visibleDownloadProgress.totalBytes > 0
      ? `${formatFileSize(visibleDownloadProgress.downloadedBytes)} / ${formatFileSize(visibleDownloadProgress.totalBytes)}`
      : formatFileSize(visibleDownloadProgress.downloadedBytes))
    : "";

  return (
    <div className="settings-backdrop" role="presentation">
      <section className="settings-dialog" role="dialog" aria-modal="true" aria-label="设置">
        <aside className="settings-nav">
          <div className="settings-title">
            <Settings size={18} />
            <span>设置</span>
          </div>


          <button className={activePage === "shortcuts" ? "settings-nav-item active" : "settings-nav-item"} type="button" onClick={() => setActivePage("shortcuts")}>
            <Keyboard size={16} />
            <span>快捷键</span>
          </button>
          <button className={activePage === "updates" ? "settings-nav-item active" : "settings-nav-item"} type="button" onClick={() => setActivePage("updates")}>
            <GitBranch size={16} />
            <span>更新管理</span>
          </button>
          <button className={activePage === "database" ? "settings-nav-item active" : "settings-nav-item"} type="button" onClick={() => setActivePage("database")}>
            <Database size={16} />
            <span>数据库配置</span>
          </button>

        </aside>

        <main className="settings-content">
          <header className="settings-header">
            <div />
            <button className="icon-button" title="关闭" aria-label="关闭设置" type="button" onClick={onClose}>
              <X size={17} />
            </button>
          </header>

          <div className="settings-panels-wrapper">
            {activePage === "database" ? (
            <DatabaseSettingsPanel />
          ) : activePage === "shortcuts" ? (
            <div className="shortcut-settings-panel">
              <section className="shortcut-settings-list" aria-label="导图快捷键">
                {MIND_MAP_BRANCH_SHORTCUTS.map((item) => (
                  <article className="shortcut-settings-row" key={item.command}>
                    <div className="shortcut-settings-main">
                      <strong>{item.label}</strong>
                    </div>
                    <input
                      value={shortcutSettings[item.command] || "未设置"}
                      readOnly
                      onKeyDown={(event) => captureShortcut(item.command, event)}
                      onFocus={(event) => event.currentTarget.select()}
                      aria-label={`${item.label}快捷键`}
                    />
                    <button type="button" onClick={() => updateShortcut(item.command, item.defaultShortcut)}>
                      恢复
                    </button>
                  </article>
                ))}
              </section>
              <div className="shortcut-settings-actions">
                <button type="button" onClick={resetAllShortcuts}>全部恢复</button>
              </div>
            </div>
          ) : activePage === "updates" ? (
            <div className="update-panel">
              <section className={`windows-update-hero ${updateStateClass}`}>
                <div className="windows-update-main">
                  <div className="windows-update-mark" aria-hidden="true">
                    <RefreshCw size={56} strokeWidth={1.9} />
                    <span>
                      <CheckCircle2 size={18} />
                    </span>
                  </div>
                  <div className="windows-update-copy">
                    <p className="section-kicker">版本状态</p>
                    <h3>{updateHeadline}</h3>
                    <p>{updateDescription}</p>
                    <p className="update-check-time">
                      {lastCheckedAt ? `上次检查时间：${lastCheckedAt}` : `当前版本：${updateInfo?.appVersion ?? "-"}`}
                    </p>
                  </div>
                </div>
                <button className="primary-button update-check-button" type="button" onClick={checkUpdate} disabled={isChecking || isDownloading}>
                  <RefreshCw size={15} />
                  {isChecking ? "检测中" : "检测更新"}
                </button>
              </section>

              {status ? <p className="update-status">{status}</p> : null}
              {error ? <p className="status-message error">{error}</p> : null}

              {checkResult?.hasUpdate ? (
                <section className="release-card" aria-label="新版本更新内容">
                  <div className="release-card-heading">
                    <div>
                      <p className="section-kicker">更新内容</p>
                      <h3>版本 {checkResult.latestVersion}</h3>
                    </div>
                    {checkResult.publishedAt ? <span>{formatDate(checkResult.publishedAt)}</span> : null}
                  </div>

                  <ol className="release-notes">
                    {checkResult.notes.map((note, index) => (
                      <li key={`${note}-${index}`}>{note}</li>
                    ))}
                  </ol>

                  {checkResult.assetName ? (
                    <p className="release-asset">
                      安装包：{checkResult.assetName}
                      {checkResult.assetSize ? `（${formatFileSize(checkResult.assetSize)}）` : ""}
                    </p>
                  ) : (
                    <p className="release-asset warning">该版本未找到 Windows 安装包。</p>
                  )}
                </section>
              ) : null}

              <section className="update-options" aria-label="更新选项">
                <p className="settings-section-label">更多选项</p>
                <button
                  className="update-option-row"
                  type="button"
                  onClick={downloadUpdate}
                  disabled={!checkResult?.hasUpdate || !checkResult.downloadUrl || isDownloading}
                >
                  <span className="update-option-icon"><Download size={18} /></span>
                  <span className="update-option-copy">
                    <strong>{isDownloading ? "正在下载更新" : "下载并安装更新"}</strong>
                    <span>{downloadDescription}</span>
                  </span>
                  <span className="update-option-meta">{onlineVersion}</span>
                </button>
                {visibleDownloadProgress ? (
                  <div className="update-download-progress" aria-label="下载进度">
                    <div className="update-progress-heading">
                      <span>
                        {visibleDownloadProgress.status === "complete"
                          ? "下载完成"
                          : visibleDownloadProgress.status === "paused"
                            ? "已暂停"
                            : "正在下载"}
                      </span>
                      <strong>{progressPercent}%</strong>
                    </div>
                    <div className="update-progress-track" aria-hidden="true">
                      <span ref={el => { if (el) el.style.setProperty("--progress-width", `${progressPercent}%`); }} />
                    </div>
                    <div className="update-progress-meta">
                      <span>{visibleDownloadProgress.fileName}</span>
                      <span>{progressSizeText}</span>
                    </div>
                    {visibleDownloadProgress.status !== "complete" ? (
                      <div className="update-progress-actions" aria-label="下载控制">
                        <button type="button" onClick={isDownloadPaused ? resumeDownload : pauseDownload}>
                          {isDownloadPaused ? <Play size={14} /> : <Pause size={14} />}
                          <span>{isDownloadPaused ? "继续" : "暂停"}</span>
                        </button>
                        <button type="button" onClick={cancelDownload}>
                          <X size={14} />
                          <span>取消</span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <button className="update-option-row" type="button" onClick={installUpdate} disabled={!downloadResult}>
                  <span className="update-option-icon"><CheckCircle2 size={18} /></span>
                  <span className="update-option-copy">
                    <strong>安装更新</strong>
                    <span>{installDescription}</span>
                  </span>
                  <span className="update-option-meta">{downloadResult ? "可安装" : updateStateLabel}</span>
                </button>
                <button
                  className="update-option-row"
                  type="button"
                  disabled={!checkResult?.releaseUrl}
                  onClick={() => checkResult?.releaseUrl && void window.aistudyUpdates?.openReleasePage(checkResult.releaseUrl)}
                >
                  <span className="update-option-icon"><ExternalLink size={18} /></span>
                  <span className="update-option-copy">
                    <strong>查看发布页</strong>
                    <span>打开线上版本页面，查看完整发布说明。</span>
                  </span>
                  <span className="update-option-meta">{checkResult?.publishedAt ? formatDate(checkResult.publishedAt) : ""}</span>
                </button>
              </section>
            </div>
          ) : null}
          </div>
        </main>
      </section>
    </div>
  );
}
