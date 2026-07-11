import type { AnalysisResult, CarrierName, CarrierProfile, Evidence, Insight, LatencyLevel, LatencyMatrixRow, Metric, PacketLossLevel, RegionalLatency, ReportModule, ReportParts, Severity } from "./analyzerTypes";
import { buildUseCases } from "./rules/useCases";
export type { AnalysisResult, Insight, Metric, ReportModule, Severity, UseCaseVerdict } from "./analyzerTypes";

const riskTerms = ["ERROR", "失败", "阻断", "黑名单", "较高风险", "高风险", "仅APP", "丢包", "重传", "绕路"];
const goodTerms = ["KVM", "x86_64", "解锁", "原生", "低风险", "黑名单 0", "CN2", "CMIN2", "无NAT"];

export function analyzeReport(input: string): AnalysisResult {
  const text = input.trim();
  const sourceKind = detectSourceKind(text);

  if (!text) return emptyResult();
  if (sourceKind === "url") return buildUrlOnlyResult(text);

  const parts = splitReport(text);
  const evidence = extractEvidence(parts);
  const modules = buildModules(parts, evidence);
  const health = scoreReport(evidence, modules);
  const title = extractTitle(text, parts);
  const latencySection = sectionBetween(parts.net, "四、三网TCP大包延迟", "五、三网回程路由");

  return {
    title,
    health,
    verdict: buildVerdict(evidence, modules),
    plainSummary: buildPlainSummary(title, evidence, modules),
    audienceSummary: buildAudienceSummary(evidence, modules),
    useCases: buildUseCases(evidence),
    sourceKind,
    metrics: modules.flatMap((module) => module.items).slice(0, 16),
    insights: buildInsights(modules),
    modules,
    sections: extractSections(parts),
    glossary: buildGlossary(parts),
    nextSteps: buildNextSteps(evidence, modules),
    detectedSignals: detectSignals(text),
    latencyMatrix: buildLatencyMatrix(latencySection),
  };
}

function emptyResult(): AnalysisResult {
  return {
    title: "等待报告",
    health: 0,
    verdict: "还没有可解读的内容",
    plainSummary: "粘贴 NodeQuality 报告后，这里会按硬件、IP、网络三块解释。",
    audienceSummary: "先不用理解每个测试名。报告解读会先告诉你这台机器适合做什么，再解释支撑结论的指标。",
    useCases: [],
    sourceKind: "empty",
    metrics: [],
    insights: [],
    modules: [],
    sections: [],
    glossary: defaultGlossary(),
    nextSteps: ["粘贴 NodeQuality 报告 markdown", "点击“解读报告”"],
    detectedSignals: [],
    latencyMatrix: [],
  };
}

function buildUrlOnlyResult(url: string): AnalysisResult {
  return {
    title: "已识别报告链接",
    health: 0,
    verdict: "纯前端不能直接读取这个链接",
    plainSummary: "请把帖子里的 NodeQuality 报告原文复制进来，页面才能按硬件、IP、网络三块解读。",
    audienceSummary: "只给链接时看不到 CPU、内存、硬盘、IP 和网络数据，所以无法给用途建议。",
    useCases: [],
    sourceKind: "url",
    metrics: [{ label: "报告链接", value: url, note: "需要粘贴原始报告内容后才能分析。", severity: "watch" }],
    insights: [{ title: "需要报告原文", body: "链接本身不包含可解析的测试数据。", severity: "watch" }],
    modules: [
      {
        title: "链接读取",
        summary: "已识别为 URL，但没有拿到报告正文。",
        takeaway: "现在不能判断这台机器值不值得买。",
        whyItMatters: "NodeQuality 的结论来自报告正文里的硬件、网络和 IP 测试，不来自网页标题。",
        verdict: "粘贴 markdown 原文后才能判断。",
        severity: "watch",
        items: [],
      },
    ],
    sections: [],
    glossary: defaultGlossary(),
    nextSteps: ["打开原帖，复制 NodeQuality 报告正文。", "回到这里粘贴 markdown，再点击解读。"],
    detectedSignals: ["URL"],
    latencyMatrix: [],
  };
}

function detectSourceKind(text: string): AnalysisResult["sourceKind"] {
  if (!text) return "empty";
  return /^https?:\/\/\S+$/i.test(text) ? "url" : "markdown";
}

function splitReport(text: string): ReportParts {
  const hardwareStart = indexOfAny(text, ["硬件质量体检报告", "一、操作系统信息"]);
  const ipStart = indexOfAny(text, ["IP质量体检报告"]);
  const netStart = indexOfAny(text, ["网络质量体检报告"]);
  const traceStart = nthIndexOf(text, "网络质量体检报告", 2);

  return {
    header: slicePart(text, 0, minPositive([hardwareStart, ipStart, netStart])),
    hardware: slicePart(text, hardwareStart, minPositive([ipStart, netStart])),
    ip: slicePart(text, ipStart, minPositive([netStart, traceStart])),
    net: slicePart(text, netStart, traceStart > netStart ? traceStart : undefined),
    trace: slicePart(text, traceStart, undefined),
  };
}

function indexOfAny(text: string, needles: string[]): number {
  const indexes = needles.map((needle) => text.indexOf(needle)).filter((index) => index >= 0);
  return indexes.length > 0 ? Math.min(...indexes) : -1;
}

function nthIndexOf(text: string, needle: string, nth: number): number {
  let index = -1;
  let from = 0;
  for (let i = 0; i < nth; i += 1) {
    index = text.indexOf(needle, from);
    if (index < 0) return -1;
    from = index + needle.length;
  }
  return index;
}

function minPositive(values: Array<number | undefined>): number | undefined {
  const positives = values.filter((value): value is number => value !== undefined && value >= 0);
  return positives.length > 0 ? Math.min(...positives) : undefined;
}

function slicePart(text: string, start: number, end: number | undefined): string {
  if (start < 0) return "";
  return text.slice(start, end).trim();
}

function extractTitle(text: string, parts: ReportParts): string {
  const ip = text.match(/(?:硬件质量体检报告|IP质量体检报告|网络质量体检报告)：\s*([^\n]+)/)?.[1]?.trim();
  const time = text.match(/报告时间：([^\s]+ [^\s]+)/)?.[1]?.trim();
  if (ip && time) return `NodeQuality 报告：${ip} / ${time}`;
  if (ip) return `NodeQuality 报告：${ip}`;
  if (parts.hardware || parts.ip || parts.net) return "NodeQuality VPS 测评报告";
  return clean(text.split(/\r?\n/).find(Boolean) ?? "NodeQuality VPS 测评报告");
}

function extractSections(parts: ReportParts): string[] {
  const sections: string[] = [];
  if (parts.hardware) sections.push("硬件质量");
  if (parts.ip) sections.push("IP 质量");
  if (parts.net) sections.push("网络质量");
  if (parts.trace) sections.push("回程路由");
  return sections;
}

function extractEvidence(parts: ReportParts): Evidence[] {
  return compactEvidence([
    ...extractHardwareEvidence(parts.hardware),
    ...extractIpEvidence(parts.ip),
    ...extractNetEvidence(parts.net, parts.trace),
  ]);
}

