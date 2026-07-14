import { analyzeReport } from "../src/analyzer";
import type { Severity, UseCaseVerdict } from "../src/analyzerTypes";

const TAB_ID = "nq-reader-summary";
const PANEL_ID = "nq-reader-summary-panel";
const NODE_SEEK_TAB_ID = "nq-reader-nodeseek-tab";
const NODE_SEEK_PANEL_ID = "nq-reader-nodeseek-panel";
const REPORT_CACHE_PREFIX = "nq-reader:report:";
const REPORT_CACHE_TTL = 24 * 60 * 60 * 1000;
let reportPromise: Promise<string> | undefined;

declare function GM_getValue<T>(key: string, defaultValue: T): Promise<T>;
declare function GM_setValue<T>(key: string, value: T): Promise<void>;
declare function GM_addValueChangeListener<T>(key: string, listener: (key: string, oldValue: T, newValue: T, remote: boolean) => void): number;
declare function GM_openInTab(url: string, options: { active: boolean; insert: boolean; setParent: boolean }): { close(): void };

type CachedReport = { report?: string; error?: string; savedAt: number };

function debug(event: string, details?: unknown) {
  console.info(`[NQ Reader] ${event}`, details ?? "");
}

declare const JSZip: {
  loadAsync(data: string, options: { base64: boolean }): Promise<{
    file(name: string): { async(type: "text"): Promise<string> } | null;
  }>;
};

