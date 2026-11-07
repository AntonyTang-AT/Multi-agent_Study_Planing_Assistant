/** Browser Python via Pyodide CDN (no backend sandbox needed). */

import { simplifyPythonTraceback } from "./csCodeTutor";

export interface RunResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  checkPassed: boolean | null;
}

type PyodideLike = {
  setStdout: (opts: { batched: (text: string) => void }) => void;
  setStderr: (opts: { batched: (text: string) => void }) => void;
  runPythonAsync: (code: string) => Promise<unknown>;
};

declare global {
  interface Window {
    loadPyodide?: (config: { indexURL: string }) => Promise<PyodideLike>;
  }
}

const PYODIDE_VERSION = "v0.26.4";
const INDEX_URL = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/`;

let loading: Promise<PyodideLike> | null = null;
let runtime: PyodideLike | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-pyodide="${PYODIDE_VERSION}"]`,
    );
    if (existing) {
      if (window.loadPyodide) resolve();
      else existing.addEventListener("load", () => resolve());
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.pyodide = PYODIDE_VERSION;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("无法加载 Pyodide 脚本，请检查网络"));
    document.head.appendChild(script);
  });
}

export async function getPyodide(): Promise<PyodideLike> {
  if (runtime) return runtime;
  if (!loading) {
    loading = (async () => {
      await loadScript(`${INDEX_URL}pyodide.js`);
      if (!window.loadPyodide) throw new Error("loadPyodide 未就绪");
      const py = await window.loadPyodide({ indexURL: INDEX_URL });
      runtime = py;
      return py;
    })();
  }
  return loading;
}

export async function runPython(
  userCode: string,
  checkCode?: string,
): Promise<RunResult> {
  const py = await getPyodide();
  let stdout = "";
  let stderr = "";
  py.setStdout({
    batched: (text) => {
      stdout += `${text}\n`;
    },
  });
  py.setStderr({
    batched: (text) => {
      stderr += `${text}\n`;
    },
  });

  try {
    await py.runPythonAsync(userCode);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      stdout,
      stderr: simplifyPythonTraceback(stderr || message),
      checkPassed: null,
    };
  }

  if (!checkCode?.trim()) {
    return { ok: true, stdout, stderr, checkPassed: null };
  }

  try {
    await py.runPythonAsync(checkCode);
    const passed = stdout.includes("CHECK_OK") || !stderr;
    return {
      ok: true,
      stdout,
      stderr: simplifyPythonTraceback(stderr),
      checkPassed: stdout.includes("CHECK_OK") ? true : passed,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: true,
      stdout,
      stderr: simplifyPythonTraceback(stderr || message),
      checkPassed: false,
    };
  }
}