function extractHardwareEvidence(hardware: string): Evidence[] {
  const cpuSection = sectionBetween(hardware, "三、CPU测评", "四、显卡测评");
  const memorySection = sectionBetween(hardware, "五、内存测评", "六、硬盘测评");
  const diskSection = sectionBetween(hardware, "六、硬盘测评", "七、HQ硬件加权评分");
  const hqSection = sectionBetween(hardware, "七、HQ硬件加权评分", "====");
  const osSection = sectionBetween(hardware, "一、操作系统信息", "二、主板信息");

  return compactEvidence([
    lineEvidence(osSection, "os.virt", "虚拟化", /容器\/虚拟化：\s*([^\n]+)/, gradeVirt),
    lineEvidence(osSection, "os.arch", "架构", /架构：\s*([^\n]+)/, gradeArch),
    loadEvidence(osSection),
    numberEvidence(cpuSection, "cpu.sysbench.single", "Sysbench 单核", [/Sysbench：单线程\s*(\d+(\.\d+)?)/], gradeCpuSingle),
    sizeEvidence(cpuSection, "cpu.l3", "L3 缓存", [/L3\s*(\d+(\.\d+)?)\s*(KiB|MiB|GiB|KB|MB|GB)/i], gradeL3),
    flagEvidence(cpuSection, "cpu.aes", "AES-NI", /✔\s*AES-NI|AES-NI\s*✔/, "重要", "TLS 加密、WireGuard/VPN 常用，支持是加分项。", "good"),
    flagEvidence(cpuSection, "cpu.avx2", "AVX2", /✔\s*AVX2|AVX2\s*✔/, "进阶", "对部分计算任务有帮助，日常代理和小站不是刚需。", "good"),
    memoryAmountEvidence(memorySection),
    numberEvidence(memorySection, "memory.read", "内存读取", [/Sysbench：读取\s*(\d+(\.\d+)?)\s*MB\/s/], gradeMemorySpeed),
    numberEvidence(memorySection, "memory.write", "内存写入", [/写入\s*(\d+(\.\d+)?)\s*MB\/s/], gradeMemorySpeed),
    numberEvidence(memorySection, "memory.latency", "内存延迟", [/延迟\s*(\d+(\.\d+)?)\s*ns/], gradeMemoryLatency),
    statusEvidence(memorySection, "memory.balloon", "气球回收", /([✔✘])\s*气球回收/, "气球回收"),
    statusEvidence(memorySection, "memory.ksm", "KSM 复用", /([✔✘])\s*KSM\s*复用/, "KSM 复用"),
    diskCapacityEvidence(diskSection),
    fioEvidence(diskSection, "disk.rnd4k.read", "4K 随机读", "RND4K/Q1", "读取", 0, gradeDisk4k),
    fioEvidence(diskSection, "disk.rnd4k.write", "4K 随机写", "RND4K/Q1", "写入", 0, gradeDisk4k),
    fioIopsEvidence(diskSection, "disk.rnd4k.iops.read", "4K 读 IOPS", "读取", 1, gradeIops),
    fioIopsEvidence(diskSection, "disk.rnd4k.iops.write", "4K 写 IOPS", "写入", 1, gradeIops),
    fioEvidence(diskSection, "disk.seq.read", "顺序读取", "SEQ1M/Q1", "读取", 4, gradeSeq),
    fioEvidence(diskSection, "disk.seq.write", "顺序写入", "SEQ1M/Q1", "写入", 4, gradeSeq),
    hqEvidence(hqSection, "hq.total", "HQ 总分", 0),
    hqEvidence(hqSection, "hq.memory", "HQ 内存分", 3),
    hqEvidence(hqSection, "hq.disk", "HQ 硬盘分", 4),
  ]);
}

function extractIpEvidence(ip: string): Evidence[] {
  const baseSection = sectionBetween(ip, "一、基础信息", "二、IP类型属性");
  const typeSection = sectionBetween(ip, "二、IP类型属性", "三、风险评分");
  const riskSection = sectionBetween(ip, "三、风险评分", "四、风险因子");
  const factorSection = sectionBetween(ip, "四、风险因子", "五、流媒体及AI服务解锁检测");
  const unlockSection = sectionBetween(ip, "五、流媒体及AI服务解锁检测", "六、邮局连通性及黑名单检测");
  const mailSection = sectionBetween(ip, "六、邮局连通性及黑名单检测", "====");

  return compactEvidence([
    lineEvidence(baseSection, "ip.location", "IP 使用地", /使用地：\s*([^\n]+)/, (value) => ({ grade: "地区信息", severity: "watch", meaning: `${value}，决定低延迟和流媒体区域。` })),
    lineEvidence(baseSection, "ip.registered", "IP 注册地", /注册地：\s*([^\n]+)/, gradeRegisteredLocation),
    lineEvidence(baseSection, "ip.type", "IP 类型", /IP类型：\s*([^\n]+)/, gradeIpType),
    regionLeakEvidence(factorSection, unlockSection),
    typeMixEvidence(typeSection),
    riskScoreEvidence(riskSection, "IP2Location"),
    riskScoreEvidence(riskSection, "Scamalytics"),
    riskScoreEvidence(riskSection, "ipapi"),
    riskScoreEvidence(riskSection, "AbuseIPDB"),
    riskScoreEvidence(riskSection, "IPQS"),
    riskFactorEvidence(factorSection, "proxy", "代理", /代理：\s*([^\n]+)/),
    riskFactorEvidence(factorSection, "vpn", "VPN", /VPN：\s*([^\n]+)/),
    riskFactorEvidence(factorSection, "abuse", "滥用", /滥用：\s*([^\n]+)/),
    ...unlockEvidence(unlockSection),
    blacklistEvidence(mailSection),
    mailPortEvidence(mailSection),
  ]);
}

function extractNetEvidence(net: string, trace: string): Evidence[] {
  const bgpSection = sectionBetween(net, "一、BGP信息", "二、本地策略");
  const localSection = sectionBetween(net, "二、本地策略", "三、接入信息");
  const latencySection = sectionBetween(net, "四、三网TCP大包延迟", "五、三网回程路由");
  const routeSection = sectionBetween(net, "五、三网回程路由", "六、国内测速");
  const speedSection = sectionBetween(net, "六、国内测速", "七、国际互连");
  const interSection = sectionBetween(net, "七、国际互连", "====");

  return compactEvidence([
    lineEvidence(bgpSection, "net.region", "网络地区", /地区：\s*([^\n]+)/, (value) => ({ grade: "地区信息", severity: "watch", meaning: `${value}，决定到目标用户的物理距离。` })),
    lineEvidence(localSection, "net.nat", "NAT 类型", /NAT类型：\s*([^\n]+)/, gradeNat),
    tcpLatencyEvidence(latencySection),
    regionalLatencyEvidence(latencySection),
    ...carrierNetworkEvidence(routeSection, speedSection, latencySection, trace),
    routeEvidence(routeSection),
    domesticSpeedEvidence(speedSection),
    packetLossEvidence(`${latencySection}\n${speedSection}\n${interSection}`),
    internationalEvidence(interSection),
    traceRiskEvidence(trace),
  ]);
}

function buildModules(parts: ReportParts, evidence: Evidence[]): ReportModule[] {
  const hardware = evidence.filter((item) => item.key.startsWith("os.") || item.key.startsWith("cpu.") || item.key.startsWith("memory.") || item.key.startsWith("disk.") || item.key.startsWith("hq."));
  const cpu = evidence.filter((item) => item.key.startsWith("cpu."));
  const memory = evidence.filter((item) => item.key.startsWith("memory."));
  const disk = evidence.filter((item) => item.key.startsWith("disk.") || item.key.startsWith("hq.disk"));
  const ip = evidence.filter((item) => item.key.startsWith("ip."));
  const net = evidence.filter((item) => item.key.startsWith("net."));

  return [
    moduleFromEvidence("机器基础信息", "确认虚拟化、架构、负载和基础资源。", "基础信息只证明环境，不证明性能。KVM/x86_64、低负载是好开头。", hardware.filter((item) => item.key.startsWith("os.") || item.key === "memory.amount" || item.key === "disk.capacity"), parts.hardware ? "基础环境可读，继续看 CPU、硬盘和网络证据。" : "没有硬件报告。"),
    moduleFromEvidence("CPU 性能", "CPU 决定动态网站、编译、加密和多服务运行能力。", "看 Sysbench 单核和缓存，比只看 CPU 型号更可靠。", cpu, cpuVerdict(cpu)),
    moduleFromEvidence("内存与稳定性", "内存决定能同时跑多少服务，延迟和吞吐影响高负载体验。", "气球/KSM 是超开相关信号；报告里 ✘ 代表未启用，不是风险。", memory, memoryVerdict(memory)),
    moduleFromEvidence("磁盘 I/O", "磁盘影响 WordPress、MySQL、Docker、小文件和下载解压。", "4K 随机读写/IOPS 比顺序读写更能说明建站体感。", disk, diskVerdict(disk)),
    moduleFromEvidence("IP 与流媒体", "IP 质量影响账号、AI/API、流媒体和邮件。", "硬件再好，IP 被限制也会影响核心用途。", ip, ipVerdict(ip)),
    moduleFromEvidence("网络质量", "网络决定代理、访问速度、回程和三网体验。", "大包延迟、回程线路、国内测速 ERROR、国际重传都要一起看。", net, netVerdict(net)),
  ].filter((module) => module.items.length > 0 || module.severity !== "watch");
}

function moduleFromEvidence(title: string, summary: string, whyItMatters: string, evidence: Evidence[], verdict: string): ReportModule {
  const severity = combineEvidenceSeverity(evidence, "watch");
  return {
    title,
    summary,
    takeaway: buildTakeaway(evidence, title),
    whyItMatters,
    verdict,
    severity,
    items: evidence.map(evidenceMetric),
  };
}

function buildTakeaway(evidence: Evidence[], fallback: string): string {
  const risks = evidence.filter((item) => item.severity === "risk").slice(0, 2);
  if (risks.length > 0) return `${risks.map(formatEvidence).join("、")}，这是需要优先确认的短板。`;
  const goods = evidence.filter((item) => item.severity === "good").slice(0, 2);
  if (goods.length > 0) return `${goods.map(formatEvidence).join("、")}，这部分有明确加分项。`;
  if (evidence.length > 0) return `${fallback} 有数据，但多数属于一般或待确认。`;
  return `${fallback} 没有识别到足够数据。`;
}

