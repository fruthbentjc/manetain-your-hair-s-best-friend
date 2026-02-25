
-- Analysis sessions table
CREATE TABLE public.analysis_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  density_score INTEGER CHECK (density_score >= 0 AND density_score <= 100),
  hairline_score INTEGER CHECK (hairline_score >= 0 AND hairline_score <= 100),
  crown_score INTEGER CHECK (crown_score >= 0 AND crown_score <= 100),
  ai_summary TEXT,
  comparison_notes TEXT,
  alert_triggered BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.analysis_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own analyses" ON public.analysis_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own analyses" ON public.analysis_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own analyses" ON public.analysis_sessions FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_analysis_sessions_user_date ON public.analysis_sessions (user_id, created_at DESC);

-- Analysis photos table
CREATE TABLE public.analysis_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.analysis_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  angle TEXT NOT NULL CHECK (angle IN ('top', 'hairline', 'left_temple', 'right_temple', 'crown')),
  photo_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.analysis_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own photos" ON public.analysis_photos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own photos" ON public.analysis_photos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own photos" ON public.analysis_photos FOR DELETE USING (auth.uid() = user_id);

-- Treatment recommendations table (app-managed content)
CREATE TABLE public.treatments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('topical', 'supplement', 'lifestyle', 'professional')),
  evidence_rating INTEGER CHECK (evidence_rating >= 1 AND evidence_rating <= 5),
  cost_level TEXT CHECK (cost_level IN ('low', 'medium', 'high')),
  commitment_level TEXT CHECK (commitment_level IN ('low', 'medium', 'high')),
  affiliate_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;

-- Treatments are readable by all authenticated users
CREATE POLICY "Authenticated users can view treatments" ON public.treatments FOR SELECT USING (auth.uid() IS NOT NULL);

-- User-specific treatment recommendations from AI
CREATE TABLE public.user_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.analysis_sessions(id) ON DELETE SET NULL,
  treatment_id UUID REFERENCES public.treatments(id) ON DELETE CASCADE,
  relevance_score INTEGER CHECK (relevance_score >= 0 AND relevance_score <= 100),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recommendations" ON public.user_recommendations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own recommendations" ON public.user_recommendations FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Photo storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('analysis-photos', 'analysis-photos', false);

CREATE POLICY "Users can upload their own photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'analysis-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view their own photos" ON storage.objects FOR SELECT USING (bucket_id = 'analysis-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own photos" ON storage.objects FOR DELETE USING (bucket_id = 'analysis-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