function addStyles() {
  const style = document.createElement("style");
  style.textContent = `
    #viewport-wrapper.nq-reader-active { min-width: 0 !important; width: 100% !important; }
    #viewport-wrapper #${PANEL_ID} { display: none; box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; margin-top: 10px; overflow-x: hidden; color: #edf5f2; font: 15px/1.6 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    #viewport-wrapper.nq-reader-active .xterm { display: none !important; }
    #viewport-wrapper.nq-reader-active #${PANEL_ID} { display: block; }
    .radio.nq-reader-tab { text-align: center; }
    .radio.nq-reader-tab .name { display: flex; align-items: center; justify-content: center; min-width: var(--nqr-tab-width); height: var(--nqr-tab-height); padding: 0 1rem; border: 0; border-radius: .5rem; color: #00ff7b; cursor: pointer; white-space: nowrap; transition: all .15s ease-in-out; }
    .radio.nq-reader-tab.is-selected .name { color: #00ff7b; background: #474747; font-weight: 600; }
    .radio-inputs.nq-reader-summary-active .radio input:checked + .name { background-color: transparent !important; font-weight: 400 !important; }
    .nqr-panel { box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow: hidden; border: 1px solid rgba(65, 236, 161, .22); border-radius: 12px; background: linear-gradient(145deg, #171b22, #101218); box-shadow: 0 14px 36px rgba(0, 0, 0, .22); }
    .nqr-heading { padding: 25px 28px 20px; border-bottom: 1px solid rgba(255,255,255,.1); }
    .nqr-heading-top { display: flex; align-items: center; justify-content: space-between; gap: 18px; }
    .nqr-kicker, .nqr-heading-ip { font-size: 12px; font-weight: 800; letter-spacing: .11em; text-transform: uppercase; }
    .nqr-heading-ip { color: #ffdc82; }
    .nqr-heading-link { color: #26e99e; text-decoration: none; }
    .nqr-heading-link:hover { color: #7ff6be; text-decoration: underline; text-underline-offset: 4px; }
    .nqr-heading-bottom { display: flex; align-items: end; justify-content: space-between; gap: 18px; margin-top: 8px; }
    .nqr-heading h2 { margin: 0; font-size: 25px; line-height: 1.2; }
    .nqr-heading h2 a { color: #fff; text-decoration: none; }
    .nqr-heading h2 a:hover { color: #a4f5d2; text-decoration: underline; text-underline-offset: 5px; }
    .nqr-heading-description { max-width: 60%; margin: 0; color: #a9b7b2; font-size: 13px; text-align: right; }
    .nqr-overview { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; padding: 20px 28px; }
    .nqr-overview-card, .nqr-detail { min-width: 0; overflow-wrap: anywhere; border: 1px solid rgba(255,255,255,.1); border-radius: 10px; background: rgba(255,255,255,.035); }
    .nqr-overview-card { position: relative; min-height: 126px; padding: 15px; overflow: hidden; text-align: left; border-color: rgba(9, 15, 20, .92); background-color: #1b2028; background-size: cover; background-position: center; box-shadow: inset 0 0 0 1px rgba(255,255,255,.045), inset 0 0 18px rgba(0,0,0,.42); isolation: isolate; }
    .nqr-overview-card::before { position: absolute; z-index: -1; inset: 0; border-radius: inherit; background: linear-gradient(100deg, rgba(13, 16, 22, .78) 0%, rgba(13, 16, 22, .5) 42%, rgba(13, 16, 22, .16) 100%); content: ""; }
    .nqr-overview-card span, .nqr-detail-label { display: block; color: #c3d0ca; font-size: 12px; }
    .nqr-overview-card strong { display: block; margin-top: 8px; color: #fff; font-size: 18px; line-height: 1.35; text-shadow: 0 1px 8px rgba(0,0,0,.7); }
    .nqr-tags { position: absolute; right: 12px; bottom: 12px; left: 15px; display: flex; flex-wrap: wrap; gap: 5px; }
    .nqr-region-tag { color: #a9d9ff; border-color: rgba(102, 190, 255, .34); background: rgba(20, 59, 89, .72); }
    .nqr-tag { padding: 2px 7px; border: 1px solid rgba(255,255,255,.14); border-radius: 999px; color: #dfeae5; background: rgba(8, 11, 15, .62); font-size: 11px; font-weight: 700; line-height: 1.35; }
    .nqr-tag.good { color: #82f1bd; border-color: rgba(73, 231, 151, .28); }
    .nqr-tag.watch { color: #ffdc82; border-color: rgba(255, 198, 76, .28); }
    .nqr-tag.risk { color: #ffabb7; border-color: rgba(255, 111, 132, .3); }
    .nqr-card-copy { position: absolute; top: 12px; right: 12px; display: grid; place-items: center; width: 30px; height: 30px; padding: 0; border: 1px solid rgba(255,255,255,.16); border-radius: 8px; color: #e9f2ee; background: rgba(8, 11, 15, .72); cursor: pointer; opacity: 0; transition: opacity .15s ease, background-color .15s ease; }
    .nqr-overview-card:hover .nqr-card-copy, .nqr-card-copy:focus-visible { opacity: 1; }
    .nqr-card-copy:hover { background: #26332e; }
    .nqr-card-copy.is-copied { width: auto; padding: 0 9px; color: #7af1ba; font-size: 12px; opacity: 1; }
    .nqr-details { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; padding: 0 28px 28px; }
    .nqr-detail { padding: 18px; }
    .nqr-detail-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .nqr-detail h3 { margin: 0; color: #fff; font-size: 18px; }
    .nqr-level { display: inline-block; flex: 0 0 auto; padding: 3px 8px; border-radius: 999px; font-size: 12px; font-weight: 700; }
    .nqr-good { color: #70f0ba; background: rgba(33, 220, 135, .12); }
    .nqr-watch { color: #ffd576; background: rgba(255, 190, 62, .12); }
    .nqr-risk { color: #ff9bab; background: rgba(255, 85, 110, .12); }
    .nqr-detail-verdict { margin: 12px 0 6px; color: #fff; font-size: 20px; font-weight: 800; }
    .nqr-detail-reason { margin: 0; color: #bac5c1; font-size: 13px; }
    .nqr-evidence { margin: 14px 0 0; padding: 12px 0 0; border-top: 1px solid rgba(255,255,255,.08); color: #9eaca6; font-size: 12px; }
    .nqr-evidence summary { cursor: pointer; color: #67dcae; }
    .nqr-evidence ul { margin: 8px 0 0; padding-left: 18px; }
    .nqr-evidence li + li { margin-top: 4px; }
    .nqr-error { padding: 24px; border-radius: 10px; color: #ffc7d0; background: rgba(155, 40, 60, .2); }
    .nq-reader-nodeseek-tab { cursor: pointer; }
    .nq-reader-nodeseek-panel { display: none; padding: 8px 0 0; color: #edf5f2; font: 15px/1.6 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .nsk-magic-tabs.nq-reader-nodeseek-active > .nsk-magic-tab-body { display: none !important; }
    .nq-reader-nodeseek-panel .nqr-panel { border-color: rgba(65, 236, 161, .22) !important; border-radius: 14px !important; background: #11171e !important; box-shadow: 0 14px 36px rgba(0, 0, 0, .22) !important; }
    .nq-reader-nodeseek-panel .nqr-heading { padding: 12px 22px 11px !important; border-bottom-color: rgba(255,255,255,.1) !important; background: linear-gradient(135deg, #182119, #11171e 72%) !important; }
    .nq-reader-nodeseek-panel .nqr-heading-top { align-items: center !important; }
    .nq-reader-nodeseek-panel .nqr-heading-bottom { align-items: center !important; margin-top: 2px !important; }
    .nq-reader-nodeseek-panel .nqr-heading h2 { color: #f3f8f5 !important; font-size: 21px !important; }
    .nq-reader-nodeseek-panel .nqr-heading h2 a { color: #f3f8f5 !important; text-decoration: none !important; }
    .nq-reader-nodeseek-panel .nqr-heading h2 a:hover { color: #f3f8f5 !important; text-decoration: underline !important; text-underline-offset: 4px !important; }
    .nq-reader-nodeseek-panel .nqr-heading-description { max-width: 34rem !important; color: #aebbb7 !important; font-size: 12px !important; line-height: 1.45 !important; }
    .nq-reader-nodeseek-panel .nqr-overview { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px !important; padding: 18px 26px !important; background: #0d1319; }
    .nq-reader-nodeseek-panel .nqr-overview-card { min-height: 174px; padding: 18px; }
    .nq-reader-nodeseek-panel .nqr-overview-card strong { max-width: 72%; font-size: 22px; }
    .nq-reader-nodeseek-panel .nqr-details { gap: 14px !important; padding: 0 26px 26px !important; background: #0d1319; }
    .nq-reader-nodeseek-panel .nqr-detail { padding: 20px; border-color: rgba(255,255,255,.13); background: #161d25; }
    .nq-reader-nodeseek-panel .nqr-detail-verdict { font-size: 22px; }
    .nq-reader-nodeseek-panel .nqr-detail-reason { color: #b9c3bf; line-height: 1.62; }
    .nq-reader-nodeseek-panel .nqr-proxy-stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 14px; }
    .nq-reader-nodeseek-panel .nqr-proxy-stat { min-width: 0; padding: 10px 11px; border: 1px solid rgba(255,255,255,.1); border-radius: 8px; background: rgba(255,255,255,.035); }
    .nq-reader-nodeseek-panel .nqr-proxy-stat-label { display: block; color: #9eaca6; font-size: 11px; }
    .nq-reader-nodeseek-panel .nqr-proxy-stat-value { display: block; margin-top: 4px; color: #e7efea; font-size: 13px; font-weight: 700; line-height: 1.45; overflow-wrap: anywhere; }
    .nq-reader-nodeseek-panel .nqr-proxy-stat.good .nqr-proxy-stat-value { color: #82f1bd; }
    .nq-reader-nodeseek-panel .nqr-proxy-stat.risk .nqr-proxy-stat-value { color: #ffabb7; }
    .nq-reader-nodeseek-panel .nqr-evidence { display: block !important; width: auto !important; min-width: 0 !important; margin: 14px 0 0 !important; padding: 12px 0 0 !important; border: 0 !important; border-top: 1px solid rgba(255,255,255,.08) !important; border-radius: 0 !important; background: transparent !important; box-shadow: none !important; }
    .nq-reader-nodeseek-panel .nqr-evidence summary { display: list-item !important; width: auto !important; min-width: 0 !important; height: auto !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; border: 0 !important; border-radius: 0 !important; color: #67dcae !important; background: transparent !important; box-shadow: none !important; font: inherit !important; font-size: 12px !important; font-weight: 400 !important; line-height: 1.5 !important; cursor: pointer !important; }
    .nq-reader-nodeseek-panel .nqr-evidence summary::before, .nq-reader-nodeseek-panel .nqr-evidence summary::after { content: none !important; }
    .nq-reader-nodeseek-panel .nqr-evidence ul { margin: 8px 0 0 !important; padding-left: 18px !important; color: #9eaca6 !important; background: transparent !important; }
    @media (max-width: 760px) { .nq-reader-nodeseek-panel { padding-top: 8px; } .nq-reader-nodeseek-panel .nqr-heading { padding: 18px !important; } .nq-reader-nodeseek-panel .nqr-heading-bottom { align-items: flex-start !important; } .nq-reader-nodeseek-panel .nqr-heading-description { max-width: none !important; text-align: left !important; } .nq-reader-nodeseek-panel .nqr-overview, .nq-reader-nodeseek-panel .nqr-details { padding-right: 14px !important; padding-left: 14px !important; } }
    @media (max-width: 760px) { .nqr-heading { display:block; padding: 20px; } .nqr-heading p { margin-top: 8px; text-align:left; } .nqr-overview, .nqr-details { grid-template-columns: 1fr; padding-left: 14px; padding-right: 14px; } }
  `;
  document.head.append(style);
}

