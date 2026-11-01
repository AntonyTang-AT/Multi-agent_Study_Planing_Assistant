import { Result, Button } from "antd";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  failed: boolean;
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Application render failed", error, info);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="error-boundary">
          <Result
            status="500"
            title="页面暂时无法显示"
            subTitle="学习数据仍保存在本机。可以刷新页面，或返回首页重新进入当前任务。"
            extra={[
              <Button
                type="primary"
                key="reload"
                onClick={() => window.location.assign("/")}
              >
                返回首页
              </Button>,
              <Button key="refresh" onClick={() => window.location.reload()}>
                刷新页面
              </Button>,
            ]}
          />
        </div>
      );
    }

    return this.props.children;
  }
}