function scoreReport(evidence: Evidence[], modules: ReportModule[]): number {
  const moduleScores = modules.map((module) => (module.severity === "good" ? 82 : module.severity === "watch" ? 62 : 38));
  const average = moduleScores.length > 0 ? moduleScores.reduce((sum, value) => sum + value, 0) / moduleScores.length : 50;
  const criticalRiskPenalty = ["disk.rnd4k.read", "disk.rnd4k.write", "net.domestic.speed", "net.international"].filter((key) =>
    evidence.some((item) => item.key === key && item.severity === "risk"),
  ).length * 4;
  const strongEvidenceBonus = Math.min(evidence.filter((item) => item.severity === "good").length, 8);
  return Math.max(12, Math.min(96, Math.round(average + strongEvidenceBonus - criticalRiskPenalty)));
}

function buildVerdict(evidence: Evidence[], modules: ReportModule[]): string {
  const risks = evidence.filter((item) => item.severity === "risk").slice(0, 2);
  if (risks.length > 0) return `${risks.map(formatEvidence).join("、")} 需要重点看`;
  if (modules.some((module) => module.severity === "good")) return "这台机器有明确可用场景";
  return "这台机器需要结合用途判断";
}

function buildPlainSummary(title: string, evidence: Evidence[], modules: ReportModule[]): string {
  const risks = evidence.filter((item) => item.severity === "risk").slice(0, 3);
  const goods = evidence.filter((item) => item.severity === "good").slice(0, 3);
  if (risks.length > 0) {
    return `这份《${title}》不是简单的好坏。主要短板是 ${risks.map(formatEvidence).join("、")}；亮点是 ${goods.map(formatEvidence).join("、") || "暂无强证据"}。`;
  }
  return `这份《${title}》整体没有明显硬伤。比较有说服力的证据是 ${goods.map(formatEvidence).join("、") || `${modules.length} 个模块可读`}。`;
}

function buildAudienceSummary(evidence: Evidence[], modules: ReportModule[]): string {
  const risks = evidence.filter((item) => item.severity === "risk").slice(0, 2);
  if (risks.length > 0) return `先看结论：这台机器不是不能用，但 ${risks.map(formatEvidence).join("、")}。如果你要建站、跑数据库或走对应网络方向，这些短板会影响体验。`;
  const goods = evidence.filter((item) => item.severity === "good").slice(0, 2);
  return `先看结论：这台机器可以进入候选。${goods.map(formatEvidence).join("、") || "报告覆盖了主要模块"}，下一步看价格、目标线路和商家口碑。`;
}

function buildInsights(modules: ReportModule[]): Insight[] {
  return [...modules]
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
    .slice(0, 4)
    .map((module) => ({ title: module.title, body: `${module.takeaway} ${module.verdict}`, severity: module.severity }));
}

function buildNextSteps(evidence: Evidence[], modules: ReportModule[]): string[] {
  const risks = evidence.filter((item) => item.severity === "risk").slice(0, 3);
  const steps = ["先确认报告时间、套餐规格和价格，避免拿旧测评判断当前库存。"];
  if (risks.length > 0) steps.push(`优先复核 ${risks.map(formatEvidence).join("、")}。`);
  steps.push("建站优先看 CPU、内存、4K 随机 I/O；代理优先看三网延迟、回程和国内测速。");
  steps.push("账号、AI/API、流媒体优先看 IP 风控、黑名单、解锁状态。");
  return steps;
}

function buildGlossary(parts: ReportParts): string[] {
  const glossary = defaultGlossary();
  if (parts.hardware) glossary.push("RND4K/Q1：4K 随机读写，影响 WordPress、MySQL、Docker 和小文件。");
  if (parts.hardware) glossary.push("HQ 分数：硬件综合趋势分，不能单独代替 CPU/磁盘/IP/网络判断。");
  if (parts.ip) glossary.push("仅APP：通常表示网页/API 不一定完整可用，账号和 AI 用途要谨慎。");
  if (parts.net) glossary.push("回程：服务器访问国内运营商时走的线路，CN2/CMIN2/10099 等通常比普通绕路更有价值。");
  return glossary;
}

function defaultGlossary(): string[] {
  return [
    "NodeQuality：封装 HardwareQuality、IPQuality、NetQuality 的 VPS 测评工具。",
    "证据链：本页每个结论都应能追溯到具体数值和档位。",
    "健康度：本页根据证据估算的阅读辅助分，不是官方评分。",
  ];
}

function detectSignals(text: string): string[] {
  return [...riskTerms, ...goodTerms].filter((term) => text.includes(term)).slice(0, 14);
}

function sectionBetween(text: string, start: string, end: string): string {
  const startIndex = text.indexOf(start);
  if (startIndex < 0) return "";
  const endIndex = text.indexOf(end, startIndex + start.length);
  return text.slice(startIndex, endIndex >= 0 ? endIndex : undefined);
}

function lineEvidence(text: string, key: string, label: string, pattern: RegExp, grader: (value: string) => Omit<Evidence, "key" | "label" | "value">): Evidence | undefined {
  const value = text.match(pattern)?.[1]?.trim();
  if (!value) return undefined;
  return { key, label, value: clean(value), ...grader(clean(value)) };
}

function numberEvidence(text: string, key: string, label: string, patterns: RegExp[], grader: (value: number) => Omit<Evidence, "key" | "label" | "value">): Evidence | undefined {
  const value = numberAfter(text, patterns);
  if (value === undefined) return undefined;
  return { key, label, value: String(value), ...grader(value) };
}

function sizeEvidence(text: string, key: string, label: string, patterns: RegExp[], grader: (value: number) => Omit<Evidence, "key" | "label" | "value">): Evidence | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match?.[1] || !match[3]) continue;
    const raw = Number(match[1]);
    const unit = match[3].toLowerCase();
    const mb = unit.includes("g") ? raw * 1024 : unit.includes("k") ? raw / 1024 : raw;
    return { key, label, value: `${raw} ${match[3]}`, ...grader(mb) };
  }
  return undefined;
}

function loadEvidence(text: string): Evidence | undefined {
  const match = text.match(/负载：\s*(\d+(\.\d+)?),\s*(\d+(\.\d+)?),\s*(\d+(\.\d+)?)/);
  if (!match) return undefined;
  const values = [Number(match[1]), Number(match[3]), Number(match[5])];
  const max = Math.max(...values);
  const severity: Severity = max < 2 ? "good" : max < 4 ? "watch" : "risk";
  const grade = max < 2 ? "正常" : max < 4 ? "偏高" : "异常";
  return { key: "os.load", label: "系统负载", value: values.join(", "), grade, severity, meaning: "开机初始负载低，说明测试时机器没有明显被打满。" };
}

function memoryAmountEvidence(text: string): Evidence | undefined {
  const match = text.match(/内存：\s*总容量\s*([^,\n]+).*可用\s*([^,\n]+)/);
  if (!match) return undefined;
  const totalMb = parseSizeToMb(match[1]);
  const severity: Severity = totalMb >= 2048 ? "good" : totalMb >= 768 ? "watch" : "risk";
  const grade = totalMb >= 2048 ? "充足" : totalMb >= 768 ? "小内存" : "偏小";
  return { key: "memory.amount", label: "内存容量", value: `总 ${clean(match[1])} / 可用 ${clean(match[2])}`, grade, severity, meaning: "1GB 级别适合轻量服务，建站和多容器需要控制负载。" };
}

function diskCapacityEvidence(text: string): Evidence | undefined {
  const match = text.match(/硬盘：\s*数量\s*[^,]+,\s*总容量\s*([^,\n]+).*可用容量\s*([^,\n]+)/);
  if (!match) return undefined;
  const totalGb = parseSizeToMb(match[1]) / 1024;
  const severity: Severity = totalGb >= 40 ? "good" : totalGb >= 20 ? "watch" : "risk";
  const grade = totalGb >= 40 ? "够用" : totalGb >= 20 ? "偏小" : "很小";
  return { key: "disk.capacity", label: "硬盘容量", value: `总 ${clean(match[1])} / 可用 ${clean(match[2])}`, grade, severity, meaning: "容量只说明能放多少东西，速度还要看 Fio。" };
}

function fioEvidence(text: string, key: string, label: string, _column: string, rowName: "读取" | "写入", offset: number, grader: (value: number) => Omit<Evidence, "key" | "label" | "value">): Evidence | undefined {
  const row = text.split(/\r?\n/).find((line) => line.trim().startsWith(`${rowName}：`));
  if (!row) return undefined;
  const cells = Array.from(row.matchAll(/(\d+(\.\d+)?)\s*MB\/s/g)).map((match) => Number(match[1]));
  const value = cells[offset / 2];
  if (value === undefined) return undefined;
  return { key, label, value: `${value} MB/s`, ...grader(value) };
}