function recordToken() {
  return location.pathname.split("/").filter(Boolean).at(-1) ?? "";
}

async function loadReportFromApi(): Promise<string> {
  const token = recordToken();
  if (!token) throw new Error("未识别 NodeQuality 报告编号");
  const response = await fetch(`https://api.nodequality.com/api/v1/record/${encodeURIComponent(token)}`);
  debug("API response", { status: response.status, ok: response.ok });
  if (!response.ok) throw new Error(`NodeQuality 接口不可用（${response.status}）`);
  const payload = await response.json() as { success?: boolean; message?: string; data?: { result?: string } };
  if (!payload.success || !payload.data?.result) throw new Error(payload.message || "NodeQuality 未保存完整报告");

  const archive = await JSZip.loadAsync(payload.data.result, { base64: true });
  const parts = await Promise.all([
    "header_info.log",
    "hardware_quality.log",
    "basic_info.log",
    "ip_quality.log",
    "net_quality.log",
    "backroute_trace.log",
  ].map(async (name) => archive.file(name)?.async("text") ?? ""));
  const [header, hardwareQuality, basicInfo, ip, net, trace] = parts;
  const report = [header, hardwareQuality || basicInfo, ip, net, trace].filter(Boolean).join("\n\n").trim();
  if (!report) throw new Error("NodeQuality 接口未返回可解读的报告内容");
  return report;
}

