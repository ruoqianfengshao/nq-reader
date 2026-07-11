export type Severity = "good" | "watch" | "risk";

export type Metric = {
  label: string;
  value: string;
  note: string;
  severity: Severity;
  grade?: string;
};

export type Insight = {
  title: string;
  body: string;
  severity: Severity;
};

export type ReportModule = {
  title: string;
  summary: string;
  takeaway: string;
  whyItMatters: string;
  verdict: string;
  severity: Severity;
  items: Metric[];
};

export type UseCaseVerdict = {
  name: string;
  verdict: string;
  severity: Severity;
  reason: string;
  evidence: string[];
};

export type AnalysisResult = {
  title: string;
  health: number;
  verdict: string;
  plainSummary: string;
  audienceSummary: string;
  useCases: UseCaseVerdict[];
  sourceKind: "url" | "markdown" | "empty";
  metrics: Metric[];
  insights: Insight[];
  modules: ReportModule[];
  sections: string[];
  glossary: string[];
  nextSteps: string[];
  detectedSignals: string[];
  latencyMatrix: LatencyMatrixRow[];
};

export type Evidence = {
  key: string;
  label: string;
  value: string;
  grade: string;
  severity: Severity;
  meaning: string;
};

export type CarrierName = "电信" | "联通" | "移动";

export type PacketLossLevel = "unknown" | "none" | "moderate" | "severe";
export type LatencyLevel = "unknown" | "good" | "watch" | "risk";

export type RegionalLatency = {
  carrier: CarrierName;
  region: string;
  latency: number;
  loss: PacketLossLevel;
  barLevel: LatencyLevel;
  valueLevel: LatencyLevel;
  glyphs: Array<{
    char: string;
    level: LatencyLevel;
  }>;
};

export type LatencyMatrixRow = {
  province: string;
  region: string;
  telecom?: RegionalLatency;
  unicom?: RegionalLatency;
  mobile?: RegionalLatency;
};

export type CarrierProfile = {
  carrier: CarrierName;
  lowLatency: RegionalLatency[];
  packetLossModerate: RegionalLatency[];
  packetLossSevere: RegionalLatency[];
  routeGood: string[];
  routeWatch: string[];
  routeBad: string[];
  routeMixed: string[];
  speedErrors: number;
  speedZeroReceive: number;
};

export type ReportParts = {
  header: string;
  hardware: string;
  ip: string;
  net: string;
  trace: string;
};
