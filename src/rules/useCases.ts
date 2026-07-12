import type { CarrierName, Evidence, Severity, UseCaseVerdict } from "../analyzerTypes";

export function buildUseCases(evidence: Evidence[]): UseCaseVerdict[] {
  const siteEvidence = evidenceFor(evidence, ["cpu.sysbench.single", "memory.amount", "memory.read", "memory.latency", "disk.rnd4k.read", "disk.rnd4k.write", "disk.rnd4k.iops.read"]);
  const proxyEvidence = [
    ...evidenceFor(evidence, ["net.carrier.telecom", "net.carrier.unicom", "net.carrier.mobile"]),
    ...evidenceFor(evidence, ["net.region.telecom", "net.region.unicom", "net.region.mobile"]),
    ...evidenceFor(evidence, ["net.line.telecom", "net.line.unicom", "net.line.mobile"]),
    ...evidenceFor(evidence, ["net.tcp.latency", "net.route", "net.domestic.speed", "net.packet.loss", "net.international", "net.trace"]),
  ].filter((item, index, list) => list.findIndex((candidate) => candidate.key === item.key) === index).slice(0, 17);
  const storageEvidence = evidenceFor(evidence, ["disk.capacity", "disk.seq.read", "disk.seq.write", "disk.rnd4k.read", "disk.rnd4k.write"]);
  const accountEvidence = [
    ...evidence.filter((item) => item.key === "ip.unlock.ChatGPT"),
    ...evidenceFor(evidence, ["ip.region.leak", "ip.location", "ip.registered", "ip.type", "ip.type.mix"]),
    ...evidenceForPrefix(evidence, "ip.unlock."),
    ...evidenceFor(evidence, ["ip.blacklist", "ip.mail25", "ip.risk.ipapi"]),
  ].filter((item, index, list) => list.findIndex((candidate) => candidate.key === item.key) === index).slice(0, 10);

  return [
    proxyUseCase(proxyEvidence),
    mediaUseCase(accountEvidence),
    simpleUseCase("建站", siteEvidence, "建站看 CPU 单核、内存余量、4K 随机读写和 IOPS。", "轻量站可用", "不适合数据库站", "备用小站"),
    storageUseCase(storageEvidence),
  ];
}

function simpleUseCase(name: string, evidence: Evidence[], guidance: string, good: string, risk: string, watch: string): UseCaseVerdict {
  const severity = combineEvidenceSeverity(evidence, "watch");
  return {
    name,
    severity,
    verdict: severity === "good" ? good : severity === "risk" ? risk : watch,
    reason: evidence.length > 0 ? `依据：${evidence.map(formatEvidence).join("；")}。${guidance}` : guidance,
    evidence: evidence.map(formatEvidence),
  };
}

function proxyUseCase(evidence: Evidence[]): UseCaseVerdict {
  const carriers = evidence.filter((item) => item.key.startsWith("net.carrier."));
  const regions = evidence.filter((item) => item.key.startsWith("net.region."));
  const lines = evidence.filter((item) => item.key.startsWith("net.line."));
  const international = evidence.find((item) => item.key === "net.international");

  const topCarriers = carriers.filter((item) => item.grade === "顶级").map(carrierNameFromEvidence);
  const happyCarriers = carriers.filter((item) => item.grade === "快乐").map(carrierNameFromEvidence);
  const goodCarriers = [...topCarriers, ...happyCarriers];
  const watchCarriers = carriers.filter((item) => item.severity === "watch").map(carrierNameFromEvidence);
  const riskCarriers = carriers.filter((item) => item.severity === "risk").map(carrierNameFromEvidence);

  const happyRegions = regions.filter((item) => item.grade === "快乐").flatMap(regionNamesFromEvidence);
  const watchRegions = regions.filter((item) => item.grade === "看地区").flatMap(regionNamesFromEvidence).slice(0, 3);

  let verdict = proxyBestVerdict({ lines, happyRegions, watchRegions, topCarriers, happyCarriers, goodCarriers, watchCarriers, riskCarriers });
  let severity = proxyBaseSeverity(verdict, watchCarriers, riskCarriers, international);

  const cautions = [
    riskCarriers.length > 0 ? `${riskCarriers.join("、")}不建议主力` : "",
    international?.severity === "risk" ? "国际互连有 ERROR/重传" : "",
  ].filter(Boolean);
  const reason = carriers.length > 0
    ? `${carriers.map((item) => `${carrierNameFromEvidence(item)}：${item.value}`).join("；")}。${cautions.length > 0 ? `${cautions.join("，")}。` : ""}`
    : "代理要分运营商看：低延迟只说明距离近，回程线路和国内测速异常会直接影响体感。";

  if (/毕业[机鸡]/.test(verdict)) severity = "good";
  else if (/备用[机鸡]/.test(verdict)) severity = "risk";

  return {
    name: "代理",
    verdict,
    severity,
    reason,
    evidence: evidence.map(formatEvidence),
  };
}