function fioIopsEvidence(text: string, key: string, label: string, rowName: "读取" | "写入", iopsIndex: number, grader: (value: number) => Omit<Evidence, "key" | "label" | "value">): Evidence | undefined {
  const row = text.split(/\r?\n/).find((line) => line.trim().startsWith(`${rowName}：`));
  if (!row) return undefined;
  const tokens = row.match(/\|\|/g) ? row.split(/\|\|/)[0] : row;
  const values = Array.from(tokens.matchAll(/(\d+(\.\d+)?)(k)?/gi)).map((match) => Number(match[1]) * (match[3] ? 1000 : 1));
  const value = values[iopsIndex];
  if (value === undefined) return undefined;
  return { key, label, value: formatNumber(value), ...grader(value) };
}

function hqEvidence(text: string, key: string, label: string, index: number): Evidence | undefined {
  const line = text.split(/\r?\n/).find((item) => item.includes("分数："));
  if (!line) return undefined;
  const values = Array.from(line.matchAll(/\b(\d+)\b/g)).map((match) => Number(match[1]));
  const value = values[index];
  if (value === undefined) return undefined;
  return { key, label, value: String(value), ...gradeHq(value) };
}

function statusEvidence(text: string, key: string, label: string, pattern: RegExp, name: string): Evidence | undefined {
  const mark = text.match(pattern)?.[1];
  if (!mark) return undefined;
  if (mark === "✘") return { key, label, value: "未启用", grade: "正常", severity: "good", meaning: `${name} 未启用，至少不是明显超开信号。` };
  return { key, label, value: "启用", grade: "待确认", severity: "watch", meaning: `${name} 启用，说明资源可能被动态调度。` };
}

function flagEvidence(
  text: string,
  key: string,
  label: string,
  pattern: RegExp,
  grade: string,
  meaning: string,
  severity: Severity,
): Evidence | undefined {
  if (!pattern.test(text)) return undefined;
  return { key, label, value: "支持", grade, meaning, severity };
}

function typeMixEvidence(text: string): Evidence | undefined {
  if (!text) return undefined;
  const home = (text.match(/家宽/g) ?? []).length;
  const dc = (text.match(/机房/g) ?? []).length;
  if (home > 0 && dc > 0) return { key: "ip.type.mix", label: "IP 类型识别", value: `家宽 ${home} / 机房 ${dc}`, grade: "混合", severity: "watch", meaning: "不同数据库判断不一致，账号/风控用途需要人工确认。" };
  if (home > dc) return { key: "ip.type.mix", label: "IP 类型识别", value: "多数家宽", grade: "较好", severity: "good", meaning: "多库更接近家宽，部分平台风控可能更友好。" };
  return { key: "ip.type.mix", label: "IP 类型识别", value: "多数机房", grade: "普通", severity: "watch", meaning: "机房 IP 常见，注册/流媒体要看具体解锁和风控。" };
}

function regionLeakEvidence(factorText: string, unlockText: string): Evidence | undefined {
  const factorRegions = factorText.match(/地区：\s*([^\n]+)/)?.[1]?.trim().split(/\s+/) ?? [];
  const factorNames = factorText.match(/库：\s*([^\n]+)/)?.[1]?.trim().split(/\s+/) ?? [];
  const cnDatabases = factorRegions
    .map((region, index) => (/\[CN\]|中国|大陆/.test(region) ? factorNames[index] ?? `数据库${index + 1}` : ""))
    .filter((name) => /google|youtube|chatgpt|openai/i.test(name))
    .filter(Boolean);
  const services = unlockText.match(/服务商：\s*([^\n]+)/)?.[1]?.trim().split(/\s+/) ?? [];
  const unlockRegions = unlockText.match(/地区：\s*([^\n]+)/)?.[1]?.trim().split(/\s+/) ?? [];
  const cnServices = unlockRegions
    .map((region, index) => (/\[CN\]|中国|大陆/.test(region) ? services[index] ?? `服务${index + 1}` : ""))
    .filter((name) => /google|youtube|chatgpt|openai/i.test(name))
    .filter(Boolean);
  if (cnDatabases.length === 0 && cnServices.length === 0) {
    return {
      key: "ip.region.leak",
      label: "送中风险",
      value: "未见 CN 地区命中",
      grade: "低",
      severity: "good",
      meaning: "Google/YouTube/ChatGPT 相关检测没有明显判到中国大陆，送中风险较低。",
    };
  }
  const value = [
    cnDatabases.length > 0 ? `地区库 ${cnDatabases.join("/")}` : "",
    cnServices.length > 0 ? `服务 ${cnServices.join("/")}` : "",
  ].filter(Boolean).join("；");
  const severity: Severity = cnDatabases.length + cnServices.length >= 2 ? "risk" : "watch";
  return {
    key: "ip.region.leak",
    label: "送中风险",
    value,
    grade: severity === "risk" ? "明显" : "单点",
    severity,
    meaning: "Google/YouTube/ChatGPT 相关检测把 IP 判到中国大陆，AI 访问、流媒体分区和账号风控都可能受影响。",
  };
}

function riskScoreEvidence(text: string, name: string): Evidence | undefined {
  const line = text.split(/\r?\n/).find((item) => item.trim().startsWith(`${name}：`));
  if (!line) return undefined;
  const value = clean(line.replace(`${name}：`, ""));
  const severity: Severity = /较高风险|高风险|极高/.test(value) ? "risk" : /中等/.test(value) ? "watch" : "good";
  const grade = severity === "good" ? "低风险" : severity === "watch" ? "中等风险" : "较高风险";
  return { key: `ip.risk.${name}`, label: `${name} 风险`, value, grade, severity, meaning: "IP 风险分会影响注册、登录、支付、AI/API 和流媒体。" };
}

function riskFactorEvidence(text: string, key: string, label: string, pattern: RegExp): Evidence | undefined {
  const line = text.match(pattern)?.[1];
  if (!line) return undefined;
  const tokens = clean(line)
    .split(/\s+/)
    .filter(Boolean);
  const yes = tokens.filter((token) => token === "是").length;
  const no = tokens.filter((token) => token === "否").length;
  const unknown = tokens.filter((token) => token === "无").length;
  const severity: Severity = yes >= 4 ? "risk" : yes >= 2 ? "watch" : "good";
  const grade = yes === 0 ? "干净" : yes === 1 ? "低命中" : yes < 4 ? "少量命中" : "多库命中";
  const value = yes === 0 ? `${no}/${tokens.length} 库未命中${unknown > 0 ? `，${unknown} 库无数据` : ""}` : `${yes}/${tokens.length} 库命中`;
  return {
    key: `ip.factor.${key}`,
    label,
    value,
    grade,
    severity,
    meaning: yes === 0
      ? `${label} 因子没有被主要数据库命中，是账号和平台风控的加分项。`
      : yes === 1
        ? `${label} 因子只有单个数据库命中，整体风险仍然偏低。`
        : `${label} 因子命中越多，账号和平台风控风险越高。`,
  };
}

function unlockEvidence(text: string): Evidence[] {
  const services = text.match(/服务商：\s*([^\n]+)/)?.[1]?.trim().split(/\s+/) ?? [];
  const statuses = text.match(/状态：\s*([^\n]+)/)?.[1]?.trim().split(/\s+/) ?? [];
  const regions = text.match(/地区：\s*([^\n]+)/)?.[1]?.trim().split(/\s+/) ?? [];
  return services.map((service, index) => {
    const status = statuses[index] ?? "";
    const region = regions[index] ?? "";
    const severity: Severity = /解锁/.test(status) ? "good" : /仅APP/.test(status) ? "watch" : "risk";
    const grade = /解锁/.test(status) ? "解锁" : /仅APP/.test(status) ? "受限" : "不可用";
    return { key: `ip.unlock.${service}`, label: service, value: `${status} ${region}`.trim(), grade, severity, meaning: `${service} 的可用性会影响对应流媒体或 AI 使用。` };
  });
}

function blacklistEvidence(text: string): Evidence | undefined {
  const match = text.match(/黑名单\s*(\d+)/);
  if (!match) return undefined;
  const value = Number(match[1]);
  return { key: "ip.blacklist", label: "黑名单", value: String(value), grade: value === 0 ? "干净" : "命中", severity: value === 0 ? "good" : "risk", meaning: "黑名单命中会影响邮件、注册和平台信任。" };
}

function mailPortEvidence(text: string): Evidence | undefined {
  const match = text.match(/本地25端口出站：([^\n]+)/);
  if (!match) return undefined;
  const blocked = /阻断/.test(match[1]);
  return { key: "ip.mail25", label: "25 端口", value: clean(match[1]), grade: blocked ? "阻断" : "开放", severity: blocked ? "watch" : "good", meaning: "25 端口阻断对自建邮局发信有影响，对普通建站和代理影响不大。" };
}