function stripAnsi(text: string) {
  return text
    .replace(/\x1B(?:\[[0-?]*[ -/]*[@-~]|\][^\x07]*(?:\x07|\x1B\\))/g, "")
    .replace(/(?:\x1B)?\[[0-?;]*m/g, "");
}

function loadReportFromPage(): string {
  const fromText = (value: unknown): string | undefined => {
    if (typeof value !== "string") return undefined;
    const report = stripAnsi(value).trim();
    return /硬件质量体检报告|IP质量体检报告|网络质量体检报告/.test(report) ? report : undefined;
  };
  const fromSections = (sections: unknown): string | undefined => {
    if (!Array.isArray(sections) || sections.length < 3 || !sections.every((item) => typeof item === "string")) return undefined;
    const report = Array.from(new Set(sections.map(stripAnsi).map((section) => section.trim()).filter(Boolean))).join("\n\n");
    return /硬件质量体检报告|IP质量体检报告|网络质量体检报告/.test(report) ? report : undefined;
  };

  const terminalComponent = document.querySelector<HTMLElement>("#viewport-wrapper > [sections]") as (HTMLElement & {
    __vueParentComponent?: { props?: { sections?: unknown } };
  }) | null;
  const attributeSections = terminalComponent?.getAttribute("sections");
  debug("terminal component", {
    found: Boolean(terminalComponent),
    vueKeys: terminalComponent ? Object.getOwnPropertyNames(terminalComponent).filter((key) => key.startsWith("__vue")) : [],
    sectionsAttributeLength: attributeSections?.length ?? 0,
    sectionsAttributePrefix: attributeSections?.slice(0, 80) ?? "",
    parentComponentFound: Boolean(terminalComponent?.__vueParentComponent),
    sectionsType: typeof terminalComponent?.__vueParentComponent?.props?.sections,
    sectionsCount: Array.isArray(terminalComponent?.__vueParentComponent?.props?.sections) ? terminalComponent.__vueParentComponent.props.sections.length : 0,
  });
  const directReport = fromText(attributeSections) ?? fromSections(terminalComponent?.__vueParentComponent?.props?.sections);
  if (directReport) return directReport;

  const visited = new Set<object>();
  const candidates: string[][] = [];
  const visit = (node: unknown, depth = 0) => {
    if (!node || typeof node !== "object" || visited.has(node) || depth > 10 || visited.size > 8_000) return;
    visited.add(node);
    if (Array.isArray(node) && node.length >= 3 && node.every((item) => typeof item === "string")) {
      const sections = node as string[];
      const text = sections.join("\n");
      if (/硬件质量体检报告|IP质量体检报告|网络质量体检报告/.test(text)) candidates.push(sections);
    }
    for (const key of Object.getOwnPropertyNames(node)) {
      if (key === "parent" || key === "root" || key === "appContext") continue;
      try {
        const child = (node as Record<string, unknown>)[key];
        if (typeof child === "object" && child !== null) visit(child, depth + 1);
      } catch {
        // Vue proxy getters may throw for internal fields; skip those fields.
      }
    }
  };

  const roots = [document.getElementById("app"), document.getElementById("terminal-container")].filter(Boolean) as Array<HTMLElement & Record<string, unknown>>;
  roots.forEach((root) => {
    visit(root);
    Object.getOwnPropertyNames(root)
      .filter((key) => key.startsWith("__vue"))
      .forEach((key) => visit(root[key]));
  });

  const sections = candidates.sort((left, right) => right.join("\n").length - left.join("\n").length)[0];
  debug("Vue sections search", { visited: visited.size, candidates: candidates.length, largestLength: sections?.join("\n").length ?? 0 });
  if (!sections) throw new Error("NodeQuality 未加载完整终端内容");
  const report = fromSections(sections);
  if (!report) throw new Error("页面终端内容为空");
  return report;
}

function loadReportFromClipboard(): Promise<string> {
  return new Promise((resolve, reject) => {
    const copyButton = [...document.querySelectorAll<HTMLButtonElement>(".bench-buttons .button1")]
      .find((button) => button.textContent?.trim() === "复制文本");
    if (!copyButton) return reject(new Error("未找到 NodeQuality 的“复制文本”按钮"));

    const clipboard = navigator.clipboard;
    const originalWriteText = clipboard?.writeText;
    if (!clipboard || !originalWriteText) return reject(new Error("浏览器不支持读取 NodeQuality 复制结果"));

    let captured = false;
    const restore = () => { clipboard.writeText = originalWriteText; };
    clipboard.writeText = function writeText(text: string) {
      if (!captured) {
        captured = true;
        restore();
        const report = String(text).trim();
        report ? resolve(report) : reject(new Error("NodeQuality 未复制出报告文本"));
      }
      return originalWriteText.call(clipboard, text);
    };

    try { copyButton.click(); } catch (error) { restore(); reject(error); }
    window.setTimeout(() => {
      if (!captured) { restore(); reject(new Error("NodeQuality 未在预期时间内生成复制文本")); }
    }, 2000);
  });
}

function loadReport(): Promise<string> {
  if (reportPromise) return reportPromise;
  reportPromise = loadReportFromApi()
    .catch((error) => {
      debug("API fallback", error);
      try {
        const report = loadReportFromPage();
        debug("page data loaded", { length: report.length });
        return report;
      } catch (pageError) {
        debug("page data fallback", pageError);
        return loadReportFromClipboard().catch((clipboardError) => {
          debug("clipboard fallback", clipboardError);
          throw new Error(`读取失败：API ${error instanceof Error ? error.message : String(error)}；页面数据 ${pageError instanceof Error ? pageError.message : String(pageError)}；复制文本 ${clipboardError instanceof Error ? clipboardError.message : String(clipboardError)}`);
        });
      }
    });
  return reportPromise;
}

function reportToken(url = location.href) {
  return new URL(url).pathname.match(/^\/r\/([A-Za-z0-9_-]{16,128})$/)?.[1];
}

function reportCacheKey(token: string) {
  return `${REPORT_CACHE_PREFIX}${token}`;
}

function severityLabel(severity: Severity) {
  return severity === "good" ? "良好" : severity === "risk" ? "谨慎" : "一般";
}

function cardRegion(text: string) {
  if (/欧洲|德国|法国|英国|荷兰|芬兰|瑞典|意大利|西班牙|波兰/.test(text)) return "europe";
  if (/南美|巴西|智利|阿根廷|秘鲁|哥伦比亚/.test(text)) return "south-america";
  if (/澳洲|澳大利亚|新西兰|大洋洲/.test(text)) return "australia";
  if (/美国|加拿大|洛杉矶|西雅图|纽约|北美/.test(text)) return "north-america";
  return "asia";
}

function cardKind(item: UseCaseVerdict) {
  if (item.name === "存储") return item.severity === "risk" ? "spare" : "storage";
  if (item.name === "代理") return item.severity === "risk" ? "spare" : "line";
  if (item.name === "AI / 流媒体") return item.severity === "risk" ? "spare" : "landing";
  return item.severity === "risk" ? "spare" : "machine";
}

function cardImage(item: UseCaseVerdict, reportTitle: string) {
  const region = cardRegion(`${reportTitle} ${item.verdict} ${item.evidence.join(" ")}`);
  const kind = cardKind(item);
  return `https://raw.githubusercontent.com/ruoqianfengshao/nq-reader/main/src/assets/result-card-variants/${region}/${kind}.webp`;
}

function tagClass(tag: string) {
  if (/毕业|顶级|精品|优化|快乐|CN2GIA|CMIN2|线路[机鸡]|落地[机鸡]|解锁|低延迟|大文件|开放|AI可用/.test(tag)) return "good";
  if (/谨慎|异常|送中|不适合|小内存|风险/.test(tag)) return "risk";
  return "watch";
}

function coreTags(item: UseCaseVerdict) {
  const text = `${item.verdict} ${item.evidence.join(" ")}`;
  const tags: string[] = [];
  if (item.name === "代理") {
    if (/CN2GIA|CTGGIA/.test(text)) tags.push("电信CN2GIA");
    if (/9929|10099/.test(text)) tags.push("联通精品线路");
    if (/CMIN2/.test(text)) tags.push("移动CMIN2");
    if (/快乐|顶级|精品/.test(text)) tags.push("线路鸡");
    if (/异常|丢包|ERROR|重传/.test(text)) tags.push("部分方向异常");
  } else if (item.name === "AI / 流媒体") {
    if (/ChatGPT .*=(解锁|受限)/.test(text)) tags.push("AI可用");
    if (/Netflix .*解锁|Disney\+ .*解锁|Youtube .*解锁/.test(text)) tags.push("流媒体解锁");
    if (/送中风险 .*=明显/.test(text)) tags.push("送中风险");
  } else if (item.name === "存储") {
    if (/大盘|硬盘容量 总\s*(\d{3,}|[1-9]\d*\s*T)/.test(text)) tags.push("大盘鸡");
    if (/顺序(读取|写入) .*=(不错|很好|很强|顶级)/.test(text)) tags.push("大文件友好");
    if (/4K .*=(差|偏差)/.test(text)) tags.push("不适合数据库");
  } else {
    if (/CPU|Sysbench/.test(text)) tags.push("轻量建站");
    if (/4K .*=(差|偏差)/.test(text)) tags.push("数据库谨慎");
    if (/内存容量 .*=(小内存|偏小)/.test(text)) tags.push("小内存");
  }
  return Array.from(new Set(tags)).slice(0, 3);
}

function reportRegionTag(report: string, reportTitle: string) {
  const text = report.match(/(?:IP质量体检报告[\s\S]*?)?使用地：\s*([^\n\r]+)/)?.[1] ?? "";
  return locationRegionTag(text);
}

function locationRegionTag(text: string) {
  if (/\[CN\]|中国|大陆|国内/.test(text)) return "中国";
  if (/\[HK\]|香港/.test(text)) return "香港";
  if (/\[JP\]|日本/.test(text)) return "日本";
  if (/\[SG\]|新加坡/.test(text)) return "新加坡";
  if (/\[KR\]|韩国|首尔/.test(text)) return "韩国";
  if (/\[TW\]|台湾|台北/.test(text)) return "台湾";
  if (/\[US\]|美国|洛杉矶|西雅图|纽约/.test(text)) return "美国";
  if (/\[CA\]|加拿大|多伦多|温哥华/.test(text)) return "加拿大";
  if (/\[EU\]|欧洲|德国|法国|英国|荷兰|芬兰|瑞典|意大利|西班牙|波兰/.test(text)) return "欧洲";
  if (/\[AU\]|澳洲|澳大利亚|新西兰/.test(text)) return "澳洲";
  if (/巴西|智利|阿根廷|秘鲁|哥伦比亚/.test(text)) return "南美";
  return "地区未知";
}

function imageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("结论背景图加载失败"));
    image.src = url;
  });
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("结论卡片生成失败")), "image/png"));
}