function proxyBestVerdict(input: {
  lines: Evidence[];
  happyRegions: string[];
  watchRegions: string[];
  topCarriers: CarrierName[];
  happyCarriers: CarrierName[];
  goodCarriers: CarrierName[];
  watchCarriers: CarrierName[];
  riskCarriers: CarrierName[];
}): string {
  const { lines, happyRegions, watchRegions, topCarriers, happyCarriers, goodCarriers, watchCarriers, riskCarriers } = input;
  const lineType = lineSummary(lines, topCarriers);
  const bestRegion = happyRegionSummary(happyRegions)[0];
  const regionTail = bestRegion ? `，${bestRegion}快乐` : "";
  const watchTail = watchRegions.length > 0 ? `，${watchRegions[0]}看地区` : "";

  if (lineType) return `${lineType}${regionTail || watchTail}`;
  if (bestRegion) return `${bestRegion}快乐`;
  return proxyBaseVerdict({ happyRegions, watchRegions, topCarriers, happyCarriers, goodCarriers, watchCarriers, riskCarriers });
}

function proxyBaseVerdict(input: {
  happyRegions: string[];
  watchRegions: string[];
  topCarriers: CarrierName[];
  happyCarriers: CarrierName[];
  goodCarriers: CarrierName[];
  watchCarriers: CarrierName[];
  riskCarriers: CarrierName[];
}): string {
  const { happyRegions, watchRegions, topCarriers, happyCarriers, goodCarriers, watchCarriers, riskCarriers } = input;
  if (happyRegions.length > 0) {
    return `${happyRegionSummary(happyRegions).join("/")}快乐${watchRegions.length > 0 ? `，${watchRegions.join("/")}看地区` : ""}`;
  }
  if (topCarriers.length === 3) return "三网顶级线路";
  if (topCarriers.length > 0) {
    return `${topCarriers.join("/")}顶级线${happyCarriers.length > 0 ? `，${happyCarriers.join("/")}快乐鸡` : ""}${watchCarriers.length > 0 ? `，${watchCarriers.join("/")}看地区` : ""}`;
  }
  if (goodCarriers.length === 3) return "三网快乐鸡";
  if (goodCarriers.length > 0) return `${goodCarriers.join("/")}快乐鸡${watchCarriers.length > 0 ? `，${watchCarriers.join("/")}看地区` : ""}`;
  if (watchCarriers.length > 0) return `${watchCarriers.join("/")}看地区`;
  if (riskCarriers.length > 0) return "备用鸡";
  return "按地区使用";
}

function proxyBaseSeverity(verdict: string, watchCarriers: CarrierName[], riskCarriers: CarrierName[], international?: Evidence): Severity {
  if (/备用[机鸡]/.test(verdict)) return "risk";
  if (/快乐|顶级/.test(verdict) && watchCarriers.length === 0 && riskCarriers.length === 0 && international?.severity !== "risk") return "good";
  return "watch";
}

function isLandingMachine(location: Evidence | undefined, unlockedCount: number, blockedCount: number, regionLeak?: Evidence, blacklist?: Evidence, ipRisk: Evidence[] = []): boolean {
  return Boolean(location && /\[[A-Z]{2}\]/.test(location.value) && !/\[CN\]|中国|大陆/.test(location.value)) &&
    unlockedCount >= 3 &&
    blockedCount <= 1 &&
    regionLeak?.severity !== "risk" &&
    blacklist?.severity !== "risk" &&
    ipRisk.filter((item) => item.severity === "risk").length <= 1;
}

function landingRegionName(location?: Evidence): string {
  const value = location?.value ?? "";
  const match = value.match(/\[([A-Z]{2})\]/);
  const code = match?.[1] ?? "";
  const names: Record<string, string> = {
    HK: "香港",
    JP: "日本",
    US: "美国",
    SG: "新加坡",
    KR: "韩国",
    TW: "台湾",
    GB: "英国",
    DE: "德国",
    FR: "法国",
    NL: "荷兰",
    AU: "澳洲",
    CA: "加拿大",
  };
  return names[code] ?? "";
}

function lineSummary(lines: Evidence[], topCarriers: CarrierName[]): string {
  const best = lines.filter((item) => item.grade === "顶级" || item.grade === "精品" || item.grade === "精品混合");
  if (best.length === 0) return "";
  if (best.length === 3 && best.every((item) => item.grade === "顶级") && topCarriers.length === 3) return "三网顶级线路";
  if (best.length === 3) return "三网精品线路";
  return best.map((item) => `${carrierNameFromEvidence(item)}${item.grade}线路`).join("/");
}

function happyRegionSummary(regions: string[]): string[] {
  const carriers: CarrierName[] = ["电信", "联通", "移动"];
  const summarized = carriers
    .filter((carrier) => regions.filter((region) => region.endsWith(carrier)).length >= 4)
    .map((carrier) => carrier);
  const summarizedCarriers = new Set(summarized);
  const remaining = regions.filter((region) => !carriers.some((carrier) => summarizedCarriers.has(carrier) && region.endsWith(carrier)));
  return [...summarized, ...remaining].slice(0, 3);
}

