import React from "react";
import { createRoot } from "react-dom/client";
import {
  Folder,
  Clock,
  CalendarDays,
  ClipboardList
} from "lucide-react";
import { AppLayout, MenuBar, MainContent, Toolbar } from "./components/layout/AppLayout";
import { CoursePanel } from "./features/course/CoursePanel";
import { TimeManagementPanel } from "./features/time-management/TimeManagementPanel";
import { DailyReviewPanel } from "./features/daily-review/DailyReviewPanel";
import { SettingsModal } from "./features/settings/SettingsModal";
import { ListsPanel } from "./features/lists/ListsPanel";

import { startCoreFeatureWarmup } from "./lib/performanceWarmup";
import { drainBeforeCloseSaves } from "./lib/saveDrain";
import "./index.css";

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

type AppSection = "knowledge" | "time-management" | "daily-review" | "lists";

function App() {
  const [activeSection, setActiveSection] = React.useState<AppSection>("lists");
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

  React.useEffect(() => {
    return window.aistudyLifecycle?.onBeforeClose(() => drainBeforeCloseSaves());
  }, []);

  React.useEffect(() => startCoreFeatureWarmup(), []);

  return (
    <>
      <AppLayout
        menuBar={<MenuBar />}
        toolbar={
          <Toolbar
            tools={[
              { id: "lists", name: "清单", icon: ClipboardList, component: () => <></> },
              { id: "time-management", name: "时间管理", icon: Clock, component: () => <></> },
              { id: "daily-review", name: "每日复盘", icon: CalendarDays, component: () => <></> },
              { id: "knowledge", name: "知识库", icon: Folder, component: () => <></> },
            ]}
            activeToolId={activeSection}
            onToolSelect={(id) => setActiveSection(id as AppSection)}
            onSettingsClick={() => setIsSettingsOpen(true)}
          />
        }
        mainContent={
          <MainContent>
            {activeSection === "knowledge" ? (
              <CoursePanel />
            ) : activeSection === "time-management" ? (
              <TimeManagementPanel />
            ) : activeSection === "daily-review" ? (
              <DailyReviewPanel />
            ) : activeSection === "lists" ? (
              <ListsPanel />
            ) : null}
          </MainContent>
        }
      />

      {isSettingsOpen ? <SettingsModal onClose={() => setIsSettingsOpen(false)} /> : null}
    </>
  );
}

const rootContent = <App />;

createRoot(document.getElementById("root")!).render(
  <AppErrorBoundary>
    {rootContent}
  </AppErrorBoundary>
);
