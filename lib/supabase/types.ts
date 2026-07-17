export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          phone: string | null;
          locale: string | null;
          stripe_customer_id: string | null;
          subscription_status: string | null;
          subscription_plan_id: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          locale?: string | null;
          stripe_customer_id?: string | null;
          subscription_status?: string | null;
          subscription_plan_id?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          locale?: string | null;
          stripe_customer_id?: string | null;
          subscription_status?: string | null;
          subscription_plan_id?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          mime_type: string;
          size_bytes: number;
          storage_path: string;
          document_type: string | null;
          ocr_status: string | null;
          ocr_data: Json | null;
          ocr_confidence: number | null;
          ocr_error: string | null;
          content_hash: string | null;
          processing_attempts: number | null;
          processed_at: string | null;
          consultation_case_id: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          mime_type: string;
          size_bytes: number;
          storage_path: string;
          document_type?: string | null;
          ocr_status?: string | null;
          ocr_data?: Json | null;
          ocr_confidence?: number | null;
          ocr_error?: string | null;
          content_hash?: string | null;
          processing_attempts?: number | null;
          processed_at?: string | null;
          consultation_case_id?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          mime_type?: string;
          size_bytes?: number;
          storage_path?: string;
          document_type?: string | null;
          ocr_status?: string | null;
          ocr_data?: Json | null;
          ocr_confidence?: number | null;
          ocr_error?: string | null;
          content_hash?: string | null;
          processing_attempts?: number | null;
          processed_at?: string | null;
          consultation_case_id?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      extracted_data: {
        Row: {
          id: string;
          user_id: string;
          full_name: string | null;
          birth_date: string | null;
          age: number | null;
          current_company: string | null;
          regimen: string | null;
          grupo_cotizacion: string | null;
          currently_working: boolean | null;
          is_self_employed: boolean | null;
          annual_salary: number | null;
          monthly_base: number | null;
          bases_last_24_months: number[] | null;
          years_contributed: number | null;
          months_contributed: number | null;
          gaps: Json | null;
          special_agreements: Json | null;
          sources: string[] | null;
          confidence: number | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name?: string | null;
          birth_date?: string | null;
          age?: number | null;
          current_company?: string | null;
          regimen?: string | null;
          grupo_cotizacion?: string | null;
          currently_working?: boolean | null;
          is_self_employed?: boolean | null;
          annual_salary?: number | null;
          monthly_base?: number | null;
          bases_last_24_months?: number[] | null;
          years_contributed?: number | null;
          months_contributed?: number | null;
          gaps?: Json | null;
          special_agreements?: Json | null;
          sources?: string[] | null;
          confidence?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          full_name?: string | null;
          birth_date?: string | null;
          age?: number | null;
          current_company?: string | null;
          regimen?: string | null;
          grupo_cotizacion?: string | null;
          currently_working?: boolean | null;
          is_self_employed?: boolean | null;
          annual_salary?: number | null;
          monthly_base?: number | null;
          bases_last_24_months?: number[] | null;
          years_contributed?: number | null;
          months_contributed?: number | null;
          gaps?: Json | null;
          special_agreements?: Json | null;
          sources?: string[] | null;
          confidence?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      scenarios: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          scenario_type: string;
          retirement_age: number;
          monthly_pension: number;
          total_lifetime: number;
          is_recommended: boolean | null;
          metadata: Json | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          scenario_type: string;
          retirement_age: number;
          monthly_pension: number;
          total_lifetime: number;
          is_recommended?: boolean | null;
          metadata?: Json | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          scenario_type?: string;
          retirement_age?: number;
          monthly_pension?: number;
          total_lifetime?: number;
          is_recommended?: boolean | null;
          metadata?: Json | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          user_id: string;
          role: string;
          content: string;
          metadata: Json | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: string;
          content: string;
          metadata?: Json | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: string;
          content?: string;
          metadata?: Json | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      alerts: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          description: string | null;
          metadata: Json | null;
          is_read: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          description?: string | null;
          metadata?: Json | null;
          is_read?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          description?: string | null;
          metadata?: Json | null;
          is_read?: boolean | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      consultation_cases: {
        Row: {
          id: string;
          founder_id: string;
          client_name: string;
          client_note: string | null;
          client_birth_date: string | null;
          expediente_data: Json;
          life_path: Json;
          completitud_score: number;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          founder_id: string;
          client_name: string;
          client_note?: string | null;
          client_birth_date?: string | null;
          expediente_data?: Json;
          life_path?: Json;
          completitud_score?: number;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          founder_id?: string;
          client_name?: string;
          client_note?: string | null;
          client_birth_date?: string | null;
          expediente_data?: Json;
          life_path?: Json;
          completitud_score?: number;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'consultation_cases_founder_id_fkey';
            columns: ['founder_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