function tcpLatencyEvidence(text: string): Evidence | undefined {
  const numbers = Array.from(text.matchAll(/(?<!Step=)(?<!\/)(\d{2,3})(?!\d)/g)).map((match) => Number(match[1]));
  if (numbers.length === 0) return undefined;
  const avg = Math.round(numbers.reduce((sum, value) => sum + value, 0) / numbers.length);
  const max = Math.max(...numbers);
  const severity: Severity = avg <= 70 && max <= 140 ? "good" : avg <= 120 ? "watch" : "risk";
  const grade = severity === "good" ? "整体低延迟" : severity === "watch" ? "有波动" : "偏高";
  return { key: "net.tcp.latency", label: "三网大包延迟", value: `均值约 ${avg}ms / 最高 ${max}ms`, grade, severity, meaning: "这是国内三网访问的大致体感，均值低但个别方向高时要看目标用户。" };
}

function regionalLatencyEvidence(text: string): Evidence | undefined {
  const parsed = parseRegionalLatency(text);
  const best = Object.values(parsed)
    .flat()
    .filter((item) => item.latency <= 150 && (item.loss === "none" || item.loss === "unknown"))
    .sort((a, b) => a.latency - b.latency)
    .slice(0, 5);
  if (best.length === 0) return undefined;
  return {
    key: "net.best.region",
    label: "可用方向",
    value: best.map((item) => `${item.region}${item.carrier} ${item.latency}ms`).join("、"),
    grade: "绿色稳定",
    severity: "good",
    meaning: "这些地区/运营商在三网大包延迟里是绿色低丢包；是否快乐还要结合线路和测速异常。",
  };
}

function buildLatencyMatrix(text: string): LatencyMatrixRow[] {
  const parsed = parseRegionalLatency(text);
  const rows = new Map<string, LatencyMatrixRow>();
  (["电信", "联通", "移动"] as CarrierName[]).forEach((carrier) => {
    parsed[carrier].forEach((item) => {
      const province = provinceShortName(item.region);
      const row = rows.get(item.region) ?? { province, region: item.region };
      if (carrier === "电信") row.telecom = item;
      if (carrier === "联通") row.unicom = item;
      if (carrier === "移动") row.mobile = item;
      rows.set(item.region, row);
    });
  });
  return Array.from(rows.values());
}

function provinceShortName(region: string): string {
  const map: Record<string, string> = {
    北京: "京",
    天津: "津",
    河北: "冀",
    山西: "晋",
    内蒙: "蒙",
    辽宁: "辽",
    吉林: "吉",
    黑龙江: "黑",
    上海: "沪",
    江苏: "苏",
    浙江: "浙",
    安徽: "皖",
    福建: "闽",
    江西: "赣",
    山东: "鲁",
    河南: "豫",
    湖北: "鄂",
    湖南: "湘",
    广东: "粤",
    广西: "桂",
    海南: "琼",
    重庆: "渝",
    四川: "川",
    贵州: "贵",
    云南: "云",
    西藏: "藏",
    陕西: "陕",
    甘肃: "甘",
    青海: "青",
    宁夏: "宁",
    新疆: "新",
  };
  return map[region] ?? region.slice(0, 1);
}

function parseRegionalLatency(text: string): Record<CarrierName, RegionalLatency[]> {
  const provinceMap: Record<string, string> = {
    京: "北京",
    津: "天津",
    冀: "河北",
    晋: "山西",
    蒙: "内蒙",
    辽: "辽宁",
    吉: "吉林",
    黑: "黑龙江",
    沪: "上海",
    苏: "江苏",
    浙: "浙江",
    皖: "安徽",
    闽: "福建",
    赣: "江西",
    鲁: "山东",
    豫: "河南",
    鄂: "湖北",
    湘: "湖南",
    粤: "广东",
    桂: "广西",
    琼: "海南",
    渝: "重庆",
    川: "四川",
    贵: "贵州",
    云: "云南",
    藏: "西藏",
    陕: "陕西",
    甘: "甘肃",
    青: "青海",
    宁: "宁夏",
    新: "新疆",
  };
  const carriers: CarrierName[] = ["电信", "联通", "移动"];
  const matches: Record<CarrierName, RegionalLatency[]> = {
    电信: [],
    联通: [],
    移动: [],
  };
  const provincePattern = /[京津冀晋蒙辽吉黑沪苏浙皖闽赣鲁豫鄂湘粤桂琼渝川贵云藏陕甘青宁新]/g;
  for (const line of text.split(/\r?\n/)) {
    const provinceHits = Array.from(line.matchAll(provincePattern));
    provinceHits.forEach((hit, hitIndex) => {
      if (hit.index === undefined) return;
      const nextIndex = provinceHits[hitIndex + 1]?.index ?? line.length;
      const province = provinceMap[hit[0]];
      const segment = line.slice(hit.index, nextIndex);
      const tokens = extractLatencyTokens(segment).slice(0, 3);
      if (!province || tokens.length < 3) return;
      tokens.forEach((token, index) => {
        const carrier = carriers[index];
        if (carrier) matches[carrier].push({ carrier, region: province, latency: token.value, loss: token.loss, barLevel: token.barLevel, valueLevel: token.valueLevel, glyphs: token.glyphs });
      });
    });
  }
  return matches;
}

