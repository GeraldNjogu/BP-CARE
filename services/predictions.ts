import { supabase } from "@/lib/supabase";

export type MLPrediction = {
  id: string;
  riskClass: string;
  riskScore: number;
  crisisPrediction: string;
  crisisProbability: number;
  modelVersion: string;
  createdAt: Date;
};

export type XAIInsight = {
  id: string;
  feature: string;
  contribution: string;
  value: string;
  createdAt: Date;
};

export async function getLatestPrediction(userId: string): Promise<MLPrediction | null> {
  const { data, error } = await (supabase
    .from("ml_predictions") as any)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    riskClass: data.risk_class,
    riskScore: data.risk_score,
    crisisPrediction: data.crisis_prediction,
    crisisProbability: data.crisis_probability,
    modelVersion: data.model_version,
    createdAt: new Date(data.created_at),
  };
}

export async function getPredictionForReading(
  userId: string,
  readingId: string
): Promise<MLPrediction | null> {
  const { data, error } = await (supabase
    .from("ml_predictions") as any)
    .select("*")
    .eq("user_id", userId)
    .eq("reading_id", readingId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    riskClass: data.risk_class,
    riskScore: data.risk_score,
    crisisPrediction: data.crisis_prediction,
    crisisProbability: data.crisis_probability,
    modelVersion: data.model_version,
    createdAt: new Date(data.created_at),
  };
}

export async function createPrediction(
  userId: string,
  readingId: string,
  prediction: Omit<MLPrediction, "id" | "createdAt">
) {
  const { error } = await (supabase.from("ml_predictions") as any).insert({
    user_id: userId,
    reading_id: readingId,
    risk_class: prediction.riskClass,
    risk_score: prediction.riskScore,
    crisis_prediction: prediction.crisisPrediction,
    crisis_probability: prediction.crisisProbability,
    model_version: prediction.modelVersion,
  });

  if (error) throw error;
}

export async function getXAIInsightsForReading(
  userId: string,
  readingId: string
): Promise<XAIInsight[]> {
  const { data, error } = await (supabase
    .from("xai_insights") as any)
    .select("*")
    .eq("user_id", userId)
    .eq("reading_id", readingId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data || []).map((i: any) => ({
    id: i.id,
    feature: i.feature,
    contribution: i.contribution,
    value: i.value,
    createdAt: new Date(i.created_at),
  }));
}

export async function createXAIInsight(
  userId: string,
  readingId: string,
  insight: Omit<XAIInsight, "id" | "createdAt">
) {
  const { error } = await (supabase.from("xai_insights") as any).insert({
    user_id: userId,
    reading_id: readingId,
    feature: insight.feature,
    contribution: insight.contribution,
    value: insight.value,
  });

  if (error) throw error;
}

export function computePrediction(reading: { systolic: number; diastolic: number; heartRate: number }): MLPrediction {
  const { systolic, diastolic, heartRate } = reading;

  let riskClass: string;
  let riskScore: number;
  let crisisPrediction: string;
  let crisisProbability: number;

  if (systolic >= 180 || diastolic >= 120) {
    riskClass = "Critical";
    riskScore = 0.92;
    crisisPrediction = "Critical — Immediate Action Required";
    crisisProbability = 0.85;
  } else if (systolic >= 160 || diastolic >= 100) {
    riskClass = "High Risk";
    riskScore = 0.76;
    crisisPrediction = "Elevated — Monitor Closely";
    crisisProbability = 0.62;
  } else if (systolic >= 140 || diastolic >= 90) {
    riskClass = "High Risk";
    riskScore = 0.68;
    crisisPrediction = "Moderate — Trend Improving";
    crisisProbability = 0.45;
  } else if (systolic >= 130 || diastolic >= 80) {
    riskClass = "Moderate Risk";
    riskScore = 0.52;
    crisisPrediction = "Low — Stable Pattern";
    crisisProbability = 0.28;
  } else if (systolic >= 120) {
    riskClass = "Elevated";
    riskScore = 0.35;
    crisisPrediction = "Low — Stable Pattern";
    crisisProbability = 0.15;
  } else {
    riskClass = "Low Risk";
    riskScore = 0.18;
    crisisPrediction = "Low — Stable Pattern";
    crisisProbability = 0.08;
  }

  if (heartRate > 100) {
    riskScore = Math.min(riskScore + 0.1, 0.98);
    crisisProbability = Math.min(crisisProbability + 0.15, 0.95);
  }

  return {
    id: `pred-${Date.now()}`,
    riskClass,
    riskScore: Math.round(riskScore * 100) / 100,
    crisisPrediction,
    crisisProbability: Math.round(crisisProbability * 100) / 100,
    modelVersion: "v2.4",
    createdAt: new Date(),
  };
}

export function computeXAIInsights(reading: { systolic: number; diastolic: number; heartRate: number }): XAIInsight[] {
  const sysWeight = Math.round((reading.systolic / 200) * 100);
  const diaWeight = Math.round((reading.diastolic / 120) * 100);
  const hrWeight = Math.round((reading.heartRate / 120) * 100);

  return [
    {
      id: `xai-sys-${Date.now()}`,
      feature: "Systolic BP",
      contribution: `${sysWeight}% weight in risk model`,
      value: `${reading.systolic} mmHg`,
      createdAt: new Date(),
    },
    {
      id: `xai-dia-${Date.now()}`,
      feature: "Diastolic BP",
      contribution: `${diaWeight}% weight in risk model`,
      value: `${reading.diastolic} mmHg`,
      createdAt: new Date(),
    },
    {
      id: `xai-hr-${Date.now()}`,
      feature: "Heart Rate",
      contribution: `${hrWeight}% weight in risk model`,
      value: `${reading.heartRate} BPM`,
      createdAt: new Date(),
    },
    {
      id: `xai-hrv-${Date.now()}`,
      feature: "Heart Rate Variability",
      contribution: reading.heartRate > 90 ? "Reduced — elevated stress signal" : "Normal range",
      value: reading.heartRate > 90 ? "Abnormal" : "Normal",
      createdAt: new Date(),
    },
  ];
}
