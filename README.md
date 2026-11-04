# 两项修复与 PR 提交说明

目标仓库：AntonyTang-AT/Multi-agent_Study_Planing_Assistant
基线：main（已含 PR #65 的章级导学）

当前状态：代码已经完成并形成两个本地提交；GitHub App 在创建 Git tree 时返回
403 Resource not accessible by integration，尚未 push 或创建任何 PR。
账号的 push:true 与 App 自身写入授权是不同权限。

## PR 1 标题
fix(frontend): 修复题目与学习记录中的 LaTeX 公式显示

题干、题单、选择项、作答提示、历史作答和资料导学样例此前直接显示 LaTeX 源码。
增加统一 KaTeX 渲染组件，支持 $…$、$$…$$、\\(…\\)、\\[…\\]；保留普通文本，
错误公式回退显示原文；关闭可信 HTML 命令，普通文本仍由 React 转义。
字体随前端构建发布，无需外部 CDN。

验证：npm run typecheck、npm run build 通过；7 项本地渲染检查通过
（四种定界符、普通文本、HTML 转义、错误公式回退）。
对应补丁：0001-*.patch。

## PR 2 标题
fix(materials): 支持对应资料原件下载与 PDF 预览

资料页此前只能查看章级导学，不能打开对应原件。新增按 material_id 下载和预览接口；
实时 available/preview_available 字段；前端提供原件下载、预览抽屉、缺失提示。
PDF 直接预览，PPT/PPTX/DOC/DOCX 使用 LibreOffice 转为 PDF，原件保留供下载。
拒绝绝对路径、反斜杠路径、目录越界及越界软链接；每次转换隔离临时目录/配置，
设置 60 秒超时并清理临时文件。文档与环境变量同步。

验证：backend/tests 8 passed；前端类型检查、生产构建通过。
转换测试使用模拟 LibreOffice；没有在本环境用真实 Office 文件做转换验证。
部署要求：安装 LibreOffice，设置 MATERIALS_ROOT，并按资料索引中的相对目录部署原件。
仓库没有教材/PPT 原件，提交代码不会自动补齐文件；仅部署允许向站点访问者提供的资料。
对应补丁：0002-*.patch。

## 在本机应用

在目标仓库的最新 main 上创建工作分支后，按顺序应用：

```bash
git switch -c fix/math-and-materials
git am /path/to/0001-fix-frontend-render-mathematical-content-with-KaTeX.patch
git am /path/to/0002-fix-materials-serve-registered-originals-and-PDF-pre.patch
```

两个补丁按顺序生成，可一起提交 PR。若分成两个 PR，先提交第一个，第二个以第一个分支
为基线；第一个合并后把第二个 PR 的目标分支切换到 main。

仓库授权修复后可直接从这两个提交继续，无需重做需求。
