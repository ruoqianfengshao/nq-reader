import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Bot,
  Check,
  CheckCircle2,
  Copy,
  Cpu,
  Database,
  ExternalLink,
  Gauge,
  Globe2,
  HardDrive,
  HelpCircle,
  FileText,
  LockKeyhole,
  MemoryStick,
  Network,
  RadioTower,
  RefreshCw,
  ScanText,
  ShieldAlert,
  Moon,
  Sun,
  Sparkles,
  Tags,
  Target,
  Tv,
  TriangleAlert,
  X,
  type LucideIcon,
} from "lucide-react";
import { toBlob } from "html-to-image";
import { analyzeReport } from "./analyzer";
import { reportExamples } from "./examples";
import { referenceResources } from "./resources";
import copyHelpImage from "./assets/copy-help.webp";
import asia_landing_v1 from "./assets/result-card-variants/asia/landing.webp";
import asia_landing_v2 from "./assets/result-card-variants/asia/landing.webp";
import asia_graduate_v1 from "./assets/result-card-variants/asia/graduate.webp";
import asia_graduate_v2 from "./assets/result-card-variants/asia/graduate.webp";
import asia_line_v1 from "./assets/result-card-variants/asia/line.webp";
import asia_line_v2 from "./assets/result-card-variants/asia/line.webp";
import asia_machine_v1 from "./assets/result-card-variants/asia/machine.webp";
import asia_machine_v2 from "./assets/result-card-variants/asia/machine.webp";
import asia_spare_v1 from "./assets/result-card-variants/asia/spare.webp";
import asia_spare_v2 from "./assets/result-card-variants/asia/spare.webp";
import asia_storage_v1 from "./assets/result-card-variants/asia/storage.webp";
import asia_storage_v2 from "./assets/result-card-variants/asia/storage.webp";
import australia_landing_v1 from "./assets/result-card-variants/australia/landing.webp";
import australia_landing_v2 from "./assets/result-card-variants/australia/landing.webp";
import australia_graduate_v1 from "./assets/result-card-variants/australia/graduate.webp";
import australia_graduate_v2 from "./assets/result-card-variants/australia/graduate.webp";
import australia_line_v1 from "./assets/result-card-variants/australia/line.webp";
import australia_line_v2 from "./assets/result-card-variants/australia/line.webp";
import australia_machine_v1 from "./assets/result-card-variants/australia/machine.webp";
import australia_machine_v2 from "./assets/result-card-variants/australia/machine.webp";
import australia_spare_v1 from "./assets/result-card-variants/australia/spare.webp";
import australia_spare_v2 from "./assets/result-card-variants/australia/spare.webp";
import australia_storage_v1 from "./assets/result-card-variants/australia/storage.webp";
import australia_storage_v2 from "./assets/result-card-variants/australia/storage.webp";
import europe_landing_v1 from "./assets/result-card-variants/europe/landing.webp";
import europe_landing_v2 from "./assets/result-card-variants/europe/landing.webp";
import europe_graduate_v1 from "./assets/result-card-variants/europe/graduate.webp";
import europe_graduate_v2 from "./assets/result-card-variants/europe/graduate.webp";
import europe_line_v1 from "./assets/result-card-variants/europe/line.webp";
import europe_line_v2 from "./assets/result-card-variants/europe/line.webp";
import europe_machine_v1 from "./assets/result-card-variants/europe/machine.webp";
import europe_machine_v2 from "./assets/result-card-variants/europe/machine.webp";
import europe_spare_v1 from "./assets/result-card-variants/europe/spare.webp";
import europe_spare_v2 from "./assets/result-card-variants/europe/spare.webp";
import europe_storage_v1 from "./assets/result-card-variants/europe/storage.webp";
import europe_storage_v2 from "./assets/result-card-variants/europe/storage.webp";
import northamerica_landing_v1 from "./assets/result-card-variants/north-america/landing.webp";
import northamerica_landing_v2 from "./assets/result-card-variants/north-america/landing.webp";
import northamerica_graduate_v1 from "./assets/result-card-variants/north-america/graduate.webp";
import northamerica_graduate_v2 from "./assets/result-card-variants/north-america/graduate.webp";
import northamerica_line_v1 from "./assets/result-card-variants/north-america/line.webp";
import northamerica_line_v2 from "./assets/result-card-variants/north-america/line.webp";
import northamerica_machine_v1 from "./assets/result-card-variants/north-america/machine.webp";
import northamerica_machine_v2 from "./assets/result-card-variants/north-america/machine.webp";
import northamerica_spare_v1 from "./assets/result-card-variants/north-america/spare.webp";
import northamerica_spare_v2 from "./assets/result-card-variants/north-america/spare.webp";
import northamerica_storage_v1 from "./assets/result-card-variants/north-america/storage.webp";
import northamerica_storage_v2 from "./assets/result-card-variants/north-america/storage.webp";
import southamerica_landing_v1 from "./assets/result-card-variants/south-america/landing.webp";
import southamerica_landing_v2 from "./assets/result-card-variants/south-america/landing.webp";
import southamerica_graduate_v1 from "./assets/result-card-variants/south-america/graduate.webp";
import southamerica_graduate_v2 from "./assets/result-card-variants/south-america/graduate.webp";
import southamerica_line_v1 from "./assets/result-card-variants/south-america/line.webp";
import southamerica_line_v2 from "./assets/result-card-variants/south-america/line.webp";
import southamerica_machine_v1 from "./assets/result-card-variants/south-america/machine.webp";
import southamerica_machine_v2 from "./assets/result-card-variants/south-america/machine.webp";
import southamerica_spare_v1 from "./assets/result-card-variants/south-america/spare.webp";
import southamerica_spare_v2 from "./assets/result-card-variants/south-america/spare.webp";
import southamerica_storage_v1 from "./assets/result-card-variants/south-america/storage.webp";
import southamerica_storage_v2 from "./assets/result-card-variants/south-america/storage.webp";