function reportIp(title: string) {
  return title.match(/(?:报告：\s*)?((?:\d{1,3}|\*)\.(?:\d{1,3}|\*)\.(?:\d{1,3}|\*)\.(?:\d{1,3}|\*))/)?.[1] ?? "IP 未识别";
}

function tagPaint(tag: string) {
  const level = tagClass(tag);
  if (level === "good") return { text: "#82f1bd", fill: "rgba(20, 100, 70, .78)", stroke: "rgba(73, 231, 151, .5)" };
  if (level === "risk") return { text: "#ffabb7", fill: "rgba(110, 35, 51, .78)", stroke: "rgba(255, 111, 132, .52)" };
  return { text: "#ffdc82", fill: "rgba(110, 79, 24, .78)", stroke: "rgba(255, 198, 76, .5)" };
}

function drawTags(context: CanvasRenderingContext2D, tags: string[], y: number, region = "") {
  let x = 64;
  context.font = "700 25px system-ui, sans-serif";
  tags.forEach((tag) => {
    const width = context.measureText(tag).width + 34;
    const colors = tagPaint(tag);
    context.fillStyle = colors.fill;
    context.strokeStyle = colors.stroke;
    context.lineWidth = 2;
    context.beginPath();
    context.roundRect(x, y - 30, width, 44, 22);
    context.fill();
    context.stroke();
    context.fillStyle = colors.text;
    context.fillText(tag, x + 17, y);
    x += width + 12;
  });
  const width = context.measureText(region).width + 34;
  context.fillStyle = "rgba(20, 59, 89, .78)";
  context.strokeStyle = "rgba(102, 190, 255, .52)";
  context.lineWidth = 2;
  context.beginPath();
  context.roundRect(x, y - 30, width, 44, 22);
  context.fill();
  context.stroke();
  context.fillStyle = "#a9d9ff";
  context.fillText(region, x + 17, y);
}