function extractLatencyTokens(segment: string): Array<{ value: number; loss: PacketLossLevel; barLevel: LatencyLevel; valueLevel: LatencyLevel; glyphs: Array<{ char: string; level: LatencyLevel }> }> {
  const tokens: Array<{ value: number; loss: PacketLossLevel; barLevel: LatencyLevel; valueLevel: LatencyLevel; glyphs: Array<{ char: string; level: LatencyLevel }> }> = [];
  let prefix = "";
  let ansiColor = "";
  for (let index = 0; index < segment.length;) {
    const ansi = segment.slice(index).match(/^\x1b\[([0-9;]*)m/);
    if (ansi) {
      ansiColor = ansi[1] ?? "";
      index += ansi[0].length;
      continue;
    }
    const digit = segment.slice(index).match(/^\d{1,3}/);
    if (digit) {
      const value = Number(digit[0]);
      const glyphs = glyphsFromVisual(prefix);
      const barLevel = worstLatencyLevel(glyphs.map((item) => item.level));
      const valueLevel = valueLevelFromVisual(ansiColor, value, barLevel);
      tokens.push({ value, loss: packetLossFromLevel(barLevel), barLevel, valueLevel, glyphs });
      prefix = "";
      index += digit[0].length;
      continue;
    }
    prefix += segment[index];
    index += 1;
  }
  return tokens;
}

function glyphsFromVisual(prefix: string): Array<{ char: string; level: LatencyLevel }> {
  const glyphs = prefix.replace(/[^\u2800-\u28ff]/g, "");
  return Array.from(glyphs).map((char) => ({ char, level: latencyLevelFromPacketLoss(decodeDelayGlyph(char)) }));
}

function worstLatencyLevel(levels: LatencyLevel[]): LatencyLevel {
  if (levels.includes("risk")) return "risk";
  if (levels.includes("watch")) return "watch";
  if (levels.includes("good")) return "good";
  return "unknown";
}

function latencyLevelFromPacketLoss(level: PacketLossLevel): LatencyLevel {
  if (level === "severe") return "risk";
  if (level === "moderate") return "watch";
  if (level === "none") return "good";
  return "unknown";
}

function valueLevelFromVisual(ansiColor: string, averageLatency: number, barLevel: LatencyLevel): LatencyLevel {
  const ansiCodes = ansiColor.split(";").map((code) => Number(code)).filter(Number.isFinite);
  if (ansiCodes.some((code) => [31, 91, 41, 101].includes(code))) return "risk";
  if (ansiCodes.some((code) => [33, 93, 43, 103].includes(code))) return "watch";
  if (ansiCodes.some((code) => [32, 92, 42, 102].includes(code))) return "good";
  if (averageLatency === 0 || averageLatency > 240 || barLevel === "risk") return "risk";
  if (averageLatency > 150) return "watch";
  return "good";
}

function packetLossFromLevel(level: LatencyLevel): PacketLossLevel {
  if (level === "risk") return "severe";
  if (level === "watch") return "moderate";
  if (level === "good") return "none";
  return "unknown";
}

function decodeDelayGlyph(glyph: string): PacketLossLevel {
  const bits = glyph.codePointAt(0);
  if (bits === undefined) return "unknown";
  const value = bits - 0x2800;
  const level = delayGlyphLevelMap.get(value);
  if (level) return level;
  return "unknown";
}

const delayGlyphLevelMap = buildDelayGlyphLevelMap();

function buildDelayGlyphLevelMap(): Map<number, PacketLossLevel> {
  const firstBuckets = [
    { value: 0x00, level: "severe" },
    { value: 0x40, level: "none" },
    { value: 0x44, level: "none" },
    { value: 0x46, level: "moderate" },
    { value: 0x47, level: "severe" },
  ] as const;
  const secondBuckets = [
    { value: 0x00, level: "severe" },
    { value: 0x80, level: "none" },
    { value: 0xa0, level: "none" },
    { value: 0xb0, level: "moderate" },
    { value: 0xb8, level: "severe" },
  ] as const;
  const map = new Map<number, PacketLossLevel>();
  for (const first of firstBuckets) {
    for (const second of secondBuckets) {
      map.set(first.value + second.value, worstPacketLoss(first.level, second.level));
    }
  }
  return map;
}

function worstPacketLoss(a: PacketLossLevel, b: PacketLossLevel): PacketLossLevel {
  if (a === "severe" || b === "severe") return "severe";
  if (a === "moderate" || b === "moderate") return "moderate";
  return "none";
}

function carrierNetworkEvidence(routeText: string, speedText: string, latencyText: string, traceText: string): Evidence[] {
  const lowLatency = parseRegionalLatency(latencyText);
  return (["电信", "联通", "移动"] as CarrierName[]).flatMap((carrier) => {
    const allLatency = lowLatency[carrier];
    const profile = {
      carrier,
      lowLatency: allLatency.filter((item) => item.latency <= 150 && (item.loss === "none" || item.loss === "unknown")).sort((a, b) => a.latency - b.latency).slice(0, 6),
      packetLossModerate: allLatency.filter((item) => item.loss === "moderate"),
      packetLossSevere: allLatency.filter((item) => item.loss === "severe"),
      ...carrierRouteProfile(routeText, carrier),
      routeMixed: [],
      ...carrierSpeedProfile(speedText, carrier),
    };
    return [carrierEvidence(profile), carrierRegionEvidence(profile), carrierLineEvidence(profile)];
  });
}

function carrierLineEvidence(profile: CarrierProfile): Evidence {
  const routeGood = profile.routeGood.length;
  const routeWatch = profile.routeWatch.length + profile.routeMixed.length;
  const routeBad = profile.routeBad.length;
  const premium = unique(profile.routeGood);
  const mixed = unique([...profile.routeWatch, ...profile.routeMixed]);
  const bad = unique(profile.routeBad);
  let grade = "一般";
  let severity: Severity = "watch";

  if (routeGood >= 4 && routeWatch === 0 && routeBad === 0) {
    grade = "顶级";
    severity = "good";
  } else if (routeGood > 0 && routeBad <= 1) {
    grade = routeWatch > 0 ? "精品混合" : "精品";
    severity = "good";
  } else if (routeGood > 0) {
    grade = "精品但绕路";
    severity = "watch";
  } else if (routeBad >= 2) {
    grade = "谨慎";
    severity = "risk";
  }

  const value = [
    premium.length > 0 ? `优质 ${premium.join("/")}` : "",
    mixed.length > 0 ? `混合 ${mixed.join("/")}` : "",
    bad.length > 0 ? `绕路 ${bad.join("/")}` : "",
  ].filter(Boolean).join("；") || "未识别优质回程";

  return {
    key: `net.line.${carrierKey(profile.carrier)}`,
    label: `${profile.carrier}线路`,
    value,
    grade,
    severity,
    meaning: `${profile.carrier}线路档位只描述回程质量，和地区快乐分开判断。`,
  };
}

function carrierEvidence(profile: CarrierProfile): Evidence {
  const speedBad = profile.speedErrors + profile.speedZeroReceive;
  const routeBad = profile.routeBad.length;
  const routeGood = Math.max(0, profile.routeGood.length - profile.routeMixed.length);
  const routeWatch = profile.routeWatch.length + profile.routeMixed.length;
  const stableLatency = profile.lowLatency.filter((item) => item.loss === "none" || item.loss === "unknown");
  const hasStableLatency = stableLatency.length > 0;
  const lossBad = profile.packetLossSevere.length;
  const lossWatch = profile.packetLossModerate.length;
  const isTop = routeGood >= 4 && routeBad === 0 && routeWatch === 0 && speedBad === 0 && lossBad === 0 && lossWatch === 0 && stableLatency.length >= 3;
  const isHappy = routeGood >= 2 && routeBad === 0 && speedBad === 0 && lossBad === 0 && lossWatch === 0 && hasStableLatency;
  const severity: Severity =
    isTop || isHappy ? "good" :
    routeBad >= 2 || speedBad >= 2 || lossBad >= 2 ? "risk" :
    "watch";
  const routeSummary = [
    profile.routeGood.length > 0 ? `优质线 ${unique(profile.routeGood).join("/")}` : "",
    profile.routeWatch.length + profile.routeMixed.length > 0 ? `普通线 ${unique([...profile.routeWatch, ...profile.routeMixed]).join("/")}` : "",
    profile.routeBad.length > 0 ? `绕路 ${unique(profile.routeBad).join("/")}` : "",
  ].filter(Boolean).join("，") || "线路证据不足";
  const speedSummary = speedBad > 0 ? `测速异常 ${speedBad} 个方向` : "测速无明显异常";
  const latencySummary = stableLatency.length > 0 ? `绿色稳定 ${stableLatency.slice(0, 4).map(formatRegionalLatency).join("、")}` : "未识别到绿色稳定地区";
  const lossSummary = lossBad > 0 ? `严重丢包 ${lossBad} 个地区` : lossWatch > 0 ? `一般丢包 ${lossWatch} 个地区` : "未见明显丢包";
  const grade = isTop ? "顶级" : isHappy ? "快乐" : severity === "risk" ? "谨慎" : "看地区";
  return {
    key: `net.carrier.${carrierKey(profile.carrier)}`,
    label: `${profile.carrier}代理`,
    value: `${routeSummary}；${latencySummary}；${lossSummary}；${speedSummary}`,
    grade,
    severity,
    meaning: carrierMeaning(profile.carrier, severity),
  };
}

function carrierRegionEvidence(profile: CarrierProfile): Evidence {
  const speedBad = profile.speedErrors + profile.speedZeroReceive;
  const routeBad = profile.routeBad.length;
  const routeGood = Math.max(0, profile.routeGood.length - profile.routeMixed.length);
  const routeWatch = profile.routeWatch.length + profile.routeMixed.length;
  const stableLatency = profile.lowLatency.filter((item) => item.loss === "none" || item.loss === "unknown");
  const moderateLatency = profile.packetLossModerate;
  const severeLatency = profile.packetLossSevere;
  const regions = stableLatency.map((item) => item.region);
  const hasHappyRegion = routeGood >= 1 && speedBad === 0 && stableLatency.length > 0;
  const grade = hasHappyRegion ? "快乐" : routeBad >= 2 || speedBad >= 2 || profile.packetLossSevere.length >= 2 ? "谨慎" : "看地区";
  const severity: Severity = grade === "快乐" ? "good" : grade === "谨慎" ? "risk" : "watch";
  const regionText = regions.length > 0 ? stableLatency.slice(0, 4).map((item) => `${item.region}${profile.carrier}`).join("、") : `${profile.carrier}未识别绿色稳定地区`;
  const caveat = [
    routeWatch > 0 ? "线路混合" : "",
    speedBad > 0 ? "测速异常" : "",
    routeBad > 0 ? "有绕路" : "",
    severeLatency.length > 0 ? `严重丢包 ${severeLatency.slice(0, 3).map(formatRegionalLatency).join("、")}` : "",
    moderateLatency.length > 0 ? `一般丢包 ${moderateLatency.slice(0, 3).map(formatRegionalLatency).join("、")}` : "",
  ].filter(Boolean).join("，");
  return {
    key: `net.region.${carrierKey(profile.carrier)}`,
    label: `${profile.carrier}地区`,
    value: caveat ? `${regionText}；${caveat}` : regionText,
    grade,
    severity,
    meaning: regions.length > 0 ? `这些地区在三网大包延迟里是绿色低丢包，适合作为 ${profile.carrier} 用户的优先使用方向；其他地区仍要看丢包和回程。` : `没有识别到 ${profile.carrier} 的明确可用地区。`,
  };
}

function formatRegionalLatency(item: RegionalLatency): string {
  return `${item.region}${item.latency}ms`;
}

function carrierRouteProfile(text: string, carrier: CarrierName): Pick<CarrierProfile, "routeGood" | "routeWatch" | "routeBad"> {
  const lines = text.split(/\r?\n/).filter((line) => /北京|上海|广州/.test(line));
  const profile = { routeGood: [] as string[], routeWatch: [] as string[], routeBad: [] as string[] };
  for (const line of lines) {
    const match = line.match(new RegExp(`${carrier}\\s+([^|\\n]+)`));
    if (!match?.[1]) continue;
    classifyCarrierRoute(carrier, clean(match[1]), profile);
  }
  return profile;
}

function classifyCarrierRoute(carrier: CarrierName, route: string, profile: Pick<CarrierProfile, "routeGood" | "routeWatch" | "routeBad">): void {
  if (!isValidRoute(route)) return;
  if (/CN2GIA/i.test(route)) {
    profile.routeGood.push(route);
    return;
  }
  if (carrier === "电信") {
    if (/CN2|CTGGIA|CTGNet/i.test(route)) profile.routeGood.push(route);
    else if (/4134|163|CHINANET/i.test(route)) profile.routeWatch.push(route);
    else profile.routeBad.push(route);
    return;
  }
  if (carrier === "联通") {
    if (/10099|CUG|9929/i.test(route)) profile.routeGood.push(route);
    else if (/NTT|Level3/i.test(route)) profile.routeBad.push(route);
    else if (/4837|CU169|CTGGIA|CTGNet/i.test(route)) profile.routeWatch.push(route);
    else profile.routeBad.push(route);
    return;
  }
  if (/CMIN2/i.test(route)) profile.routeGood.push(route);
  else if (/10099|CMI|CMNET/i.test(route)) profile.routeWatch.push(route);
  else if (/4837|NTT|Level3/i.test(route)) profile.routeBad.push(route);
  else profile.routeBad.push(route);
}

function isValidRoute(route: string): boolean {
  const cleanRoute = route.trim();
  return cleanRoute.length > 0 && !/^NoData\s*->\s*NoData$/i.test(cleanRoute) && !/^Unknown$/i.test(cleanRoute) && !/^NoData$/i.test(cleanRoute);
}

function traceMixedRoutes(text: string, carrier: CarrierName): string[] {
  if (!text || carrier !== "电信") return [];
  const mixed: string[] = [];
  const sections = text.split(/\n(?=\s*(北京|上海|广东|广州|深圳|成都|南京|武汉|杭州)\s+电信)/);
  for (const section of sections) {
    if (!/电信/.test(section)) continue;
    const hasCn2 = /59\.43|CN2|CTG-CN|AS4809/i.test(section);
    const fallsTo163 = /202\.97|AS4134|CHINANET|163/i.test(section);
    if (hasCn2 && fallsTo163) mixed.push("CN2混合/GT");
  }
  return mixed;
}

function carrierSpeedProfile(text: string, carrier: CarrierName): Pick<CarrierProfile, "speedErrors" | "speedZeroReceive"> {
  let speedErrors = 0;
  let speedZeroReceive = 0;
  const cells = text.split(/\r?\n/).flatMap((line) => line.split("||"));
  for (const cell of cells) {
    if (!cell.includes(carrier)) continue;
    if (/ERROR/.test(cell)) {
      speedErrors += 1;
      continue;
    }
    const values = Array.from(cell.matchAll(/\b\d+\b/g)).map((match) => Number(match[0]));
    if (values[2] === 0) speedZeroReceive += 1;
  }
  return { speedErrors, speedZeroReceive };
}

function carrierKey(carrier: CarrierName): "telecom" | "unicom" | "mobile" {
  if (carrier === "电信") return "telecom";
  if (carrier === "联通") return "unicom";
  return "mobile";
}

function carrierMeaning(carrier: CarrierName, severity: Severity): string {
  if (severity === "good") return `${carrier}方向具备优质回程、低延迟和正常测速，可以作为代理主力方向。`;
  if (severity === "risk") return `${carrier}方向存在绕路或测速异常，不建议直接当主力。`;
  return `${carrier}方向有可用点，但要按具体地区和线路选择。`;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values)).slice(0, 3);
}

