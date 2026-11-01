import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "./components/layout/AppLayout";
import { BlackboardPage } from "./pages/BlackboardPage";
import { ChatPage } from "./pages/ChatPage";
import { HomePage } from "./pages/HomePage";
import { MaterialsPage } from "./pages/MaterialsPage";
import { PlanPage } from "./pages/PlanPage";
import { PracticePage } from "./pages/PracticePage";
import { TracePage } from "./pages/TracePage";

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
      </BrowserRouter>
    </ConfigProvider>
  );
}
