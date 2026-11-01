import { ConfigProvider, Spin } from "antd";
import zhCN from "antd/locale/zh_CN";
import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { AppLayout } from "./components/layout/AppLayout";

const HomePage = lazy(() =>
  import("./pages/HomePage").then((module) => ({ default: module.HomePage })),
);
const ChatPage = lazy(() =>
  import("./pages/ChatPage").then((module) => ({ default: module.ChatPage })),
);
const PlanPage = lazy(() =>
  import("./pages/PlanPage").then((module) => ({ default: module.PlanPage })),
);
const PracticePage = lazy(() =>
  import("./pages/PracticePage").then((module) => ({
    default: module.PracticePage,
  })),
);
const MaterialsPage = lazy(() =>
  import("./pages/MaterialsPage").then((module) => ({
    default: module.MaterialsPage,
  })),
);
const TracePage = lazy(() =>
  import("./pages/TracePage").then((module) => ({ default: module.TracePage })),
);
const BlackboardPage = lazy(() =>
  import("./pages/BlackboardPage").then((module) => ({
    default: module.BlackboardPage,
  })),
);

function PageLoader() {
  return (
    <div className="page-loader" role="status" aria-label="正在加载页面">
      <Spin size="large" />
      <span>正在读取学习上下文...</span>
    </div>
  );
}

export default function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: "#2f8667",
          colorInfo: "#47758e",
          colorWarning: "#d3a13f",
          colorError: "#bd5149",
          colorText: "#1b2722",
          colorTextSecondary: "#69736e",
          colorBgLayout: "#f3f3ed",
          colorBgContainer: "#fbfbf7",
          colorBorder: "#dfe1d9",
          borderRadius: 6,
          fontFamily:
            '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", "Segoe UI", sans-serif',
        },
        components: {
          Button: {
            controlHeight: 38,
            fontWeight: 600,
          },
          Card: {
            borderRadiusLG: 8,
          },
          Tag: {
            defaultBg: "#eef0e9",
          },
        },
      }}
    >
      <BrowserRouter>
        <AppErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route element={<AppLayout />}>
                <Route index element={<HomePage />} />
                <Route path="chat" element={<ChatPage />} />
                <Route path="plan" element={<PlanPage />} />
                <Route path="practice" element={<PracticePage />} />
                <Route path="materials" element={<MaterialsPage />} />
                <Route path="trace" element={<TracePage />} />
                <Route path="blackboard" element={<BlackboardPage />} />
                <Route path="*" element={<Navigate replace to="/" />} />
              </Route>
            </Routes>
          </Suspense>
        </AppErrorBoundary>
      </BrowserRouter>
    </ConfigProvider>
  );
}