function App() {
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [showCopyHelp, setShowCopyHelp] = useState(false);
  const [showReparse, setShowReparse] = useState(false);
  const [showResources, setShowResources] = useState(false);
  const result = useMemo(() => analyzeReport(submitted), [submitted]);

  const hasInput = input.trim().length > 0;
  const hasReport = submitted.trim().length > 0;

  useEffect(() => {
    if (!showResources) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowResources(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [showResources]);

  function analyzeInput() {
    const nextReport = input.trim();
    if (!nextReport) return;

    setSubmitted(nextReport);
    setShowReparse(false);
    requestAnimationFrame(() => {
      document.querySelector(".report-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function openReparse() {
    setInput("");
    setShowReparse(true);
  }

  function cancelReparse() {
    setInput("");
    setShowReparse(false);
  }

  function analyzeExample(report: string) {
    setInput("");
    setSubmitted(report);
    setShowReparse(false);
    requestAnimationFrame(() => {
      document.querySelector(".report-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function scrollToReason(name: string) {
    document.getElementById(useCaseTargetId(name))?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function returnHome() {
    setInput("");
    setSubmitted("");
    setShowReparse(false);
    setShowResources(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className={`app-shell theme-${theme}`}>
      <nav className="topnav">
        <div className="nav-inner">
          <button className="brand-mark" type="button" onClick={returnHome} aria-label="返回首页">
            <ScanText size={18} />
            <span>NQ Reader</span>
          </button>
          <div className="nav-copy">
            <span className="nav-description">NodeQuantity report reader</span>
            <button
              className={`resource-trigger ${hasReport ? "" : "is-home"}`}
              type="button"
              aria-label="打开参考资料"
              title="参考资料"
              aria-expanded={showResources}
              onClick={() => setShowResources(true)}
            >
              <BookOpen size={18} />
            </button>
            <a
              className="github-link"
              href="https://github.com/ruoqianfengshao/nq-reader"
              target="_blank"
              rel="noreferrer"
              aria-label="在 GitHub 查看 NQ Reader"
              title="GitHub"
            >
              <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M10.226 17.284c-2.965-.36-5.054-2.493-5.054-5.256 0-1.123.404-2.336 1.078-3.144-.292-.741-.247-2.314.09-2.965.898-.112 2.111.36 2.83 1.01.853-.269 1.752-.404 2.853-.404 1.1 0 1.999.135 2.807.382.696-.629 1.932-1.1 2.83-.988.315.606.36 2.179.067 2.942.72.854 1.101 2 1.101 3.167 0 2.763-2.089 4.852-5.098 5.234.763.494 1.28 1.572 1.28 2.807v2.336c0 .674.561 1.056 1.235.786 4.066-1.55 7.255-5.615 7.255-10.646C23.5 6.188 18.334 1 11.978 1 5.62 1 .5 6.188.5 12.545c0 4.986 3.167 9.12 7.435 10.669.606.225 1.19-.18 1.19-.786V20.63a2.9 2.9 0 0 1-1.078.224c-1.483 0-2.359-.808-2.987-2.313-.247-.607-.517-.966-1.034-1.033-.27-.023-.359-.135-.359-.27 0-.27.45-.471.898-.471.652 0 1.213.404 1.797 1.235.45.651.921.943 1.483.943.561 0 .92-.202 1.437-.719.382-.381.674-.718.944-.943" />
              </svg>
            </a>
            <a
              className="userscript-link"
              href="https://github.com/ruoqianfengshao/nq-reader/releases/latest/download/nq-reader.user.js"
              target="_blank"
              rel="noreferrer"
              aria-label="安装 NQ Reader 油猴脚本"
              title="安装油猴脚本"
            >
              <span className="tampermonkey-mark" aria-hidden="true" />
            </a>
            <button
              className="theme-switch"
              type="button"
              role="switch"
              aria-checked={theme === "dark"}
              aria-label="切换主题"
              onClick={() => setTheme((value) => (value === "light" ? "dark" : "light"))}
            >
              <Sun size={14} />
              <span />
              <Moon size={14} />
            </button>
          </div>
        </div>
      </nav>

      <section className={`tool-desktop ${hasReport ? "has-report" : ""}`}>
        {!hasReport ? (
            <div className="entry-stage">
              <div className="entry-copy">
                <p className="panel-kicker">NodeQuality report reader</p>
                <h1>NQ 简单读</h1>
                <p>分析 NodeQuality 报告，得到简单结论</p>
              </div>

            <div className="entry-box">
              <div className="source-pill">
                <FileText size={15} />
                <span>Markdown</span>
              </div>
              <textarea
                className="report-input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                    event.preventDefault();
                    analyzeInput();
                  }
                }}
                placeholder="粘贴 NodeQuality 报告 markdown（暂不支持链接）"
                spellCheck={false}
              />
              <div className="button-row">
                <button className="help-button" type="button" onClick={() => setShowCopyHelp(true)} aria-haspopup="dialog" aria-expanded={showCopyHelp}>
                  <HelpCircle size={16} />
                  复制帮助
                </button>
                <button className="primary-button" type="button" onClick={analyzeInput} disabled={!hasInput}>
                  <Sparkles size={17} />
                  解读报告
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
            <ReportExamples onSelect={analyzeExample} />
            <HomeReferences />
            {showCopyHelp && (
              <div className="help-overlay" role="presentation" onClick={() => setShowCopyHelp(false)}>
                <section className="help-dialog" role="dialog" aria-modal="true" aria-label="复制帮助" onClick={(event) => event.stopPropagation()}>
                  <div className="help-dialog-heading">
                    <div>
                      <span>复制帮助</span>
                      <strong>在 NodeQuality 页面点击“复制文本”</strong>
                    </div>
                    <button className="icon-button" type="button" aria-label="关闭复制帮助" onClick={() => setShowCopyHelp(false)}>
                      <X size={17} />
                    </button>
                  </div>
                  <img src={copyHelpImage} alt="NodeQuality 页面复制文本按钮位置示意" />
                </section>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="report-result">
              <section className={`reparse-panel ${showReparse ? "is-open" : ""}`} aria-label="更换 NQ 报告">
                <div className="reparse-toolbar">
                  <div className="reparse-meta">
                    <div>
                      <span>当前报告</span>
                      <strong>{maskedReportIp(result.title)}</strong>
                    </div>
                    <div>
                      <span>报告时间</span>
                      <strong>{reportTime(result.title)}</strong>
                    </div>
                  </div>
                  {!showReparse && (
                    <button className="ghost-button reparse-trigger" type="button" onClick={openReparse} aria-expanded={false}>
                      <RefreshCw size={16} />
                      换一份 NQ
                    </button>
                  )}
                </div>

                {showReparse && (
                  <div className="reparse-editor">
                    <textarea
                      className="report-input"
                      autoFocus
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      onKeyDown={(event) => {
                        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                          event.preventDefault();
                          analyzeInput();
                        }
                      }}
                      placeholder="粘贴另一份 NodeQuality 报告 markdown"
                      spellCheck={false}
                    />
                    <div className="reparse-actions">
                      <button className="ghost-button" type="button" onClick={cancelReparse}>取消</button>
                      <button className="primary-button" type="button" onClick={analyzeInput} disabled={!hasInput}>
                        <Sparkles size={17} />
                        重新解析
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </section>

              <ShareResultCards
                ip={maskedReportIp(result.title)}
                result={result}
              />

              {result.useCases.length > 0 && (
                <section className="result-block conclusion-block">
                  <div className="section-heading">
                    <h2>结果判断</h2>
                    <p>按真实使用场景拆开看，先看能不能用，再看哪里值得用。</p>
                  </div>
                  <div className="use-case-grid primary-use-cases">
                  {result.useCases.map((useCase) => (
                    <button className={`use-case-card ${useCase.severity}`} key={useCase.name} type="button" onClick={() => scrollToReason(useCase.name)}>
                      <span>{useCase.name}</span>
                      <strong>{useCase.verdict}</strong>
                      <div className="use-case-tags">
                        {useCaseTags(result, useCase).slice(0, 3).map((tag) => (
                          <small className={tagClass(tag)} key={tag}>{tag}</small>
                        ))}
                      </div>
                    </button>
                  ))}
                  </div>
                </section>
              )}

              {result.useCases.length > 0 && (
                <section className="result-block">
                  <div className="section-heading">
                    <h2>结论明细</h2>
                    <p>每条结论都对应可追溯的指标，避免只给一句空泛评价。</p>
                  </div>
                  <div className="conclusion-list">
                    {result.useCases.map((useCase) => (
                      <article className={`conclusion-card ${useCase.severity}`} id={useCaseTargetId(useCase.name)} key={`reason-${useCase.name}`}>
                        <div className="module-card-heading">
                          <div>
                            <h3>{useCase.name}</h3>
                          </div>
                        </div>
                        <TagRail tags={useCaseTags(result, useCase)} />
                        <ReasonSummary useCaseName={useCase.name} verdict={useCase.verdict} reason={useCase.reason} severity={useCase.severity} />
                        {useCase.evidence.length > 0 && (
                          <EvidenceList items={useCase.evidence} useCaseName={useCase.name} />
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {result.modules.length > 0 && (
                <section className="result-block basic-info-block">
                  <div className="section-heading">
                    <h2>基础信息翻译</h2>
                    <p>逐项翻译 NQ 报告中的指标，尽量给出好理解的评价。</p>
                  </div>
                  <div className="module-list">
                    {result.modules.map((module) => (
                      <article className={`module-card ${module.severity}`} key={module.title}>
                        <div className="module-card-heading">
                          <span className={`module-icon ${module.severity}`}>
                            {renderModuleIcon(module.title)}
                          </span>
                          <div>
                            <div className="module-title-row">
                              <h3>{module.title}</h3>
                              <small className={`module-status ${module.severity}`}>{moduleStatusLabel(module.severity)}</small>
                            </div>
                            <p>{module.summary}</p>
                          </div>
                        </div>
                        <div className="module-summary">
                          <div>
                            <span>结论</span>
                            <strong>{module.verdict}</strong>
                          </div>
                          <div>
                            <span>怎么看</span>
                            <p>{module.whyItMatters}</p>
                          </div>
                        </div>
                        {module.items.length > 0 && (
                          <div className="module-items">
                            {module.items.map((item) => (
                              <div className={`module-item ${item.severity}`} key={`${module.title}-${item.label}-${item.value}`}>
                                {renderMetricIcon(item.label)}
                                <div>
                                  <span>{item.label}</span>
                                  <b>{item.value}</b>
                                  {renderGradeStamp(item.label, item.grade)}
                                  <p>{item.note.replace(`${item.grade}：`, "")}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              )}

            </div>
            <ReferencePanel className="reference-panel-fixed" />
          </>
        )}
      </section>
      {showResources && (
        <div className="resource-overlay" role="presentation" onClick={() => setShowResources(false)}>
          <aside className="resource-drawer" role="dialog" aria-modal="true" aria-label="参考资料" onClick={(event) => event.stopPropagation()}>
            <div className="resource-drawer-heading">
              <strong>参考资料</strong>
              <button className="icon-button" type="button" aria-label="关闭参考资料" onClick={() => setShowResources(false)}>
                <X size={18} />
              </button>
            </div>
            <ReferenceLinks onNavigate={() => setShowResources(false)} />
          </aside>
        </div>
      )}
    </main>
  );
}

function HomeReferences() {
  return (
    <section className="home-references" aria-labelledby="home-reference-title">
      <div className="example-heading">
        <h2 id="home-reference-title">参考资料</h2>
        <span>进一步了解 NQ 指标与线路判断</span>
      </div>
      <ReferenceLinks />
    </section>
  );
}

function ReferencePanel({ className }: { className: string }) {
  return (
    <aside className={className} aria-label="参考资料">
      <strong>参考资料</strong>
      <ReferenceLinks />
    </aside>
  );
}

function ReferenceLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="reference-links">
      {referenceResources.map((resource) => (
        <a href={resource.url} target="_blank" rel="noreferrer" key={resource.url} onClick={onNavigate}>
          <img src={resource.icon} alt="" width="18" height="18" />
          <span>
            <small>{resource.source}</small>
            {resource.title}
          </span>
          <ExternalLink size={14} />
        </a>
      ))}
    </nav>
  );
}

function ReportExamples({ onSelect }: { onSelect: (report: string) => void }) {
  return (
    <section className="example-section" aria-label="NQ 报告示例">
      <div className="example-heading">
        <h2>示例</h2>
        <span>点击直接查看解析结果</span>
      </div>
      <div className="example-grid">
        {reportExamples.map((example) => {
          const result = analyzeReport(example.report);
          const tags = homepageExampleTags(result.useCases);
          return (
            <button className="example-card" style={{ backgroundImage: `url(${example.background})` }} type="button" key={example.name} onClick={() => onSelect(example.report)}>
              <strong>{example.name}</strong>
              <span>{reportLocation(result)}</span>
              <div>
                {tags.map((tag) => <small className={tagClass(tag)} key={tag}>{tag}</small>)}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function homepageExampleTags(useCases: ReturnType<typeof analyzeReport>["useCases"]): string[] {
  const qualityOrder = { good: 0, watch: 1, risk: 2 } as const;
  const candidates = useCases.flatMap((useCase, useCaseIndex) =>
    semanticTags(useCase.name, useCase.verdict, useCase.evidence).map((tag, tagIndex) => ({
      quality: tagClass(tag) as keyof typeof qualityOrder,
      tag,
      tagIndex,
      useCaseIndex,
    })),
  ).sort((left, right) =>
    qualityOrder[left.quality] - qualityOrder[right.quality] ||
    left.useCaseIndex - right.useCaseIndex ||
    left.tagIndex - right.tagIndex,
  );

  const first = candidates[0];
  if (!first) return [];

  const fromNextConclusion = first.quality === "good"
    ? candidates.find((candidate) =>
      candidate.quality === "good" &&
      candidate.useCaseIndex !== first.useCaseIndex &&
      candidate.tag !== first.tag)
    : undefined;
  const second = fromNextConclusion ?? candidates.find((candidate) => candidate.tag !== first.tag);
  return second ? [first.tag, second.tag] : [first.tag];
}

function reportLocation(result: ReturnType<typeof analyzeReport>): string {
  const location = result.modules.flatMap((module) => module.items).find((item) => item.label === "IP 使用地")?.value ?? "地区待确认";
  return location.replace(/\[[A-Z]{2}\]/g, "").replace(/,.*/, "").trim();
}

function renderModuleIcon(title: string) {
  const Icon = title.includes("CPU") ? Cpu :
    title.includes("内存") ? MemoryStick :
    title.includes("磁盘") ? HardDrive :
    title.includes("IP") ? ShieldAlert :
    title.includes("网络") ? Network :
    Globe2;
  return <Icon size={18} />;
}

function renderMetricIcon(label: string) {
  const Icon = evidenceIcon(label);
  return <Icon size={16} />;
}

function moduleStatusLabel(severity: string): string {
  if (severity === "good") return "表现好";
  if (severity === "risk") return "需注意";
  return "可参考";
}

function ReasonSummary({ useCaseName, verdict, reason, severity }: { useCaseName: string; verdict: string; reason: string; severity: string }) {
  const blocks = reasonBlocks(useCaseName, verdict, reason);
  return (
    <div className="reason-grid">
      {blocks.map((block) => {
        const Icon = block.icon;
        return (
          <div className={`reason-tile ${severity}`} key={block.label}>
            <Icon size={16} />
            <span>{block.label}</span>
            <strong>{block.value}</strong>
          </div>
        );
      })}
    </div>
  );
}

function reasonBlocks(useCaseName: string, verdict: string, reason: string): Array<{ label: string; value: string; icon: LucideIcon }> {
  if (useCaseName === "建站") {
    return [
      { label: "结论", value: verdict, icon: CheckCircle2 },
      { label: "核心指标", value: "CPU / 内存 / 4K I/O", icon: Cpu },
      { label: "判断逻辑", value: "动态站和数据库优先看响应能力", icon: Target },
    ];
  }
  if (useCaseName === "代理") {
    return [
      { label: "结论", value: verdict, icon: CheckCircle2 },
      { label: "核心指标", value: "运营商线路 / 地区延迟 / 测速异常", icon: RadioTower },
      { label: "判断逻辑", value: "按电信、联通、移动分别评估", icon: Network },
    ];
  }
  if (useCaseName === "存储") {
    return [
      { label: "结论", value: verdict, icon: CheckCircle2 },
      { label: "核心指标", value: "容量 / 顺序读写 / 网络吞吐", icon: HardDrive },
      { label: "判断逻辑", value: "大文件看吞吐，小文件看 4K", icon: Database },
    ];
  }
  return [
    { label: "结论", value: verdict, icon: CheckCircle2 },
    { label: "核心指标", value: "解锁 / 风控 / 送中风险", icon: Tv },
    { label: "判断逻辑", value: reason.includes("送中") ? "解锁成功也要看地区库是否判 CN" : "平台可用性和账号风控分开看", icon: ShieldAlert },
  ];
}

function EvidenceList({ items, useCaseName }: { items: string[]; useCaseName: string }) {
  if (useCaseName === "代理") {
    const carrierItems = items.filter((item) => /^(电信|联通|移动)代理 /.test(item));
    const regionItems = items.filter((item) => /^(电信|联通|移动)地区 /.test(item));
    const otherItems = items.filter((item) => !carrierItems.includes(item) && !regionItems.includes(item));
    return (
      <div className="evidence-stack">
        {carrierItems.length > 0 && (
          <div className="route-panel">
            {carrierItems.map((item) => (
              <RouteEvidence item={item} key={item} />
            ))}
          </div>
        )}
        {regionItems.length > 0 && <RegionFallback items={regionItems} />}
        {otherItems.length > 0 && <GenericEvidenceGrid items={otherItems} />}
      </div>
    );
  }
  if (useCaseName === "AI / 流媒体") {
    return <MediaEvidence items={items} />;
  }
  return <GenericEvidenceGrid items={items} />;
}

function RouteEvidence({ item }: { item: string }) {
  const carrier = item.match(/^(电信|联通|移动)代理/)?.[1] ?? "线路";
  const grade = item.match(/=([^=]+)$/)?.[1] ?? "判断";
  const body = item.replace(/^(电信|联通|移动)代理\s*/, "").replace(/=[^=]+$/, "");
  const parts = body.split("；").filter(Boolean);
  return (
    <div className={`route-row ${gradeClass(grade)}`}>
      <div className="route-carrier">
        <RadioTower size={16} />
        <strong>{carrier}</strong>
        <span>{grade}</span>
      </div>
      <div className="route-facts">
        {parts.map((part) => (
          <p key={part}>{part}</p>
        ))}
      </div>
    </div>
  );
}

function RegionFallback({ items }: { items: string[] }) {
  return (
    <div className="region-panel">
      <div className="latency-legend">
        <span><i className="good" />稳定低延迟</span>
        <span><i className="watch" />一般丢包 / 波动</span>
        <span><i className="risk" />严重丢包</span>
        <small>数字是 TCP 大包延迟，单位 ms；颜色来自 NQ 的三网大包延迟图形。</small>
      </div>
      {items.map((item) => (
        <RegionEvidence item={item} key={item} />
      ))}
    </div>
  );
}

function RegionEvidence({ item }: { item: string }) {
  const carrier = item.match(/^(电信|联通|移动)地区/)?.[1] ?? "地区";
  const grade = item.match(/=([^=]+)$/)?.[1] ?? "判断";
  const body = item.replace(/^(电信|联通|移动)地区\s*/, "").replace(/=[^=]+$/, "");
  const [main, caveatText = ""] = body.split("；");
  const groups = regionGroups(main, caveatText);
  return (
    <div className={`region-row ${gradeClass(grade)}`}>
      <div className="region-carrier">
        <Network size={16} />
        <strong>{carrier}</strong>
        <span>{grade}</span>
      </div>
      <div className="region-groups">
        {groups.map((group) => (
          <div className={`region-group ${group.severity}`} key={group.label}>
            <span>{group.label}</span>
            <div>
              {group.values.map((value) => (
                <b key={`${group.label}-${value}`}>{value}</b>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function regionGroups(main: string, caveatText: string): Array<{ label: string; values: string[]; severity: string }> {
  const groups: Array<{ label: string; values: string[]; severity: string }> = [];
  if (/未识别/.test(main)) {
    groups.push({ label: "稳定低延迟", values: ["未识别"], severity: "neutral" });
  } else {
    groups.push({ label: "稳定低延迟", values: splitRegionValues(main), severity: "good" });
  }

  caveatText.split("，").filter(Boolean).forEach((part) => {
    if (part.startsWith("严重丢包")) {
      groups.push({ label: "严重丢包", values: splitRegionValues(part.replace("严重丢包", "")), severity: "risk" });
      return;
    }
    if (part.startsWith("一般丢包")) {
      groups.push({ label: "一般丢包", values: splitRegionValues(part.replace("一般丢包", "")), severity: "watch" });
      return;
    }
    if (/测速异常/.test(part)) {
      groups.push({ label: "测速异常", values: ["国内测速"], severity: "risk" });
      return;
    }
    if (/绕路/.test(part)) {
      groups.push({ label: "回程绕路", values: ["路径差"], severity: "risk" });
      return;
    }
    if (/线路混合/.test(part)) {
      groups.push({ label: "线路混合", values: ["需按地区看"], severity: "watch" });
    }
  });

  return groups.filter((group) => group.values.length > 0);
}

function splitRegionValues(value: string): string[] {
  return value.split("、").map((item) => item.trim()).filter(Boolean).slice(0, 6);
}

function MediaEvidence({ items }: { items: string[] }) {
  const serviceItems = items.filter((item) => mediaService(item));
  const otherItems = items.filter((item) => !mediaService(item));
  return (
    <div className="evidence-stack">
      {serviceItems.length > 0 && (
        <div className="service-grid">
          {serviceItems.map((item) => {
            const service = mediaService(item) ?? "服务";
            const grade = item.match(/=([^=]+)$/)?.[1] ?? "";
            const value = item.replace(service, "").replace(/=[^=]+$/, "").trim();
            return (
              <div className={`service-pill ${gradeClass(grade)}`} key={item}>
                <span>{serviceIcon(service)}</span>
                <div>
                  <strong>{service}</strong>
                  <p>{value || grade}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {otherItems.length > 0 && <GenericEvidenceGrid items={otherItems} />}
    </div>
  );
}

function GenericEvidenceGrid({ items }: { items: string[] }) {
  return (
    <div className="evidence-list">
      {items.map((item) => {
        const Icon = evidenceIcon(item);
        const grade = item.match(/=([^=]+)$/)?.[1];
        const text = grade ? item.replace(/=[^=]+$/, "") : item;
        const { label, value } = splitEvidenceText(text);
        const standard = standardGrade(grade);
        return (
          <span className={`evidence-item ${standard?.severity ?? ""}`} key={item}>
            <Icon size={15} />
            <span className="evidence-item-content">
              <b className="evidence-label">{label}</b>
              <span className="evidence-value-row">
                <strong>{value}</strong>
                {standard && <small>{standard.label}</small>}
              </span>
            </span>
          </span>
        );
      })}
    </div>
  );
}

const evidenceLabels = [
  "Sysbench 单核", "内存容量", "内存读取", "内存写入", "内存延迟",
  "硬盘容量", "4K 随机读", "4K 随机写", "4K 读取 IOPS", "4K 写入 IOPS",
  "顺序读取", "顺序写入", "IP 使用地", "IP 注册地", "IP 类型识别", "IP 类型",
  "送中风险", "黑名单", "25 端口", "国内测速", "国际互连", "三网回程",
  "回程路径", "丢包", "TCP 延迟", "虚拟化", "架构", "系统负载", "L3 缓存",
].sort((left, right) => right.length - left.length);

function splitEvidenceText(text: string): { label: string; value: string } {
  const label = evidenceLabels.find((candidate) => text.startsWith(`${candidate} `));
  if (label) return { label, value: text.slice(label.length).trim() };

  const boundary = text.indexOf(" ");
  if (boundary < 0) return { label: text, value: "-" };
  return { label: text.slice(0, boundary), value: text.slice(boundary + 1).trim() };
}

function standardGrade(grade?: string): { label: "良好" | "一般" | "较差"; severity: "good" | "watch" | "risk" } | undefined {
  if (!grade) return undefined;
  const severity = /谨慎|风险|异常|失败|不可用|阻断|很差|较差|偏差|偏慢|明显|多库命中|命中|老 CPU|很小|偏高|普通\/绕路/.test(grade)
    ? "risk"
    : /顶级|高端服务器|快乐|解锁|干净|低风险|低命中|较好|正常|支持|开放|够用|充足|不错|很好|很强|优质|稳定|无丢包|路径直接|绿色稳定|KVM|兼容性好/.test(grade)
      ? "good"
      : "watch";
  return {
    label: severity === "good" ? "良好" : severity === "risk" ? "较差" : "一般",
    severity,
  };
}

function evidenceIcon(item: string): LucideIcon {
  if (/CPU|Sysbench|AES|AVX|L3/.test(item)) return Cpu;
  if (/内存|Memory/.test(item)) return MemoryStick;
  if (/磁盘|硬盘|4K|IOPS|顺序|容量/.test(item)) return HardDrive;
  if (/网络|三网|回程|测速|延迟|互连|路径|电信|联通|移动/.test(item)) return Network;
  if (/IP|风控|风险|送中|黑名单|广播|注册地|使用地/.test(item)) return ShieldAlert;
  if (/ChatGPT|AI|OpenAI/.test(item)) return Bot;
  if (/Netflix|Disney|TikTok|Youtube|Amazon|Reddit/.test(item)) return Tv;
  if (/端口|NAT/.test(item)) return LockKeyhole;
  if (/带宽|Mbps|下载|上传/.test(item)) return Gauge;
  if (/数据库|Database/.test(item)) return Database;
  return Globe2;
}

function mediaService(item: string): string | undefined {
  return ["ChatGPT", "TikTok", "Disney+", "Netflix", "Youtube", "AmazonPV", "Reddit"].find((service) => item.startsWith(service));
}

function serviceIcon(service: string): string {
  if (service === "Netflix") return "N";
  if (service === "Disney+") return "D+";
  if (service === "TikTok") return "♪";
  if (service === "Youtube") return "▶";
  if (service === "AmazonPV") return "PV";
  if (service === "ChatGPT") return "AI";
  if (service === "Reddit") return "R";
  return "S";
}

function gradeClass(grade: string): string {
  if (/顶级|快乐|解锁|干净|低|较好|正常|支持|开放|够用|不错|很好|可读/.test(grade)) return "good";
  if (/谨慎|风险|异常|失败|不可用|阻断|差|偏差|明显/.test(grade)) return "risk";
  return "watch";
}

function gradeStampClass(grade: string): string {
  if (/顶级|快乐|解锁|干净|低风险|低命中|较好|正常|支持|开放|够用|不错|很好|很强|优质|稳定/.test(grade)) return "good";
  if (/谨慎|风险|异常|失败|不可用|阻断|很差|差|偏差|偏慢|明显|多库命中/.test(grade)) return "risk";
  if (/一般|普通|待确认|受限|混合|中等|少量命中|小内存|偏小|有波动|可读|单点|地区信息|注册信息/.test(grade)) return "watch";
  return "neutral";
}

function renderGradeStamp(label: string, grade?: string) {
  if (!shouldShowGradeStamp(label, grade)) return null;
  const visibleGrade = grade ?? "";
  return <small className={`grade-stamp ${gradeStampClass(visibleGrade)}`}>{visibleGrade}</small>;
}

function shouldShowGradeStamp(label: string, grade?: string): boolean {
  if (!grade) return false;
  if (/虚拟化|架构|IP 使用地|网络地区|IP 注册地|IP 类型|NAT 类型|25 端口/.test(label)) return false;
  return !/地区信息|注册信息|KVM|兼容性好|广播 IP|开放|受限/.test(grade);
}

function TagRail({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <div className="tag-rail">
      <Tags size={15} />
      {tags.map((tag) => (
        <span className={tagClass(tag)} key={tag}>{tag}</span>
      ))}
    </div>
  );
}

function ShareResultCards({ ip, result }: { ip: string; result: ReturnType<typeof analyzeReport> }) {
  if (result.useCases.length === 0) {
    return <ShareResultCard ip={ip} result={result} title="NQ 报告" tags={["一般"]} region={reportRegionTag(result)} />;
  }
  return (
    <section className="share-card-strip" aria-label="分享结论卡片">
      {result.useCases.map((useCase) => (
        <ShareResultCard
          ip={ip}
          key={useCase.name}
          name={useCase.name}
          result={result}
          title={useCase.verdict}
          tags={shareTagsForUseCase(result, useCase).slice(0, 5)}
          region={reportRegionTag(result)}
        />
      ))}
    </section>
  );
}

function ShareResultCard({ ip, name = "NQ", result, title, tags, region }: { ip: string; name?: string; result: ReturnType<typeof analyzeReport>; title: string; tags: string[]; region?: string }) {
  const background = posterCard(result, name, title, tags);
  const cardRef = useRef<HTMLElement>(null);
  const [copyState, setCopyState] = useState<"idle" | "copying" | "copied" | "error">("idle");

  async function copyPoster() {
    if (!cardRef.current || copyState === "copying") return;

    setCopyState("copying");
    try {
      if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
        throw new Error("Image clipboard is not supported");
      }
      const blob = await toBlob(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        filter: (node) => !(node instanceof HTMLElement && node.dataset.posterControl === "true"),
      });
      if (!blob) throw new Error("Poster rendering failed");

      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 2400);
    }
  }

  const copyLabel = copyState === "copied" ? "海报已复制" : copyState === "error" ? "复制失败" : "复制海报";
  const CopyIcon = copyState === "copied" ? Check : copyState === "error" ? TriangleAlert : Copy;

  return (
    <section className="share-card" ref={cardRef} style={{ backgroundImage: `url(${background})` }}>
      <div className="share-card-shade" />
      <button
        className={`share-card-copy ${copyState}`}
        type="button"
        data-poster-control="true"
        aria-label={copyLabel}
        title={copyLabel}
        onClick={copyPoster}
        disabled={copyState === "copying"}
      >
        <CopyIcon size={17} />
      </button>
      <div className="share-card-content">
        <div className="share-card-topline">
          <span>NQ Reader</span>
          <b>{name}</b>
        </div>
        <h1>{formatShareTitle(title)}</h1>
        <div className="share-card-bottom">
          <div className="share-card-tags">
            {tags.map((tag) => (
              <span className={tagClass(tag)} key={tag}>{tag}</span>
            ))}
          </div>
          <strong className="share-card-ip">{ip}{region && <em>· {region}</em>}</strong>
        </div>
      </div>
    </section>
  );
}

function formatShareTitle(title: string): string {
  return title.replace(/，/g, "\n");
}

function useCaseTags(result: ReturnType<typeof analyzeReport>, useCase: ReturnType<typeof analyzeReport>["useCases"][number]): string[] {
  return compactTags([
    ...semanticTags(useCase.name, useCase.verdict, useCase.evidence),
  ]);
}

function shareTagsForUseCase(result: ReturnType<typeof analyzeReport>, useCase: ReturnType<typeof analyzeReport>["useCases"][number]): string[] {
  if (useCase.name === "代理" && /备用[机鸡]/.test(useCase.verdict)) {
    const regions = proxyGoodRegionTags(useCase.evidence);
    return compactTags([...(regions.length > 0 ? ["谨慎", ...regions] : ["谨慎", "线路待确认"])]).slice(0, 3);
  }
  const tags = compactTags([
    verdictGrade(useCase.name, useCase.verdict, useCase.severity),
    ...semanticTags(useCase.name, useCase.verdict, useCase.evidence),
  ]);
  if (useCase.name !== "代理") return tags;

  const ordered = tags.includes("线路鸡") ? ["线路鸡", ...tags.filter((tag) => tag !== "线路鸡")] : tags;
  if (!ordered.some((tag) => /^(顶级|精品)线路$|^三网CN2GIA$/.test(tag))) return ordered;

  const hasCarrierHappy = ordered.some((tag) => /^(电信|联通|移动)快乐$|^三网快乐$/.test(tag));
  const concise = hasCarrierHappy ? ordered.filter((tag) => !/^(电信|联通|移动)精品线路$/.test(tag)) : ordered;
  const anomaly = concise.find((tag) => tag === "部分方向异常");
  if (!anomaly) return concise.slice(0, 3);
  return [...concise.filter((tag) => tag !== anomaly).slice(0, 2), anomaly];
}

function reportRegionTag(result: ReturnType<typeof analyzeReport>): string {
  const text = result.modules
    .flatMap((module) => module.items)
    .find((item) => item.label === "IP 使用地")?.value ?? "";
  return locationRegionTag(text);
}

function locationRegionTag(text: string): string {
  if (/\[CN\]|中国|大陆|国内/.test(text)) return "中国";
  if (/\[HK\]|香港/.test(text)) return "香港";
  if (/\[JP\]|日本/.test(text)) return "日本";
  if (/\[SG\]|新加坡/.test(text)) return "新加坡";
  if (/\[MY\]|马来西亚|Malaysia/.test(text)) return "马来西亚";
  if (/\[TH\]|泰国|Thailand/.test(text)) return "泰国";
  if (/\[VN\]|越南|Vietnam/.test(text)) return "越南";
  if (/\[ID\]|印尼|印度尼西亚|Indonesia/.test(text)) return "印尼";
  if (/\[PH\]|菲律宾|Philippines/.test(text)) return "菲律宾";
  if (/\[IN\]|印度|India/.test(text)) return "印度";
  if (/\[AE\]|阿联酋|迪拜|United Arab Emirates/.test(text)) return "阿联酋";
  if (/\[SA\]|沙特|Saudi Arabia/.test(text)) return "沙特";
  if (/\[TR\]|土耳其|Turkey/.test(text)) return "土耳其";
  if (/\[RU\]|俄罗斯|Russia/.test(text)) return "俄罗斯";
  if (/\[KR\]|韩国|首尔/.test(text)) return "韩国";
  if (/\[TW\]|台湾|台北/.test(text)) return "台湾";
  if (/\[US\]|美国|洛杉矶|西雅图|纽约/.test(text)) return "美国";
  if (/\[CA\]|加拿大|多伦多|温哥华/.test(text)) return "加拿大";
  if (/\[MX\]|墨西哥|Mexico/.test(text)) return "墨西哥";
  if (/\[EU\]|欧洲|德国|法国|英国|荷兰|芬兰|瑞典|意大利|西班牙|波兰/.test(text)) return "欧洲";
  if (/\[AU\]|澳洲|澳大利亚|新西兰/.test(text)) return "澳洲";
  if (/巴西|智利|阿根廷|秘鲁|哥伦比亚/.test(text)) return "南美";
  if (/\[ZA\]|南非|South Africa/.test(text)) return "南非";
  if (/\[EG\]|埃及|Egypt/.test(text)) return "埃及";
  const code = text.match(/\[([A-Z]{2})\]/)?.[1];
  if (code) return code;
  return "地区未知";
}

function proxyGoodRegionTags(evidence: string[]): string[] {
  const carriers = ["电信", "联通", "移动"];
  const byCarrier = carriers.map((carrier) => evidence
    .filter((item) => item.startsWith(`${carrier}地区 `))
    .flatMap((item) => item
      .replace(new RegExp(`^${carrier}地区\\s+`), "")
      .replace(/=[^=]+$/, "")
      .split("；")[0]
      .split("、")
      .map((region) => region.trim())
      .filter((region) => region.endsWith(carrier) && !region.includes("未识别"))));

  const primary = byCarrier.flatMap((regions) => regions.slice(0, 1));
  const remaining = byCarrier.flatMap((regions) => regions.slice(1));
  return Array.from(new Set([...primary, ...remaining])).slice(0, 3);
}

function verdictGrade(name: string, verdict: string, severity: string): string {
  if (/毕业[机鸡]/.test(verdict)) return "毕业鸡";
  if (/三网 CN2GIA/.test(verdict)) return "三网CN2GIA";
  if (/顶级/.test(verdict)) return name === "代理" ? "顶级线路" : "顶级";
  if (/精品/.test(verdict)) return name === "代理" ? "精品线路" : "精品";
  if (/落地[机鸡]/.test(verdict)) return "落地鸡";
  if (/解锁[机鸡]|流媒体可用/.test(verdict)) return "流媒体解锁";
  if (/快乐[机鸡]|快乐/.test(verdict)) return name === "代理" ? "线路鸡" : "快乐鸡";
  if (/大盘[机鸡]/.test(verdict)) return "大盘鸡";
  if (severity === "risk" || /谨慎|不适合/.test(verdict)) return "谨慎";
  if (name === "建站") return "轻量建站";
  if (name === "代理") return "看地区";
  if (name === "存储") return "轻量存储";
  if (name === "AI / 流媒体") return "部分解锁";
  return "表现一般";
}

function carrierQualityTags(evidence: string[]): string[] {
  const tags = ["电信", "联通", "移动"].flatMap((carrier) => {
    const carrierGrade = evidence
      .find((item) => item.startsWith(`${carrier}代理 `))
      ?.match(/=(顶级|快乐)$/)?.[1];
    if (carrierGrade === "顶级") return [`${carrier}优化`];
    if (carrierGrade === "快乐") return [`${carrier}快乐`];

    const regionHappy = evidence.some((item) => item.startsWith(`${carrier}地区 `) && item.endsWith("=快乐"));
    return regionHappy ? [`${carrier}快乐`] : [];
  });

  if (tags.length === 3 && tags.every((tag) => tag.endsWith("优化"))) return ["三网优化"];
  if (tags.length === 3 && tags.every((tag) => tag.endsWith("快乐"))) return ["三网快乐"];
  return tags;
}

type PosterRegion = "asia" | "northAmerica" | "southAmerica" | "europe" | "australia";
type PosterKind = "machine" | "spare" | "graduate" | "line" | "storage" | "landing";

const posterCards: Record<PosterRegion, Record<PosterKind, [string, string]>> = {
  asia: {
    machine: [asia_machine_v1, asia_machine_v2],
    spare: [asia_spare_v1, asia_spare_v2],
    graduate: [asia_graduate_v1, asia_graduate_v2],
    line: [asia_line_v1, asia_line_v2],
    storage: [asia_storage_v1, asia_storage_v2],
    landing: [asia_landing_v1, asia_landing_v2],
  },
  northAmerica: {
    machine: [northamerica_machine_v1, northamerica_machine_v2],
    spare: [northamerica_spare_v1, northamerica_spare_v2],
    graduate: [northamerica_graduate_v1, northamerica_graduate_v2],
    line: [northamerica_line_v1, northamerica_line_v2],
    storage: [northamerica_storage_v1, northamerica_storage_v2],
    landing: [northamerica_landing_v1, northamerica_landing_v2],
  },
  southAmerica: {
    machine: [southamerica_machine_v1, southamerica_machine_v2],
    spare: [southamerica_spare_v1, southamerica_spare_v2],
    graduate: [southamerica_graduate_v1, southamerica_graduate_v2],
    line: [southamerica_line_v1, southamerica_line_v2],
    storage: [southamerica_storage_v1, southamerica_storage_v2],
    landing: [southamerica_landing_v1, southamerica_landing_v2],
  },
  europe: {
    machine: [europe_machine_v1, europe_machine_v2],
    spare: [europe_spare_v1, europe_spare_v2],
    graduate: [europe_graduate_v1, europe_graduate_v2],
    line: [europe_line_v1, europe_line_v2],
    storage: [europe_storage_v1, europe_storage_v2],
    landing: [europe_landing_v1, europe_landing_v2],
  },
  australia: {
    machine: [australia_machine_v1, australia_machine_v2],
    spare: [australia_spare_v1, australia_spare_v2],
    graduate: [australia_graduate_v1, australia_graduate_v2],
    line: [australia_line_v1, australia_line_v2],
    storage: [australia_storage_v1, australia_storage_v2],
    landing: [australia_landing_v1, australia_landing_v2],
  },
};

function posterCard(result: ReturnType<typeof analyzeReport>, name: string, title: string, tags: string[]): string {
  const region = posterRegion(result);
  const kind = posterKind(name, title, tags);
  const variants = posterCards[region][kind];
  return variants[stableVariant(`${result.title}:${name}:${title}`)];
}

function posterRegion(result: ReturnType<typeof analyzeReport>): PosterRegion {
  const text = [
    result.title,
    ...result.modules.flatMap((module) => [
      module.summary,
      module.takeaway,
      ...module.items.flatMap((item) => [item.label, item.value, item.note, item.grade ?? ""]),
    ]),
    ...result.useCases.flatMap((useCase) => [useCase.verdict, ...useCase.evidence]),
  ].join(" ");
  if (/\[EU\]|\bEU\b|欧洲|德国|法国|英国|荷兰|芬兰|瑞典|意大利|西班牙|波兰|俄罗斯|Russia/.test(text)) return "europe";
  if (/\[SA\]|\bSA\b|南美|巴西|智利|阿根廷|秘鲁|哥伦比亚/.test(text)) return "southAmerica";
  if (/\[OC\]|\[AU\]|\bAU\b|澳洲|澳大利亚|新西兰|大洋洲/.test(text)) return "australia";
  if (/\[AS\]|\[HK\]|\[JP\]|\[KR\]|\[SG\]|\[TW\]|亚洲|香港|日本|韩国|新加坡|台湾|泰国|越南|印度/.test(text)) return "asia";
  return "northAmerica";
}

function posterKind(name: string, title: string, tags: string[]): PosterKind {
  const text = `${name} ${title} ${tags.join(" ")}`;
  if (/毕业[机鸡]/.test(text)) return "graduate";
  if (/备用[机鸡]|备用/.test(text)) return "spare";
  if (/谨慎|不适合|风控|受限/.test(text)) return "machine";
  if (/大盘[机鸡]/.test(text)) return "storage";
  if (/落地[机鸡]|流媒体解锁[机鸡]|AI \/ 流媒体快乐[机鸡]|流媒体快乐[机鸡]/.test(text)) return "landing";
  if (/线路[机鸡]|精品线路|顶级线路|三网精品线|CN2|CMIN2|10099|电信快乐|联通快乐|移动快乐/.test(text)) return "line";
  return "machine";
}

function stableVariant(value: string): 0 | 1 {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash) % 2 === 0 ? 0 : 1;
}

function semanticTags(name: string, verdict: string, evidence: string[]): string[] {
  const text = `${verdict} ${evidence.join(" ")}`;
  if (name === "代理") {
    const telecomPremium = evidence.some((item) => item.startsWith("电信线路 ") && /CN2GIA|CTGGIA/i.test(item) && !/CN2混合|GT/.test(item));
    const unicomPremium = evidence.some((item) => item.startsWith("联通线路 ") && /CN2GIA|CTGGIA|10099|9929/i.test(item));
    const mobilePremium = evidence.some((item) => item.startsWith("移动线路 ") && /CMIN2/i.test(item));
    const isLineMachine = /三网 CN2GIA|顶级线路|精品线路/.test(verdict) ||
      evidence.some((item) => /^(电信|联通|移动)代理 .*=(顶级|快乐)$/.test(item));
    return compactTags([
      isLineMachine ? "线路鸡" : "",
      ...carrierQualityTags(evidence),
      evidence.some((item) => /^(国内测速|丢包|国际互连) .*=(部分方向异常|明显丢包|异常)$/.test(item)) ? "部分方向异常" : "",
      !/三网 CN2GIA|三网顶级线路/.test(verdict) && telecomPremium && unicomPremium && mobilePremium ? "三网精品线" : "",
      telecomPremium ? "电信CN2GIA" : "",
      /毕业[机鸡]/.test(text) ? "毕业鸡" : "",
      /电信线路 .*=(顶级|精品|精品混合)/.test(text) ? "电信精品线路" : "",
      /联通线路 .*=(顶级|精品|精品混合)/.test(text) ? "联通精品线路" : "",
      /移动线路 .*=(顶级|精品|精品混合)/.test(text) ? "移动精品线路" : "",
      /低延迟/.test(text) ? "低延迟" : "",
    ]);
  }
  if (name === "存储") {
    return compactTags([
      /大盘[机鸡]/.test(text) || /硬盘容量 总\s*(\d{3,}|[1-9]\d*\s*T)/.test(text) ? "大盘鸡" : "",
      /顺序读取 .*=(不错|很好|很强|顶级)/.test(text) || /顺序写入 .*=(不错|很好|很强|顶级)/.test(text) ? "大文件友好" : "",
      /4K .*=(差|偏差)/.test(text) ? "不适合数据库" : "",
      "轻量存储",
    ]);
  }
  if (name === "AI / 流媒体") {
    return compactTags([
      /ChatGPT .*=(解锁|受限)/.test(text) ? "AI可用" : "",
      /Netflix .*解锁|Disney\+ .*解锁|Youtube .*解锁/.test(text) ? "流媒体解锁" : "",
      /送中风险 .*=单点/.test(text) ? "单点送中" : "",
      /送中风险 .*=明显/.test(text) ? "送中风险" : "",
      /IP 类型 .*广播/.test(text) ? "广播IP" : "",
    ]);
  }
  return compactTags([
    /CPU|Sysbench/.test(text) ? "轻量建站" : "",
    /4K .*=(差|偏差)/.test(text) ? "数据库谨慎" : "",
    /内存容量 .*=(小内存|偏小)/.test(text) ? "小内存" : "",
    /NAT 类型 .*开放/.test(text) ? "开放网络" : "",
    "小站候选",
  ]);
}

function compactTags(tags: string[]): string[] {
  return Array.from(new Set(tags.filter(Boolean))).slice(0, 6);
}

function tagClass(tag: string): string {
  if (/毕业|顶级|精品|优化|快乐|CN2GIA|线路[机鸡]|落地[机鸡]|解锁|低延迟|大文件|开放|AI可用|(电信|联通|移动)$/.test(tag)) return "good";
  if (/谨慎|异常|送中|不适合|小内存/.test(tag)) return "risk";
  return "watch";
}

function useCaseTargetId(name: string): string {
  if (name === "建站") return "usecase-site";
  if (name === "代理") return "usecase-proxy";
  if (name === "存储") return "usecase-storage";
  return "usecase-media";
}

function maskedReportIp(title: string): string {
  const raw = title.match(/报告：\s*([^/]+)/)?.[1]?.trim() ?? "未知";
  return raw.replace(/^(\d+\.\d+)\.[\d*]+\.[\d*]+/, "$1.**.**");
}

function reportTime(title: string): string {
  return title.match(/\/\s*(.+)$/)?.[1]?.trim() ?? "未识别";
}

export default App;