function routeEvidence(text: string): Evidence | undefined {
  if (!text) return undefined;
  const premium = (text.match(/CN2|CMIN2|10099|CTGGIA/g) ?? []).length;
  const normal = (text.match(/4837|NTT|Level3/g) ?? []).length;
  const severity: Severity = premium >= 6 ? "good" : premium >= 3 ? "watch" : "risk";
  const grade = severity === "good" ? "优质回程较多" : severity === "watch" ? "混合回程" : "普通/绕路较多";
  return { key: "net.route", label: "三网回程", value: `优质 ${premium} / 普通 ${normal}`, grade, severity, meaning: "CN2、CMIN2、10099、CTGGIA 通常比普通 4837/NTT/Level3 更有价值。" };
}

function domesticSpeedEvidence(text: string): Evidence | undefined {
  if (!text) return undefined;
  const errors = (text.match(/ERROR/g) ?? []).length;
  const zeroReceive = (text.match(/\s0\s+\d+/g) ?? []).length;
  if (errors > 0 || zeroReceive > 0) return { key: "net.domestic.speed", label: "国内测速", value: `ERROR ${errors} / 接收 0 ${zeroReceive}`, grade: "部分方向异常", severity: "risk", meaning: "国内测速 ERROR 或接收为 0，说明对应运营商方向可能不可用或极不稳定。" };
  return { key: "net.domestic.speed", label: "国内测速", value: "无明显 ERROR", grade: "可读", severity: "watch", meaning: "仍需按具体运营商和地区看速度。" };
}

function packetLossEvidence(text: string): Evidence | undefined {
  if (!text) return undefined;
  const values = Array.from(text.matchAll(/(?:丢包|loss|Loss|LOSS)[^\d]*(\d+(\.\d+)?)\s*%/g)).map((match) => Number(match[1]));
  if (values.length === 0) return undefined;
  const max = Math.max(...values);
  const severity: Severity = max === 0 ? "good" : max <= 1 ? "watch" : "risk";
  const grade = max === 0 ? "无丢包" : max <= 1 ? "轻微丢包" : "丢包明显";
  return { key: "net.packet.loss", label: "丢包", value: `最高 ${max}%`, grade, severity, meaning: "代理体感不只看延迟，丢包会直接影响稳定性和速度。" };
}

function internationalEvidence(text: string): Evidence | undefined {
  if (!text) return undefined;
  const errors = (text.match(/ERROR/g) ?? []).length;
  const retrans = Array.from(text.matchAll(/\s(\d+)k/g)).map((match) => Number(match[1]));
  const maxRetrans = retrans.length > 0 ? Math.max(...retrans) : 0;
  const severity: Severity = errors > 0 || maxRetrans >= 5 ? "risk" : maxRetrans > 0 ? "watch" : "good";
  const grade = severity === "risk" ? "重传/失败明显" : severity === "watch" ? "有重传" : "稳定";
  return { key: "net.international", label: "国际互连", value: `ERROR ${errors} / 最大重传 ${maxRetrans}k`, grade, severity, meaning: "国际互连重传高会影响跨区域下载、代理和远程连接。" };
}

function traceRiskEvidence(text: string): Evidence | undefined {
  if (!text) return undefined;
  const badRoutes = (text.match(/美国|洛杉矶|日本|东京|新加坡/g) ?? []).length;
  const severity: Severity = badRoutes >= 4 ? "risk" : badRoutes > 0 ? "watch" : "good";
  const grade = severity === "risk" ? "部分绕路明显" : severity === "watch" ? "有绕路" : "路径直接";
  return { key: "net.trace", label: "回程路径", value: `绕路关键词 ${badRoutes}`, grade, severity, meaning: "回程绕到日本、新加坡、美国会增加延迟，尤其影响目标地区用户。" };
}

function gradeVirt(value: string): Omit<Evidence, "key" | "label" | "value"> {
  const good = /KVM/i.test(value);
  return { grade: good ? "KVM" : "待确认", severity: good ? "good" : "watch", meaning: good ? "KVM 是常见完整虚拟化，适合大多数 VPS 场景。" : "非 KVM 需要确认限制。" };
}

function gradeArch(value: string): Omit<Evidence, "key" | "label" | "value"> {
  const good = /x86_64|amd64/i.test(value);
  return { grade: good ? "兼容性好" : "待确认", severity: good ? "good" : "watch", meaning: good ? "x86_64 软件兼容性最好。" : "非 x86_64 可能遇到软件兼容问题。" };
}

function gradeIpType(value: string): Omit<Evidence, "key" | "label" | "value"> {
  return { grade: /广播/.test(value) ? "广播 IP" : "普通", severity: /广播/.test(value) ? "watch" : "good", meaning: "广播 IP 可能带来地区库不一致，流媒体和风控要看实际检测。" };
}

function gradeRegisteredLocation(value: string): Omit<Evidence, "key" | "label" | "value"> {
  return { grade: "注册信息", severity: "watch", meaning: "注册地和使用地不一定一致；流媒体和送中判断以 Google/ChatGPT 等服务检测为准。" };
}

function gradeNat(value: string): Omit<Evidence, "key" | "label" | "value"> {
  const good = /无NAT|开放/.test(value);
  return { grade: good ? "开放" : "受限", severity: good ? "good" : "watch", meaning: good ? "开放网络无 NAT，对入站和网络测试更友好。" : "NAT 可能限制端口和入站连接。" };
}

