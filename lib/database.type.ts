export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          age: number;
          gender: "male" | "female" | "other";
          height: number;
          weight: number;
          bmi: number;
          smoking: "never" | "former" | "current";
          alcohol: "none" | "light" | "moderate" | "heavy";
          conditions: string[];
          photo_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email: string;
          age: number;
          gender: "male" | "female" | "other";
          height: number;
          weight: number;
          bmi: number;
          smoking: "never" | "former" | "current";
          alcohol: "none" | "light" | "moderate" | "heavy";
          conditions?: string[];
          photo_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string;
          email?: string;
          age?: number;
          gender?: "male" | "female" | "other";
          height?: number;
          weight?: number;
          bmi?: number;
          smoking?: "never" | "former" | "current";
          alcohol?: "none" | "light" | "moderate" | "heavy";
          conditions?: string[];
          photo_url?: string | null;
          updated_at?: string;
        };
      };
      vital_readings: {
        Row: {
          id: string;
          user_id: string;
          systolic: number;
          diastolic: number;
          heart_rate: number;
          source: "ble" | "manual";
          timestamp: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          systolic: number;
          diastolic: number;
          heart_rate: number;
          source: "ble" | "manual";
          timestamp?: string;
          created_at?: string;
        };
        Update: {
          systolic?: number;
          diastolic?: number;
          heart_rate?: number;
          source?: "ble" | "manual";
          timestamp?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          body: string;
          type: "medication" | "alert" | "recommendation" | "device" | "appointment";
          read: boolean;
          timestamp: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          body: string;
          type: "medication" | "alert" | "recommendation" | "device" | "appointment";
          read?: boolean;
          timestamp?: string;
          created_at?: string;
        };
        Update: {
          read?: boolean;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          user_id: string;
          role: "user" | "assistant";
          text: string;
          timestamp: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: "user" | "assistant";
          text: string;
          timestamp?: string;
          created_at?: string;
        };
        Update: {
          text?: string;
        };
      };
      ml_predictions: {
        Row: {
          id: string;
          user_id: string;
          reading_id: string;
          risk_class: string;
          risk_score: number;
          crisis_prediction: string;
          crisis_probability: number;
          model_version: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          reading_id: string;
          risk_class: string;
          risk_score: number;
          crisis_prediction: string;
          crisis_probability: number;
          model_version: string;
          created_at?: string;
        };
        Update: {};
      };
      xai_insights: {
        Row: {
          id: string;
          user_id: string;
          reading_id: string;
          feature: string;
          contribution: string;
          value: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          reading_id: string;
          feature: string;
          contribution: string;
          value: string;
          created_at?: string;
        };
        Update: {};
      };
      connected_devices: {
        Row: {
          id: string;
          user_id: string;
          device_id: string;
          name: string;
          connected: boolean;
          rssi: number | null;
          last_connected: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          device_id: string;
          name: string;
          connected?: boolean;
          rssi?: number | null;
          last_connected?: string;
          created_at?: string;
        };
        Update: {
          connected?: boolean;
          rssi?: number | null;
          last_connected?: string;
        };
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          dark_mode: boolean;
          notifications_enabled: boolean;
          medication_reminders: boolean;
          bp_alerts: boolean;
          language: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          dark_mode?: boolean;
          notifications_enabled?: boolean;
          medication_reminders?: boolean;
          bp_alerts?: boolean;
          language?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          dark_mode?: boolean;
          notifications_enabled?: boolean;
          medication_reminders?: boolean;
          bp_alerts?: boolean;
          language?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