function drawStatus(context: CanvasRenderingContext2D, severity: Severity, x: number, y: number) {
  const label = severityLabel(severity);
  const colors = severity === "good"
    ? { text: "#70f0ba", fill: "rgba(20, 100, 70, .82)", stroke: "rgba(73, 231, 151, .55)" }
    : severity === "risk"
      ? { text: "#ffabb7", fill: "rgba(110, 35, 51, .82)", stroke: "rgba(255, 111, 132, .55)" }
      : { text: "#ffdc82", fill: "rgba(110, 79, 24, .82)", stroke: "rgba(255, 198, 76, .55)" };
  context.font = "700 28px system-ui, sans-serif";
  const width = context.measureText(label).width + 34;
  context.fillStyle = colors.fill;
  context.strokeStyle = colors.stroke;
  context.lineWidth = 2;
  context.beginPath();
  context.roundRect(x, y - 31, width, 42, 21);
  context.fill();
  context.stroke();
  context.fillStyle = colors.text;
  context.fillText(label, x + 17, y);
}

async function copyCardImage(item: UseCaseVerdict, reportTitle: string, region: string, button: HTMLButtonElement) {
  const original = button.textContent;
  try {
    if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") throw new Error("浏览器不支持图片复制");
    const width = 1200;
    const height = 630;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("无法生成结论卡片");
    const image = await imageFromUrl(cardImage(item, reportTitle));
    context.drawImage(image, 0, 0, width, height);
    const overlay = context.createLinearGradient(0, 0, width, 0);
    overlay.addColorStop(0, "rgba(13, 16, 22, .78)");
    overlay.addColorStop(.42, "rgba(13, 16, 22, .5)");
    overlay.addColorStop(1, "rgba(13, 16, 22, .16)");
    context.fillStyle = overlay;
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#6ee7b7";
    context.font = "700 34px system-ui, sans-serif";
    context.fillText("NQ READER", 64, 84);
    const ip = reportIp(reportTitle);
    context.fillStyle = "rgba(232, 242, 238, .82)";
    context.font = "600 26px ui-monospace, SFMono-Regular, Menlo, monospace";
    context.textAlign = "right";
    context.fillText(ip, width - 64, 84);
    context.textAlign = "left";
    context.fillStyle = "#c3d0ca";
    context.font = "400 36px system-ui, sans-serif";
    context.fillText(item.name, 64, 184);
    drawStatus(context, item.severity, 64 + context.measureText(item.name).width + 22, 178);
    context.fillStyle = "#ffffff";
    context.font = "800 72px system-ui, sans-serif";
    const lines = item.verdict.length > 14 ? [item.verdict.slice(0, 14), item.verdict.slice(14)] : [item.verdict];
    lines.forEach((line, index) => context.fillText(line, 64, 286 + index * 86));
    drawTags(context, coreTags(item), 560, region);
    const blob = await canvasBlob(canvas);
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    button.textContent = "已复制";
    button.classList.add("is-copied");
  } catch {
    button.textContent = "复制失败";
    button.classList.add("is-copied");
  }
  window.setTimeout(() => {
    button.textContent = original;
    button.classList.remove("is-copied");
  }, 1600);
}

function summaryCard(item: UseCaseVerdict, reportTitle: string, region: string) {
  const card = document.createElement("article");
  card.className = "nqr-overview-card";
  card.style.backgroundImage = `url("${cardImage(item, reportTitle)}")`;
  card.innerHTML = `<span>${item.name}</span><strong>${item.verdict}</strong>`;
  const tags = document.createElement("div");
  tags.className = "nqr-tags";
  coreTags(item).forEach((tag) => {
    const node = document.createElement("small");
    node.className = `nqr-tag ${tagClass(tag)}`;
    node.textContent = tag;
    tags.append(node);
  });
  const node = document.createElement("small");
  node.className = "nqr-tag nqr-region-tag";
  node.textContent = region;
  tags.append(node);
  const copy = document.createElement("button");
  copy.className = "nqr-card-copy";
  copy.type = "button";
  copy.title = "复制结论卡片";
  copy.setAttribute("aria-label", "复制结论卡片");
  copy.textContent = "⧉";
  copy.addEventListener("click", () => { void copyCardImage(item, reportTitle, region, copy); });
  card.append(tags, copy);
  return card;
}

function detailCard(item: UseCaseVerdict) {
  const card = document.createElement("article");
  card.className = "nqr-detail";
  card.innerHTML = `<div class="nqr-detail-top"><h3>${item.name}</h3><span class="nqr-level nqr-${item.severity}">${severityLabel(item.severity)}</span></div><p class="nqr-detail-verdict">${item.verdict}</p><p class="nqr-detail-reason"></p>`;
  const reason = card.querySelector(".nqr-detail-reason")!;
  if (item.name === "代理") reason.remove();
  else reason.textContent = detailReason(item);
  if (item.name === "代理") card.append(proxyStats(item.evidence));
  if (item.evidence.length > 0) {
    const evidence = document.createElement("details");
    evidence.className = "nqr-evidence";
    evidence.innerHTML = "<summary>查看判断依据</summary>";
    const list = document.createElement("ul");
    item.evidence.forEach((line) => { const row = document.createElement("li"); row.textContent = line; list.append(row); });
    evidence.append(list);
    card.append(evidence);
  }
  return card;
}

