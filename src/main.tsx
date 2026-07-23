import "./patchEnv";
import React from "react";
import { createRoot } from "react-dom/client";
import {
  Clock,
  CalendarDays,
  ClipboardList,
  LayoutGrid,
  Navigation,
  Flame,
  Timer
} from "lucide-react";
import { AppLayout, MenuBar, MainContent, Toolbar } from "./components/layout/AppLayout";
import "./index.css";

const TimeManagementPanel = React.lazy(() => import("./features/time-management/TimeManagementPanel").then(m => ({ default: m.TimeManagementPanel })));
const DailyReviewPanel = React.lazy(() => import("./features/daily-review/DailyReviewPanel").then(m => ({ default: m.DailyReviewPanel })));
const SettingsModal = React.lazy(() => import("./features/settings/SettingsModal").then(m => ({ default: m.SettingsModal })));
const ListsPanel = React.lazy(() => import("./features/lists/ListsPanel").then(m => ({ default: m.ListsPanel })));
const MissionPanel = React.lazy(() => import("./features/mission/MissionPanel").then(m => ({ default: m.MissionPanel })));
const HabitPanel = React.lazy(() => import("./features/habit/HabitPanel").then(m => ({ default: m.HabitPanel })));
const PomodoroPanel = React.lazy(() => import("./features/pomodoro/PomodoroPanel").then(m => ({ default: m.PomodoroPanel })));

const SectionFallback = () => (
  <div className="flex items-center justify-center h-full w-full bg-gray-50/50 text-gray-400 text-sm">
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      <span>加载模块中...</span>
    </div>
  </div>
);

declare global {
  interface Window {
    aistudyClipboard?: {
      writeText: (text: string) => Promise<boolean>;
    };
  }
}

type AppErrorBoundaryState = {
  error: Error | null;
};

class AppErrorBoundary extends React.Component<React.PropsWithChildren, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app-error-fallback" role="alert">
          <strong>应用运行异常</strong>
          <span>页面暂时没有正常打开，可以先重新载入；详细信息会记录到报错日志。</span>
          <button type="button" onClick={() => window.location.reload()}>
            重新载入
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

type AppSection = "weekly-planning" | "four-quadrants" | "daily-review" | "habit" | "lists" | "mission" | "pomodoro";

// Preload all lazy modules during browser idle time after first paint.
// This mirrors what VS Code / Linear do: critical path loads fast, secondary
// chunks are quietly fetched in the background so navigation feels instant.
function preloadAllModules() {
  const schedule = typeof requestIdleCallback !== "undefined"
    ? requestIdleCallback
    : (cb: () => void) => setTimeout(cb, 200);

  schedule(() => {
    import("./features/pomodoro/PomodoroPanel");
    import("./features/lists/ListsPanel");
    import("./features/daily-review/DailyReviewPanel");
    import("./features/habit/HabitPanel");
    import("./features/mission/MissionPanel");
    import("./features/time-management/TimeManagementPanel");
    import("./features/settings/SettingsModal");
  });
}

function App() {
  const [activeSection, setActiveSection] = React.useState<AppSection>("four-quadrants");
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

  // Preload all chunks once on mount, during idle time.
  React.useEffect(() => {
    preloadAllModules();
  }, []);

  return (
    <>
      <AppLayout
        menuBar={<MenuBar />}
        toolbar={
          <Toolbar
            tools={[
              { id: "four-quadrants", name: "四象限工作台", icon: LayoutGrid, component: () => <></> },
              { id: "pomodoro", name: "番茄专注", icon: Timer, component: () => <></> },
              { id: "daily-review", name: "每日复盘", icon: Clock, component: () => <></> },
              { id: "weekly-planning", name: "周计划", icon: CalendarDays, component: () => <></> },
              { id: "mission", name: "人生罗盘", icon: Navigation, component: () => <></> },
              { id: "habit", name: "习惯追踪", icon: Flame, component: () => <></> },
              { id: "lists", name: "清单", icon: ClipboardList, component: () => <></> },
            ]}
            activeToolId={activeSection}
            onToolSelect={(id) => setActiveSection(id as AppSection)}
            onSettingsClick={() => setIsSettingsOpen(true)}
          />
        }
        mainContent={
          <MainContent>
            {/* All panels are mounted immediately and hidden via display:none.
                This eliminates the "first-visit stutter" caused by on-demand
                lazy mounting. The Suspense boundary only covers the initial
                load of each lazy chunk — after that switching is instant. */}
            <React.Suspense fallback={<SectionFallback />}>
              <div style={{ display: activeSection === "pomodoro" ? "block" : "none", height: "100%" }}>
                <PomodoroPanel />
              </div>
              <div style={{ display: activeSection === "lists" ? "block" : "none", height: "100%" }}>
                <ListsPanel />
              </div>
              <div style={{ display: activeSection === "weekly-planning" ? "block" : "none", height: "100%" }}>
                <TimeManagementPanel mode="weekly" />
              </div>
              <div style={{ display: activeSection === "four-quadrants" ? "block" : "none", height: "100%" }}>
                <TimeManagementPanel mode="daily" />
              </div>
              <div style={{ display: activeSection === "daily-review" ? "block" : "none", height: "100%" }}>
                <DailyReviewPanel />
              </div>
              <div style={{ display: activeSection === "habit" ? "block" : "none", height: "100%" }}>
                <HabitPanel />
              </div>
              <div style={{ display: activeSection === "mission" ? "block" : "none", height: "100%" }}>
                <MissionPanel />
              </div>
            </React.Suspense>
          </MainContent>
        }
      />

      {isSettingsOpen ? (
        <React.Suspense fallback={null}>
          <SettingsModal onClose={() => setIsSettingsOpen(false)} />
        </React.Suspense>
      ) : null}
    </>
  );
}

import { ConfirmDialogProvider } from "./components/ui/ConfirmDeleteDialog";

const rootContent = (
  <ConfirmDialogProvider>
    <App />
  </ConfirmDialogProvider>
);

createRoot(document.getElementById("root")!).render(
  <AppErrorBoundary>
    {rootContent}
  </AppErrorBoundary>
);
