export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      ai_provider_keys: {
        Row: {
          api_key: string;
          base_url: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          is_active: boolean;
          label: string;
          model: string;
          provider: string;
          purpose: string;
          updated_at: string;
        };
        Insert: {
          api_key: string;
          base_url?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_active?: boolean;
          label: string;
          model: string;
          provider: string;
          purpose?: string;
          updated_at?: string;
        };
        Update: {
          api_key?: string;
          base_url?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_active?: boolean;
          label?: string;
          model?: string;
          provider?: string;
          purpose?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ai_usage_log: {
        Row: {
          completion_tokens: number | null;
          created_at: string;
          error_message: string | null;
          feature: string;
          id: string;
          latency_ms: number | null;
          model: string;
          ok: boolean;
          prompt_tokens: number | null;
          user_id: string | null;
        };
        Insert: {
          completion_tokens?: number | null;
          created_at?: string;
          error_message?: string | null;
          feature: string;
          id?: string;
          latency_ms?: number | null;
          model: string;
          ok?: boolean;
          prompt_tokens?: number | null;
          user_id?: string | null;
        };
        Update: {
          completion_tokens?: number | null;
          created_at?: string;
          error_message?: string | null;
          feature?: string;
          id?: string;
          latency_ms?: number | null;
          model?: string;
          ok?: boolean;
          prompt_tokens?: number | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      bank_mcq_questions: {
        Row: {
          answer: string;
          created_at: string;
          created_by: string | null;
          diagram_id: string | null;
          diagram_image_url: string | null;
          distractor_notes: Json;
          exam_series: string | null;
          explanation: string;
          id: string;
          level: string;
          options: Json;
          skill: string;
          source_document_id: string | null;
          status: string;
          stem: string;
          topic: string;
          updated_at: string;
        };
        Insert: {
          answer: string;
          created_at?: string;
          created_by?: string | null;
          diagram_id?: string | null;
          diagram_image_url?: string | null;
          distractor_notes?: Json;
          exam_series?: string | null;
          explanation?: string;
          id?: string;
          level: string;
          options: Json;
          skill?: string;
          source_document_id?: string | null;
          status?: string;
          stem: string;
          topic?: string;
          updated_at?: string;
        };
        Update: {
          answer?: string;
          created_at?: string;
          created_by?: string | null;
          diagram_id?: string | null;
          diagram_image_url?: string | null;
          distractor_notes?: Json;
          exam_series?: string | null;
          explanation?: string;
          id?: string;
          level?: string;
          options?: Json;
          skill?: string;
          source_document_id?: string | null;
          status?: string;
          stem?: string;
          topic?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bank_mcq_questions_source_document_id_fkey";
            columns: ["source_document_id"];
            isOneToOne: false;
            referencedRelation: "knowledge_documents";
            referencedColumns: ["id"];
          },
        ];
      };
      bank_essay_questions: {
        Row: {
          created_at: string;
          created_by: string | null;
          exam_series: string | null;
          id: string;
          level: string;
          max_mark: number;
          question_text: string;
          source_document_id: string | null;
          status: string;
          topic: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          exam_series?: string | null;
          id?: string;
          level: string;
          max_mark?: number;
          question_text: string;
          source_document_id?: string | null;
          status?: string;
          topic?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          exam_series?: string | null;
          id?: string;
          level?: string;
          max_mark?: number;
          question_text?: string;
          source_document_id?: string | null;
          status?: string;
          topic?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bank_essay_questions_source_document_id_fkey";
            columns: ["source_document_id"];
            isOneToOne: false;
            referencedRelation: "knowledge_documents";
            referencedColumns: ["id"];
          },
        ];
      };
      calibration_anchors: {
        Row: {
          active: boolean;
          band_label: string;
          created_at: string;
          created_by: string | null;
          essay_text: string;
          id: string;
          mark: number;
          max_mark: number;
          notes: string | null;
          question: string;
        };
        Insert: {
          active?: boolean;
          band_label?: string;
          created_at?: string;
          created_by?: string | null;
          essay_text: string;
          id?: string;
          mark: number;
          max_mark?: number;
          notes?: string | null;
          question: string;
        };
        Update: {
          active?: boolean;
          band_label?: string;
          created_at?: string;
          created_by?: string | null;
          essay_text?: string;
          id?: string;
          mark?: number;
          max_mark?: number;
          notes?: string | null;
          question?: string;
        };
        Relationships: [];
      };
      custom_diagrams: {
        Row: {
          created_at: string;
          created_by: string | null;
          exam_questions: string[];
          how_to_read: string[];
          id: string;
          labels: Json;
          level: string;
          mistakes: string[];
          real_world: string[];
          related: string[];
          represents: string;
          section: string;
          slug: string;
          spec: Json;
          tips: string[];
          title: string;
          topic: string;
          updated_at: string;
          when_to_draw: string;
          why_used: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          exam_questions?: string[];
          how_to_read?: string[];
          id?: string;
          labels?: Json;
          level?: string;
          mistakes?: string[];
          real_world?: string[];
          related?: string[];
          represents?: string;
          section?: string;
          slug: string;
          spec?: Json;
          tips?: string[];
          title: string;
          topic?: string;
          updated_at?: string;
          when_to_draw?: string;
          why_used?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          exam_questions?: string[];
          how_to_read?: string[];
          id?: string;
          labels?: Json;
          level?: string;
          mistakes?: string[];
          real_world?: string[];
          related?: string[];
          represents?: string;
          section?: string;
          slug?: string;
          spec?: Json;
          tips?: string[];
          title?: string;
          topic?: string;
          updated_at?: string;
          when_to_draw?: string;
          why_used?: string;
        };
        Relationships: [];
      };
      definitions: {
        Row: {
          category: string;
          created_at: string;
          created_by: string | null;
          definition_text: string;
          extraction_model: string | null;
          id: string;
          reviewed_by: string | null;
          source_chunk_id: string | null;
          source_document_id: string | null;
          source_label: string | null;
          term: string;
          topic_id: string | null;
          updated_at: string;
        };
        Insert: {
          category?: string;
          created_at?: string;
          created_by?: string | null;
          definition_text: string;
          extraction_model?: string | null;
          id?: string;
          reviewed_by?: string | null;
          source_chunk_id?: string | null;
          source_document_id?: string | null;
          source_label?: string | null;
          term: string;
          topic_id?: string | null;
          updated_at?: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          created_by?: string | null;
          definition_text?: string;
          extraction_model?: string | null;
          id?: string;
          reviewed_by?: string | null;
          source_chunk_id?: string | null;
          source_document_id?: string | null;
          source_label?: string | null;
          term?: string;
          topic_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "definitions_source_chunk_id_fkey";
            columns: ["source_chunk_id"];
            isOneToOne: false;
            referencedRelation: "document_chunks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "definitions_source_document_id_fkey";
            columns: ["source_document_id"];
            isOneToOne: false;
            referencedRelation: "knowledge_documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "definitions_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id"];
          },
        ];
      };
      document_chunks: {
        Row: {
          chunk_index: number;
          content: string;
          created_at: string;
          document_id: string;
          embedding: string | null;
          heading: string | null;
          id: string;
          model_version: string;
          token_estimate: number;
          topic_id: string | null;
        };
        Insert: {
          chunk_index: number;
          content: string;
          created_at?: string;
          document_id: string;
          embedding?: string | null;
          heading?: string | null;
          id?: string;
          model_version?: string;
          token_estimate?: number;
          topic_id?: string | null;
        };
        Update: {
          chunk_index?: number;
          content?: string;
          created_at?: string;
          document_id?: string;
          embedding?: string | null;
          heading?: string | null;
          id?: string;
          model_version?: string;
          token_estimate?: number;
          topic_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "knowledge_documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "document_chunks_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id"];
          },
        ];
      };
      essay_versions: {
        Row: {
          ao1_awarded: number | null;
          ao2_awarded: number | null;
          ao3_awarded: number | null;
          audited: boolean;
          confidence: number | null;
          created_at: string;
          essay_id: string;
          essay_text: string;
          grading: Json;
          id: string;
          model: string | null;
          showcase_consented: boolean;
          showcased: boolean;
          showcased_at: string | null;
          sources: Json;
          total_mark: number | null;
          user_id: string;
          version: number;
        };
        Insert: {
          ao1_awarded?: number | null;
          ao2_awarded?: number | null;
          ao3_awarded?: number | null;
          audited?: boolean;
          confidence?: number | null;
          created_at?: string;
          essay_id: string;
          essay_text: string;
          grading?: Json;
          id?: string;
          model?: string | null;
          showcase_consented?: boolean;
          showcased?: boolean;
          showcased_at?: string | null;
          sources?: Json;
          total_mark?: number | null;
          user_id: string;
          version?: number;
        };
        Update: {
          ao1_awarded?: number | null;
          ao2_awarded?: number | null;
          ao3_awarded?: number | null;
          audited?: boolean;
          confidence?: number | null;
          created_at?: string;
          essay_id?: string;
          essay_text?: string;
          grading?: Json;
          id?: string;
          model?: string | null;
          showcase_consented?: boolean;
          showcased?: boolean;
          showcased_at?: string | null;
          sources?: Json;
          total_mark?: number | null;
          user_id?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "essay_versions_essay_id_fkey";
            columns: ["essay_id"];
            isOneToOne: false;
            referencedRelation: "essays";
            referencedColumns: ["id"];
          },
        ];
      };
      essays: {
        Row: {
          assignment_id: string | null;
          created_at: string;
          id: string;
          latest_mark: number | null;
          max_mark: number;
          question: string;
          topic_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          assignment_id?: string | null;
          created_at?: string;
          id?: string;
          latest_mark?: number | null;
          max_mark?: number;
          question: string;
          topic_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          assignment_id?: string | null;
          created_at?: string;
          id?: string;
          latest_mark?: number | null;
          max_mark?: number;
          question?: string;
          topic_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "essays_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id"];
          },
        ];
      };
      knowledge_documents: {
        Row: {
          char_count: number;
          chunk_count: number;
          content_hash: string | null;
          created_at: string;
          doc_type: Database["public"]["Enums"]["doc_type"];
          error_message: string | null;
          exam_series: string | null;
          id: string;
          source_name: string | null;
          status: Database["public"]["Enums"]["ingest_status"];
          storage_path: string | null;
          subject_id: string | null;
          title: string;
          topic_id: string | null;
          unit_id: string | null;
          updated_at: string;
          uploaded_by: string | null;
          version: number;
        };
        Insert: {
          char_count?: number;
          chunk_count?: number;
          content_hash?: string | null;
          created_at?: string;
          doc_type?: Database["public"]["Enums"]["doc_type"];
          error_message?: string | null;
          exam_series?: string | null;
          id?: string;
          source_name?: string | null;
          status?: Database["public"]["Enums"]["ingest_status"];
          storage_path?: string | null;
          subject_id?: string | null;
          title: string;
          topic_id?: string | null;
          unit_id?: string | null;
          updated_at?: string;
          uploaded_by?: string | null;
          version?: number;
        };
        Update: {
          char_count?: number;
          chunk_count?: number;
          content_hash?: string | null;
          created_at?: string;
          doc_type?: Database["public"]["Enums"]["doc_type"];
          error_message?: string | null;
          exam_series?: string | null;
          id?: string;
          source_name?: string | null;
          status?: Database["public"]["Enums"]["ingest_status"];
          storage_path?: string | null;
          subject_id?: string | null;
          title?: string;
          topic_id?: string | null;
          unit_id?: string | null;
          updated_at?: string;
          uploaded_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "knowledge_documents_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "knowledge_documents_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "knowledge_documents_unit_id_fkey";
            columns: ["unit_id"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["id"];
          },
        ];
      };
      mcq_attempts: {
        Row: {
          answers: Json;
          completed_at: string | null;
          created_at: string;
          exam_ends_at: string | null;
          id: string;
          level: string;
          model: string | null;
          questions: Json;
          score: number | null;
          source: string;
          status: string;
          timer_enabled: boolean;
          timer_paused_remaining_seconds: number | null;
          title: string;
          topic: string | null;
          total: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          answers?: Json;
          completed_at?: string | null;
          created_at?: string;
          exam_ends_at?: string | null;
          id?: string;
          level?: string;
          model?: string | null;
          questions?: Json;
          score?: number | null;
          source?: string;
          status?: string;
          timer_enabled?: boolean;
          timer_paused_remaining_seconds?: number | null;
          title?: string;
          topic?: string | null;
          total?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          answers?: Json;
          completed_at?: string | null;
          created_at?: string;
          exam_ends_at?: string | null;
          id?: string;
          level?: string;
          model?: string | null;
          questions?: Json;
          score?: number | null;
          source?: string;
          status?: string;
          timer_enabled?: boolean;
          timer_paused_remaining_seconds?: number | null;
          title?: string;
          topic?: string | null;
          total?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      mcq_pdf_attempts: {
        Row: {
          assignment_id: string | null;
          completed_at: string | null;
          created_at: string;
          filename: string | null;
          id: string;
          level: string;
          paper_id: string | null;
          questions: Json;
          score: number | null;
          title: string;
          total: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          assignment_id?: string | null;
          completed_at?: string | null;
          created_at?: string;
          filename?: string | null;
          id?: string;
          level?: string;
          paper_id?: string | null;
          questions?: Json;
          score?: number | null;
          title?: string;
          total?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          assignment_id?: string | null;
          completed_at?: string | null;
          created_at?: string;
          filename?: string | null;
          id?: string;
          level?: string;
          paper_id?: string | null;
          questions?: Json;
          score?: number | null;
          title?: string;
          total?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      mcq_pdf_papers: {
        Row: {
          answer_key: Json;
          created_at: string;
          exam_series: string | null;
          exam_year: number | null;
          id: string;
          level: string;
          ms_path: string | null;
          ms_url: string | null;
          overlay: Json | null;
          qp_path: string;
          qp_url: string;
          question_count: number;
          title: string;
          uploaded_by: string | null;
        };
        Insert: {
          answer_key?: Json;
          created_at?: string;
          exam_series?: string | null;
          exam_year?: number | null;
          id?: string;
          level?: string;
          ms_path?: string | null;
          ms_url?: string | null;
          overlay?: Json | null;
          qp_path: string;
          qp_url: string;
          question_count?: number;
          title: string;
          uploaded_by?: string | null;
        };
        Update: {
          answer_key?: Json;
          created_at?: string;
          exam_series?: string | null;
          exam_year?: number | null;
          id?: string;
          level?: string;
          ms_path?: string | null;
          ms_url?: string | null;
          overlay?: Json | null;
          qp_path?: string;
          qp_url?: string;
          question_count?: number;
          title?: string;
          uploaded_by?: string | null;
        };
        Relationships: [];
      };
      live_examiner_sessions: {
        Row: {
          created_at: string;
          diagram_tag: string | null;
          essay_text: string;
          id: string;
          issues_history: Json;
          level: string;
          max_mark: number;
          question: string;
          topic: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          diagram_tag?: string | null;
          essay_text?: string;
          id?: string;
          issues_history?: Json;
          level?: string;
          max_mark?: number;
          question: string;
          topic?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          diagram_tag?: string | null;
          essay_text?: string;
          id?: string;
          issues_history?: Json;
          level?: string;
          max_mark?: number;
          question?: string;
          topic?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          full_name: string | null;
          id: string;
          school: string | null;
          tutorial_completed: boolean;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          id: string;
          school?: string | null;
          tutorial_completed?: boolean;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          school?: string | null;
          tutorial_completed?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      subjects: {
        Row: {
          code: string;
          created_at: string;
          id: string;
          level: string;
          name: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          id?: string;
          level?: string;
          name: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          id?: string;
          level?: string;
          name?: string;
        };
        Relationships: [];
      };
      topics: {
        Row: {
          code: string | null;
          created_at: string;
          difficulty: number;
          id: string;
          is_extension: boolean;
          learning_outcomes: string[];
          name: string;
          parent_id: string | null;
          position: number;
          syllabus_ref: string | null;
          unit_id: string;
        };
        Insert: {
          code?: string | null;
          created_at?: string;
          difficulty?: number;
          id?: string;
          is_extension?: boolean;
          learning_outcomes?: string[];
          name: string;
          parent_id?: string | null;
          position?: number;
          syllabus_ref?: string | null;
          unit_id: string;
        };
        Update: {
          code?: string | null;
          created_at?: string;
          difficulty?: number;
          id?: string;
          is_extension?: boolean;
          learning_outcomes?: string[];
          name?: string;
          parent_id?: string | null;
          position?: number;
          syllabus_ref?: string | null;
          unit_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "topics_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "topics_unit_id_fkey";
            columns: ["unit_id"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["id"];
          },
        ];
      };
      units: {
        Row: {
          code: string;
          created_at: string;
          id: string;
          name: string;
          paper: string | null;
          position: number;
          subject_id: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          id?: string;
          name: string;
          paper?: string | null;
          position?: number;
          subject_id: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          id?: string;
          name?: string;
          paper?: string | null;
          position?: number;
          subject_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "units_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
        ];
      };
      app_settings: {
        Row: { int_value: number; key: string; updated_at: string };
        Insert: { int_value: number; key: string; updated_at?: string };
        Update: { int_value?: number; key?: string; updated_at?: string };
        Relationships: [];
      };
      email_brand_settings: {
        Row: {
          eyebrow: string;
          footer: string;
          heading: string;
          id: boolean;
          intro: string;
          sender_name: string;
          subject: string;
          updated_at: string;
        };
        Insert: {
          eyebrow?: string;
          footer?: string;
          heading?: string;
          id?: boolean;
          intro?: string;
          sender_name?: string;
          subject?: string;
          updated_at?: string;
        };
        Update: {
          eyebrow?: string;
          footer?: string;
          heading?: string;
          intro?: string;
          sender_name?: string;
          subject?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      daily_feature_usage: {
        Row: {
          detail: string | null;
          feature: string;
          updated_at: string;
          usage_day: string;
          user_id: string;
          uses: number;
        };
        Insert: {
          detail?: string | null;
          feature: string;
          updated_at?: string;
          usage_day: string;
          user_id: string;
          uses?: number;
        };
        Update: {
          detail?: string | null;
          feature?: string;
          updated_at?: string;
          usage_day?: string;
          user_id?: string;
          uses?: number;
        };
        Relationships: [];
      };
      signup_waitlist: {
        Row: { created_at: string; email: string; full_name: string | null; id: string };
        Insert: { created_at?: string; email: string; full_name?: string | null; id?: string };
        Update: { created_at?: string; email?: string; full_name?: string | null; id?: string };
        Relationships: [];
      };
      classrooms: {
        Row: {
          archived: boolean;
          created_at: string;
          id: string;
          join_code: string;
          level: string;
          name: string;
          teacher_id: string;
        };
        Insert: {
          archived?: boolean;
          created_at?: string;
          id?: string;
          join_code?: string;
          level?: string;
          name: string;
          teacher_id: string;
        };
        Update: {
          archived?: boolean;
          join_code?: string;
          level?: string;
          name?: string;
        };
        Relationships: [];
      };
      classroom_members: {
        Row: {
          classroom_id: string;
          id: string;
          joined_at: string;
          student_id: string;
        };
        Insert: {
          classroom_id: string;
          id?: string;
          joined_at?: string;
          student_id: string;
        };
        Update: never;
        Relationships: [];
      };
      classroom_teachers: {
        Row: {
          added_by: string;
          classroom_id: string;
          created_at: string;
          id: string;
          teacher_id: string;
        };
        Insert: {
          added_by: string;
          classroom_id: string;
          created_at?: string;
          id?: string;
          teacher_id: string;
        };
        Update: {
          added_by?: string;
          classroom_id?: string;
          created_at?: string;
          id?: string;
          teacher_id?: string;
        };
        Relationships: [];
      };
      classroom_assignments: {
        Row: {
          archived: boolean;
          bank_essay_question_id: string | null;
          classroom_id: string;
          created_at: string;
          created_by: string | null;
          due_at: string | null;
          essay_max_mark: number | null;
          essay_question: string | null;
          essay_topic: string | null;
          id: string;
          instructions: string | null;
          kind: string;
          mcq_paper_id: string | null;
          title: string;
        };
        Insert: {
          archived?: boolean;
          bank_essay_question_id?: string | null;
          classroom_id: string;
          created_at?: string;
          created_by?: string | null;
          due_at?: string | null;
          essay_max_mark?: number | null;
          essay_question?: string | null;
          essay_topic?: string | null;
          id?: string;
          instructions?: string | null;
          kind: string;
          mcq_paper_id?: string | null;
          title: string;
        };
        Update: {
          archived?: boolean;
          bank_essay_question_id?: string | null;
          classroom_id?: string;
          created_at?: string;
          created_by?: string | null;
          due_at?: string | null;
          essay_max_mark?: number | null;
          essay_question?: string | null;
          essay_topic?: string | null;
          id?: string;
          instructions?: string | null;
          kind?: string;
          mcq_paper_id?: string | null;
          title?: string;
        };
        Relationships: [];
      };
      classroom_announcements: {
        Row: {
          author_id: string;
          classroom_id: string;
          content: string;
          created_at: string;
          id: string;
          pinned: boolean;
          updated_at: string;
        };
        Insert: {
          author_id: string;
          classroom_id: string;
          content: string;
          created_at?: string;
          id?: string;
          pinned?: boolean;
          updated_at?: string;
        };
        Update: {
          author_id?: string;
          classroom_id?: string;
          content?: string;
          created_at?: string;
          id?: string;
          pinned?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      classroom_comments: {
        Row: {
          announcement_id: string | null;
          assignment_id: string | null;
          author_id: string;
          content: string;
          created_at: string;
          id: string;
        };
        Insert: {
          announcement_id?: string | null;
          assignment_id?: string | null;
          author_id: string;
          content: string;
          created_at?: string;
          id?: string;
        };
        Update: {
          announcement_id?: string | null;
          assignment_id?: string | null;
          author_id?: string;
          content?: string;
          created_at?: string;
          id?: string;
        };
        Relationships: [];
      };
      classroom_submissions: {
        Row: {
          ai_feedback: Json | null;
          ai_score: number | null;
          assignment_id: string;
          essay_id: string | null;
          graded_at: string | null;
          id: string;
          returned_at: string | null;
          status: string;
          student_id: string;
          submission_text: string | null;
          submitted_at: string;
          teacher_feedback: string | null;
          teacher_score: number | null;
        };
        Insert: {
          ai_feedback?: Json | null;
          ai_score?: number | null;
          assignment_id: string;
          essay_id?: string | null;
          graded_at?: string | null;
          id?: string;
          returned_at?: string | null;
          status?: string;
          student_id: string;
          submission_text?: string | null;
          submitted_at?: string;
          teacher_feedback?: string | null;
          teacher_score?: number | null;
        };
        Update: {
          ai_feedback?: Json | null;
          ai_score?: number | null;
          assignment_id?: string;
          essay_id?: string | null;
          graded_at?: string | null;
          id?: string;
          returned_at?: string | null;
          status?: string;
          student_id?: string;
          submission_text?: string | null;
          submitted_at?: string;
          teacher_feedback?: string | null;
          teacher_score?: number | null;
        };
        Relationships: [];
      };
      classroom_messages: {
        Row: {
          classroom_id: string;
          content: string;
          created_at: string;
          id: string;
          is_pinned: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          classroom_id: string;
          content: string;
          created_at?: string;
          id?: string;
          is_pinned?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          classroom_id?: string;
          content?: string;
          created_at?: string;
          id?: string;
          is_pinned?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_presence: {
        Row: { last_seen: string; path: string | null; user_id: string };
        Insert: { last_seen?: string; path?: string | null; user_id: string };
        Update: { last_seen?: string; path?: string | null; user_id?: string };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      mcq_topic_performance: {
        Row: {
          accuracy_pct: number | null;
          attempted: number;
          correct_count: number;
          topic: string;
          user_id: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      claim_first_admin: { Args: never; Returns: boolean };
      check_public_email_rate_limit: {
        Args: {
          p_bucket: string;
          p_limit: number;
          p_requester_hash: string;
          p_window_seconds: number;
        };
        Returns: Json;
      };
      admin_get_settings: { Args: never; Returns: Json };
      admin_get_email_brand_settings: { Args: never; Returns: Json };
      admin_list_waitlist: {
        Args: never;
        Returns: {
          created_at: string;
          email: string;
          full_name: string | null;
          id: string;
          position: number;
        }[];
      };
      admin_remove_waitlist: { Args: { p_id: string }; Returns: undefined };
      admin_set_settings: {
        Args: { p_essay_daily_limit?: number; p_max_users?: number };
        Returns: Json;
      };
      admin_set_email_brand_settings: {
        Args: {
          p_eyebrow: string;
          p_footer: string;
          p_heading: string;
          p_intro: string;
          p_sender_name: string;
          p_subject: string;
        };
        Returns: Json;
      };
      admin_user_activity: {
        Args: never;
        Returns: {
          ai_calls: number;
          email: string | null;
          essays_graded: number;
          essays_today: number;
          full_name: string | null;
          is_online: boolean;
          joined_at: string;
          last_activity: string | null;
          last_seen: string | null;
          live_examiner_sessions: number;
          mcq_attempts: number;
          role: string;
          school: string | null;
          current_path: string | null;
          user_id: string;
        }[];
      };
      claim_live_examiner_session: { Args: { p_question: string }; Returns: Json };
      join_waitlist: { Args: { p_email: string; p_full_name?: string }; Returns: Json };
      join_classroom_by_code: {
        Args: { _code: string };
        Returns: { classroom_id: string; classroom_name: string }[];
      };
      rotate_classroom_join_code: { Args: { _classroom_id: string }; Returns: string };
      get_classroom_roster: {
        Args: { _classroom_id: string };
        Returns: {
          membership_id: string;
          student_id: string;
          full_name: string | null;
          email: string;
          school: string | null;
          joined_at: string;
        }[];
      };
      get_teacher_student_insights: {
        Args: { _classroom_id: string; _student_id: string };
        Returns: Json;
      };
      public_signup_status: { Args: never; Returns: Json };
      refund_essay_grading: { Args: never; Returns: undefined };
      reserve_essay_grading: { Args: never; Returns: Json };
      touch_presence: { Args: { p_path?: string }; Returns: undefined };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_staff: { Args: { _user_id: string }; Returns: boolean };
      list_showcase_essays: {
        Args: { _limit?: number; _topic_id?: string | null };
        Returns: {
          ao1_awarded: number | null;
          ao2_awarded: number | null;
          ao3_awarded: number | null;
          author_initials: string | null;
          essay_id: string;
          essay_text: string;
          grading: Json;
          max_mark: number;
          question: string;
          showcased_at: string | null;
          topic_id: string | null;
          topic_name: string | null;
          total_mark: number;
          version_id: string;
        }[];
      };
      list_my_showcase_candidates: {
        Args: never;
        Returns: {
          essay_id: string;
          version_id: string;
          question: string;
          max_mark: number;
          total_mark: number;
          showcase_consented: boolean;
        }[];
      };
      set_showcase_consent: {
        Args: { _version_id: string; _consent: boolean };
        Returns: boolean;
      };
      match_document_chunks: {
        Args: {
          filter_doc_types?: Database["public"]["Enums"]["doc_type"][];
          filter_topic_id?: string;
          match_count?: number;
          query_embedding: string;
        };
        Returns: {
          chunk_id: string;
          content: string;
          doc_type: Database["public"]["Enums"]["doc_type"];
          document_id: string;
          document_title: string;
          heading: string;
          similarity: number;
        }[];
      };
    };
    Enums: {
      app_role: "student" | "teacher" | "admin";
      doc_type:
        | "coursebook"
        | "syllabus"
        | "mark_scheme"
        | "past_paper"
        | "mcq_calibration"
        | "examiner_report"
        | "notes"
        | "other";
      ingest_status: "pending" | "processing" | "ready" | "failed";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["student", "teacher", "admin"],
      doc_type: [
        "coursebook",
        "syllabus",
        "mark_scheme",
        "past_paper",
        "mcq_calibration",
        "examiner_report",
        "notes",
        "other",
      ],
      ingest_status: ["pending", "processing", "ready", "failed"],
    },
  },
} as const;