function gradeCpuSingle(value: number): Omit<Evidence, "key" | "label" | "value"> {
  if (value < 800) return { grade: "很差", severity: "risk", meaning: "低于 800，适合轻量代理/探针，不适合动态网站。" };
  if (value < 1200) return { grade: "一般", severity: "watch", meaning: "800~1200，日常轻量用途够用，建站要看访问量。" };
  if (value < 1600) return { grade: "不错", severity: "good", meaning: "1200~1600，常规小站、后台和脚本响应会比较舒服。" };
  if (value < 2000) return { grade: "很好", severity: "good", meaning: "1600~2000，CPU 单核是明显加分项。" };
  return { grade: "顶级", severity: "good", meaning: "2000+，属于 VPS 里很强的单核表现。" };
}

function gradeL3(valueMb: number): Omit<Evidence, "key" | "label" | "value"> {
  if (valueMb < 10) return { grade: "老 CPU", severity: "risk", meaning: "L3 小于 10MB，通常是老平台或分配较少。" };
  if (valueMb < 20) return { grade: "一般", severity: "watch", meaning: "10~20MB，够轻量用途。" };
  if (valueMb < 40) return { grade: "不错", severity: "good", meaning: "20~40MB，缓存表现不错。" };
  if (valueMb < 80) return { grade: "很强", severity: "good", meaning: "40~80MB，属于比较强的服务器 CPU 缓存。" };
  return { grade: "高端服务器", severity: "good", meaning: "80MB+，缓存规格很高。" };
}

function gradeMemorySpeed(value: number): Omit<Evidence, "key" | "label" | "value"> {
  if (value < 20000) return { grade: "一般", severity: "watch", meaning: "低于 20000 MB/s，内存吞吐普通。" };
  if (value < 40000) return { grade: "不错", severity: "good", meaning: "20000~40000 MB/s，日常服务足够。" };
  if (value < 60000) return { grade: "很好", severity: "good", meaning: "40000~60000 MB/s，内存吞吐很强。" };
  return { grade: "顶级", severity: "good", meaning: "60000+ MB/s，属于顶级内存吞吐。" };
}

function gradeMemoryLatency(value: number): Omit<Evidence, "key" | "label" | "value"> {
  if (value < 120) return { grade: "顶级", severity: "good", meaning: "低于 120ns，内存延迟非常好。" };
  if (value < 180) return { grade: "很好", severity: "good", meaning: "120~180ns，延迟表现很好。" };
  if (value < 250) return { grade: "一般", severity: "watch", meaning: "180~250ns，能用但不算快。" };
  return { grade: "偏慢", severity: "risk", meaning: "高于 250ns，内存访问延迟可能拖慢部分应用。" };
}

function gradeDisk4k(value: number): Omit<Evidence, "key" | "label" | "value"> {
  if (value < 20) return { grade: "偏差", severity: "risk", meaning: "4K 随机读写低于 20MB/s，会影响网站后台、MySQL 和 Docker。" };
  if (value < 40) return { grade: "普通", severity: "watch", meaning: "20~40MB/s，轻量用途可以，数据库体验一般。" };
  if (value < 80) return { grade: "不错", severity: "good", meaning: "40~80MB/s，常规建站可用。" };
  if (value < 150) return { grade: "很强", severity: "good", meaning: "80~150MB/s，随机 I/O 很强。" };
  return { grade: "顶级", severity: "good", meaning: "150MB/s+，随机读写属于顶级。" };
}

function gradeIops(value: number): Omit<Evidence, "key" | "label" | "value"> {
  if (value < 5000) return { grade: "差", severity: "risk", meaning: "低于 5k IOPS，小文件和数据库会明显吃力。" };
  if (value < 20000) return { grade: "普通", severity: "watch", meaning: "5k~20k IOPS，轻量用途可用。" };
  if (value < 50000) return { grade: "不错", severity: "good", meaning: "20k~50k IOPS，建站和数据库较稳。" };
  if (value < 100000) return { grade: "很好", severity: "good", meaning: "50k~100k IOPS，小文件能力很好。" };
  return { grade: "顶级", severity: "good", meaning: "100k+ IOPS，随机能力非常强。" };
}

function gradeSeq(value: number): Omit<Evidence, "key" | "label" | "value"> {
  if (value < 300) return { grade: "一般", severity: "watch", meaning: "顺序读写低于 300MB/s，大文件处理一般。" };
  if (value < 800) return { grade: "不错", severity: "good", meaning: "300~800MB/s，备份、下载和解压够用。" };
  if (value < 1500) return { grade: "很好", severity: "good", meaning: "800~1500MB/s，大文件能力很好。" };
  return { grade: "很强", severity: "good", meaning: "1500MB/s+，顺序读写很强。" };
}

function gradeHq(value: number): Omit<Evidence, "key" | "label" | "value"> {
  if (value < 5000) return { grade: "较差", severity: "risk", meaning: "HQ 分低于 5000，硬件综合表现偏弱。" };
  if (value < 10000) return { grade: "一般", severity: "watch", meaning: "5000~10000，综合表现普通。" };
  if (value < 20000) return { grade: "不错", severity: "good", meaning: "10000~20000，综合硬件表现不错。" };
  return { grade: "很强", severity: "good", meaning: "20000+，综合硬件分很强；但仍不能单独代替网络和 IP 判断。" };
}

function cpuVerdict(evidence: Evidence[]): string {
  return verdictFromEvidence(evidence, "CPU 证据不足，不能只看型号判断性能。", "CPU 有可用证据，适合轻量服务。");
}

function memoryVerdict(evidence: Evidence[]): string {
  return verdictFromEvidence(evidence, "没有内存测试数据。", "内存表现可读，按用途控制负载。");
}

function diskVerdict(evidence: Evidence[]): string {
  return verdictFromEvidence(evidence, "没有磁盘测试数据。", "磁盘有可用证据，适合轻量用途。");
}

function ipVerdict(evidence: Evidence[]): string {
  return verdictFromEvidence(evidence, "没有 IP 质量数据。", "IP 风险整体可读，仍要按目标服务确认。");
}

function netVerdict(evidence: Evidence[]): string {
  return verdictFromEvidence(evidence, "没有网络质量数据。", "网络质量有可用证据，按目标地区确认。");
}

function verdictFromEvidence(evidence: Evidence[], empty: string, ok: string): string {
  if (evidence.length === 0) return empty;
  const risks = evidence.filter((item) => item.severity === "risk").slice(0, 2);
  if (risks.length > 0) return `${risks.map(formatEvidence).join("、")}，需要优先确认。`;
  return ok;
}

function evidenceMetric(evidence: Evidence): Metric {
  return { label: evidence.label, value: evidence.value, grade: evidence.grade, severity: evidence.severity, note: `${evidence.grade}：${evidence.meaning}` };
}

function evidenceFor(evidence: Evidence[], keys: string[]): Evidence[] {
  return evidence.filter((item) => keys.includes(item.key)).slice(0, 5);
}

function evidenceForPrefix(evidence: Evidence[], prefix: string): Evidence[] {
  return evidence.filter((item) => item.key.startsWith(prefix)).slice(0, 6);
}

function combineEvidenceSeverity(evidence: Evidence[], fallback: Severity): Severity {
  if (evidence.length === 0) return fallback;
  if (evidence.some((item) => item.severity === "risk")) return "risk";
  if (evidence.some((item) => item.severity === "watch")) return "watch";
  return "good";
}

function compactEvidence(values: Array<Evidence | undefined>): Evidence[] {
  const seen = new Set<string>();
  return values.filter((value): value is Evidence => {
    if (!value) return false;
    if (seen.has(value.key)) return false;
    seen.add(value.key);
    return true;
  });
}

function severityRank(severity: Severity): number {
  if (severity === "risk") return 3;
  if (severity === "watch") return 2;
  return 1;
}

function numberAfter(text: string, patterns: RegExp[]): number | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return Number(match[1]);
  }
  return undefined;
}

function parseSizeToMb(value: string): number {
  const match = value.match(/(\d+(\.\d+)?)\s*([KMGT]?B?)/i);
  if (!match) return 0;
  const raw = Number(match[1]);
  const unit = match[3].toUpperCase();
  if (unit.startsWith("T")) return raw * 1024 * 1024;
  if (unit.startsWith("G")) return raw * 1024;
  if (unit.startsWith("K")) return raw / 1024;
  return raw;
}

function formatNumber(value: number): string {
  if (value >= 1000) return `${Math.round(value / 100) / 10}k`;
  return String(value);
}

function formatEvidence(item: Evidence): string {
  return `${item.label} ${item.value}=${item.grade}`;
}

function clean(value: string): string {
  return value.replace(/\*\*/g, "").replace(/`/g, "").replace(/\s+/g, " ").trim();
}