function storageUseCase(evidence: Evidence[]): UseCaseVerdict {
  const capacity = evidence.find((item) => item.key === "disk.capacity");
  const seqGood = evidence.some((item) => /^disk\.seq\./.test(item.key) && item.severity === "good");
  const randomRisk = evidence.some((item) => /^disk\.rnd4k\./.test(item.key) && item.severity === "risk");
  const largeDisk = Boolean(capacity && /(\d+(\.\d+)?)\s*(T|TB|TiB)|总\s*(\d{3,})\s*G/i.test(capacity.value));

  let verdict = "备用盘";
  let severity: Severity = "watch";
  if (largeDisk && seqGood && !randomRisk) {
    verdict = "大盘鸡";
    severity = "good";
  } else if (largeDisk) {
    verdict = randomRisk ? "大盘鸡，数据库谨慎" : "大盘鸡";
    severity = randomRisk ? "watch" : "good";
  } else if (randomRisk) {
    verdict = "不适合存储服务";
    severity = "risk";
  } else if (seqGood) {
    verdict = "轻量下载可用";
    severity = "good";
  }

  return {
    name: "存储",
    verdict,
    severity,
    reason: evidence.length > 0 ? `依据：${evidence.map(formatEvidence).join("；")}。存储看容量、顺序读写和网络；跑服务还要看 4K。` : "存储看容量、顺序读写和网络；跑服务还要看 4K。",
    evidence: evidence.map(formatEvidence),
  };
}

function mediaUseCase(evidence: Evidence[]): UseCaseVerdict {
  const unlocks = evidence.filter((item) => item.key.startsWith("ip.unlock."));
  const location = evidence.find((item) => item.key === "ip.location");
  const chatgpt = evidence.find((item) => item.key === "ip.unlock.ChatGPT");
  const regionLeak = evidence.find((item) => item.key === "ip.region.leak");
  const ipRisks = evidence.filter((item) => item.key.startsWith("ip.risk."));
  const blacklist = evidence.find((item) => item.key === "ip.blacklist");
  const unlockedCount = unlocks.filter((item) => item.severity === "good").length;
  const limitedCount = unlocks.filter((item) => item.severity === "watch").length;
  const blockedCount = unlocks.filter((item) => item.severity === "risk").length;
  const hasCnRisk = regionLeak?.severity === "risk";
  const chatgptOk = chatgpt?.severity === "good";
  const chatgptLimited = chatgpt?.severity === "watch";
  const riskCount = ipRisks.filter((item) => item.severity === "risk").length;
  const isLanding = isLandingMachine(location, unlockedCount, blockedCount, regionLeak, blacklist, ipRisks);

  let verdict = "流媒体解锁鸡";
  let severity: Severity = "good";
  if (hasCnRisk || blockedCount >= 3 || blacklist?.severity === "risk" || riskCount >= 2) {
    verdict = "流媒体风控鸡";
    severity = "risk";
  } else if (isLanding) {
    verdict = `${landingRegionName(location)}落地鸡`;
    severity = "good";
  } else if (unlockedCount >= 4 && chatgptOk) {
    verdict = "AI / 流媒体快乐鸡";
    severity = "good";
  } else if (unlockedCount >= 4 && chatgptLimited) {
    verdict = "流媒体快乐鸡，AI 受限";
    severity = "watch";
  } else if (unlockedCount >= 3) {
    verdict = "流媒体可用";
    severity = limitedCount > 0 ? "watch" : "good";
  } else if (unlockedCount > 0) {
    verdict = "部分流媒体可用";
    severity = "watch";
  } else {
    verdict = "不适合流媒体";
    severity = "risk";
  }

  const reason = [
    `解锁 ${unlockedCount} 个服务`,
    limitedCount > 0 ? `受限 ${limitedCount} 个` : "",
    blockedCount > 0 ? `不可用 ${blockedCount} 个` : "",
    chatgpt ? `ChatGPT ${chatgpt.grade}` : "",
    regionLeak ? `送中风险 ${regionLeak.grade}` : "",
  ].filter(Boolean).join("；");

  return {
    name: "AI / 流媒体",
    verdict,
    severity,
    reason,
    evidence: evidence.map(formatEvidence),
  };
}

function carrierNameFromEvidence(item: Evidence): CarrierName {
  if (item.label.includes("电信")) return "电信";
  if (item.label.includes("联通")) return "联通";
  return "移动";
}

function regionNamesFromEvidence(item: Evidence): string[] {
  return item.value
    .split("；")[0]
    .split("、")
    .map((value) => value.trim())
    .filter((value) => /电信|联通|移动/.test(value) && !/未识别/.test(value));
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

function formatEvidence(item: Evidence): string {
  return `${item.label} ${item.value}=${item.grade}`;
}