function proxyStats(lines: string[]) {
  const pick = (label: string) => lines.filter((line) => line.startsWith(label));
  const grade = (line: string) => line.split("=").at(-1)?.trim() ?? "未识别";
  const compactGrades = (prefix: string, names: string[]) => pick(prefix)
    .map((line, index) => `${names[index] ?? "未知"}${grade(line)}`)
    .join(" / ") || "未识别";
  const statItems = [
    { label: "三网评级", value: compactGrades("电信代理", ["电信"]).replace(/^电信/, "电信") + formatRemainingCarrierGrades(pick("联通代理"), pick("移动代理")), level: "watch" },
    { label: "回程线路", value: compactGrades("电信线路", ["电信"]) + formatRemainingLineGrades(pick("联通线路"), pick("移动线路")), level: "watch" },
    { label: "国内测速", value: pick("国内测速").map((line) => line.replace(/^国内测速\s*/, "").split("=")[0]).join("；") || "未识别", level: "watch" },
    { label: "丢包情况", value: pick("丢包").map((line) => line.replace(/^丢包\s*/, "").split("=")[0]).join("；") || "未识别", level: "watch" },
  ].map((item) => ({ ...item, level: proxyStatLevel(item.value) }));
  const grid = document.createElement("div");
  grid.className = "nqr-proxy-stats";
  statItems.forEach((item) => {
    const stat = document.createElement("div");
    stat.className = `nqr-proxy-stat ${item.level}`;
    const label = document.createElement("span");
    label.className = "nqr-proxy-stat-label";
    label.textContent = item.label;
    const value = document.createElement("strong");
    value.className = "nqr-proxy-stat-value";
    value.textContent = item.value;
    stat.append(label, value);
    grid.append(stat);
  });
  return grid;
}

function formatRemainingCarrierGrades(unicom: string[], mobile: string[]) {
  return `${unicom.map((line) => ` / 联通${line.split("=").at(-1)?.trim() ?? "未识别"}`).join("")}${mobile.map((line) => ` / 移动${line.split("=").at(-1)?.trim() ?? "未识别"}`).join("")}`;
}

function formatRemainingLineGrades(unicom: string[], mobile: string[]) {
  return `${unicom.map((line) => ` / 联通${line.split("=").at(-1)?.trim() ?? "未识别"}`).join("")}${mobile.map((line) => ` / 移动${line.split("=").at(-1)?.trim() ?? "未识别"}`).join("")}`;
}

function proxyStatLevel(value: string): Severity {
  if (/谨慎|异常|ERROR|丢包明显|未识别/.test(value)) return "risk";
  if (/顶级|快乐|精品|无明显|无丢包/.test(value)) return "good";
  return "watch";
}

function detailReason(item: UseCaseVerdict) {
  if (item.name === "代理") {
    return "三网体感、回程档位及测速/丢包告警汇总如下；展开后可查看各运营商和地区的完整判断依据。";
  }
  if (item.name === "建站") {
    return item.severity === "risk"
      ? "轻量服务可酌情使用；数据库等依赖随机读写的负载不建议部署。"
      : "适合轻量建站与常规服务；数据库类负载仍建议核对下方随机读写指标。";
  }
  if (item.name === "存储") {
    return item.severity === "risk"
      ? "不适合作为存储服务盘；容量、顺序读写与随机读写的具体表现见下方依据。"
      : "适合顺序读写类的轻量下载或备份；运行服务前仍建议核对随机读写指标。";
  }
  return item.reason;
}

function renderReport(report: string) {
  const target = document.getElementById(PANEL_ID)!;
  renderReportInto(target, report);
}

function renderNodeSeekReport(report: string) {
  const target = document.getElementById(NODE_SEEK_PANEL_ID)!;
  renderReportInto(target, report);
}

function renderReportInto(target: HTMLElement, report: string) {
  const result = analyzeReport(report);
  const panel = document.createElement("section");
  panel.className = "nqr-panel";
  const ip = reportIp(result.title);
  panel.innerHTML = `<header class="nqr-heading"><div class="nqr-heading-top"><a class="nqr-kicker nqr-heading-link" href="https://nq-reader.cc.cd/" target="_blank" rel="noreferrer">NQ Reader</a><span class="nqr-heading-ip">${ip}</span></div><div class="nqr-heading-bottom"><h2><a href="https://nq-reader.cc.cd/" target="_blank" rel="noreferrer">NQ 报告简单读</a></h2><p class="nqr-heading-description">根据 NodeQuality 报告中的硬件、IP 与网络数据生成；不包含基础指标逐项翻译。</p></div></header>`;
  const overview = document.createElement("div");
  overview.className = "nqr-overview";
  const region = reportRegionTag(report, result.title);
  result.useCases.forEach((item) => overview.append(summaryCard(item, result.title, region)));
  const details = document.createElement("div");
  details.className = "nqr-details";
  result.useCases.forEach((item) => details.append(detailCard(item)));
  panel.append(overview, details);
  target.replaceChildren(panel);
}

function showError(error: unknown) {
  const target = document.getElementById(PANEL_ID);
  if (target) target.innerHTML = `<div class="nqr-error">无法生成 NQ Reader 总结：${error instanceof Error ? error.message : String(error)}</div>`;
}

function setActive(active: boolean) {
  document.getElementById("viewport-wrapper")?.classList.toggle("nq-reader-active", active);
  document.querySelector(".radio-inputs")?.classList.toggle("nq-reader-summary-active", active);
  document.getElementById(TAB_ID)?.closest("label")?.classList.toggle("is-selected", active);
}

function activateSummary(event: Event) {
  setActive(true);
  const target = document.getElementById(PANEL_ID)!;
  if (target.childElementCount > 0) return;
  target.textContent = "正在读取报告并生成总结…";
  loadReport().then(renderReport).catch(showError);
}

function install() {
  const tabList = document.querySelector(".radio-inputs");
  const viewport = document.getElementById("viewport-wrapper");
  if (!tabList || !viewport || document.getElementById(TAB_ID)) return false;
  addStyles();
  const referenceName = tabList.querySelector<HTMLElement>(".radio:last-of-type .name");
  const referenceStyle = referenceName ? getComputedStyle(referenceName) : undefined;
  const label = document.createElement("label");
  label.id = TAB_ID;
  label.className = "radio nq-reader-tab";
  label.style.setProperty("--nqr-tab-width", referenceStyle?.minWidth || "6rem");
  label.style.setProperty("--nqr-tab-height", referenceStyle?.height || "2rem");
  label.innerHTML = `<span class="name" role="tab">NQ Reader 总结</span>`;
  label.querySelector(".name")!.addEventListener("click", activateSummary);
  tabList.append(label);
  const target = document.createElement("section");
  target.id = PANEL_ID;
  viewport.append(target);
  // NodeQuality stops propagation on its own tab clicks, so listen during capture.
  // This only removes our visual mode and leaves the page's Vue handler untouched.
  tabList.addEventListener("click", (event) => {
    if (!(event.target as Element).closest(".nq-reader-tab")) setActive(false);
  }, true);
  return true;
}

async function cacheReportFromNodeQuality() {
  const token = reportToken();
  if (!token) return;
  let lastError: unknown;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const report = loadReportFromPage();
      if (!/网络质量体检报告/.test(report)) throw new Error("NodeQuality 尚未加载完整报告");
      await GM_setValue<CachedReport>(reportCacheKey(token), { report, savedAt: Date.now() });
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => window.setTimeout(resolve, 1_000));
    }
  }
  await GM_setValue<CachedReport>(reportCacheKey(token), {
    error: lastError instanceof Error ? lastError.message : String(lastError),
    savedAt: Date.now(),
  });
}

function nodeSeekReportLink() {
  return document.querySelector<HTMLAnchorElement>("article.post-content a[href*='nodequality.com/r/']");
}

async function loadNodeSeekReport(token: string, reportUrl: string) {
  const target = document.getElementById(NODE_SEEK_PANEL_ID)!;
  const cached = await GM_getValue<CachedReport | null>(reportCacheKey(token), null);
  if (cached?.report && Date.now() - cached.savedAt < REPORT_CACHE_TTL) {
    renderNodeSeekReport(cached.report);
    return;
  }

  target.textContent = "正在读取 NodeQuality 完整报告…";
  await GM_setValue<CachedReport | null>(reportCacheKey(token), null);
  const reportTab = GM_openInTab(reportUrl, { active: false, insert: true, setParent: true });
  const timeout = window.setTimeout(() => {
    target.innerHTML = "<div class=\"nqr-error\">读取 NodeQuality 报告超时，请打开原报告确认它能正常加载。</div>";
  }, 30_000);

  GM_addValueChangeListener<CachedReport | null>(reportCacheKey(token), (_key, _oldValue, value) => {
    if (!value) return;
    window.clearTimeout(timeout);
    if (value.report) {
      reportTab.close();
      renderNodeSeekReport(value.report);
      return;
    }
    target.innerHTML = `<div class="nqr-error">无法读取 NodeQuality 报告：${value.error ?? "未知错误"}</div>`;
  });
}

function installNodeSeek() {
  const content = document.querySelector<HTMLElement>("article.post-content");
  const magicTabs = content?.querySelector<HTMLElement>(".nsk-magic-tabs");
  const reportLink = nodeSeekReportLink();
  if (!content || !magicTabs || !reportLink || document.getElementById(NODE_SEEK_TAB_ID)) return false;

  const token = reportToken(reportLink.href);
  if (!token) return false;
  addStyles();

  const tab = document.createElement("div");
  tab.id = NODE_SEEK_TAB_ID;
  tab.className = "nsk-magic-tab-title nq-reader-nodeseek-tab";
  tab.innerHTML = "<span class=\"emoji\">✨</span>NQ Reader 总结";
  const panel = document.createElement("div");
  panel.id = NODE_SEEK_PANEL_ID;
  panel.className = "nq-reader-nodeseek-panel";
  panel.textContent = "正在读取 NodeQuality 完整报告…";
  tab.addEventListener("click", () => {
    magicTabs.classList.add("nq-reader-nodeseek-active");
    panel.style.display = "block";
    magicTabs.querySelectorAll(".nsk-magic-tab-title").forEach((item) => item.classList.toggle("is-active", item === tab));
  });
  magicTabs.addEventListener("click", (event) => {
    const clickedTab = (event.target as Element).closest(".nsk-magic-tab-title");
    if (!clickedTab || clickedTab === tab) return;
    magicTabs.classList.remove("nq-reader-nodeseek-active");
    panel.style.display = "none";
    tab.classList.remove("is-active");
  });
  magicTabs.append(tab);
  magicTabs.after(panel);
  void loadNodeSeekReport(token, reportLink.href);
  return true;
}

function bootNodeQuality() {
  const observer = new MutationObserver(() => {
    if (install()) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  install();
  void cacheReportFromNodeQuality();
}

function bootNodeSeek() {
  const observer = new MutationObserver(() => {
    if (installNodeSeek()) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  installNodeSeek();
}

if (location.hostname === "nodequality.com") bootNodeQuality();
if (location.hostname === "www.nodeseek.com") bootNodeSeek();
