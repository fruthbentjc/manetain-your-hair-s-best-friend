import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Camera, Upload, CheckCircle2, ArrowRight, ArrowLeft,
  Loader2, AlertTriangle, Shield, RotateCcw, X, ImageIcon
} from "lucide-react";
import AuthNavbar from "@/components/AuthNavbar";
import { Camera as CapCamera, CameraResultType, CameraSource } from "@capacitor/camera";

type Angle = "top" | "hairline" | "left_temple" | "right_temple" | "crown";

interface PhotoSlot {
  angle: Angle;
  label: string;
  instruction: string;
  file: File | null;
  preview: string | null;
}

interface AnalysisResult {
  overall_score: number;
  density_score: number;
  hairline_score: number;
  crown_score: number;
  ai_summary: string;
  alert_triggered: boolean;
  comparison_notes?: string;
}

const ANGLES: Omit<PhotoSlot, "file" | "preview">[] = [
  {
    angle: "top",
    label: "Top of Head",
    instruction: "Hold the camera directly above your head, about 12 inches away. Part your hair naturally.",
  },
  {
    angle: "hairline",
    label: "Hairline",
    instruction: "Face the camera and pull your hair back. Capture your full frontal hairline clearly.",
  },
  {
    angle: "left_temple",
    label: "Left Temple",
    instruction: "Turn your head to show the left temple area. Keep the camera at eye level.",
  },
  {
    angle: "right_temple",
    label: "Right Temple",
    instruction: "Turn your head to show the right temple area. Keep the camera at eye level.",
  },
  {
    angle: "crown",
    label: "Crown",
    instruction: "Tilt your head forward and photograph the crown area from above and slightly behind.",
  },
];

const Analysis = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(0); // 0 = intro, 1-5 = angles, 6 = review, 7 = analyzing, 8 = results
  const [photos, setPhotos] = useState<PhotoSlot[]>(
    ANGLES.map((a) => ({ ...a, file: null, preview: null }))
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<{ message: string; code?: string } | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [user, loading, navigate]);

  const handleFileChange = useCallback(
    (index: number, file: File | null) => {
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        toast({ title: "Invalid file", description: "Please upload an image file.", variant: "destructive" });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "File too large", description: "Please use an image under 10MB.", variant: "destructive" });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos((prev) =>
          prev.map((p, i) => (i === index ? { ...p, file, preview: reader.result as string } : p))
        );
      };
      reader.readAsDataURL(file);
    },
    [toast]
  );

  const handleCameraCapture = useCallback(
    async (index: number) => {
      try {
        const photo = await CapCamera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
          width: 1200,
          height: 900,
        });

        if (photo.dataUrl) {
          // Convert data URL to File
          const res = await fetch(photo.dataUrl);
          const blob = await res.blob();
          const file = new File([blob], `${ANGLES[index].angle}.jpg`, { type: "image/jpeg" });

          setPhotos((prev) =>
            prev.map((p, i) => (i === index ? { ...p, file, preview: photo.dataUrl! } : p))
          );
        }
      } catch (error: any) {
        // User cancelled or camera not available
        if (error?.message !== "User cancelled photos app") {
          toast({
            title: "Camera error",
            description: "Could not access camera. Try uploading a photo instead.",
            variant: "destructive",
          });
        }
      }
    },
    [toast]
  );

  const handleGalleryPick = useCallback(
    async (index: number) => {
      try {
        const photo = await CapCamera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Photos,
          width: 1200,
          height: 900,
        });

        if (photo.dataUrl) {
          const res = await fetch(photo.dataUrl);
          const blob = await res.blob();
          const file = new File([blob], `${ANGLES[index].angle}.jpg`, { type: "image/jpeg" });

          setPhotos((prev) =>
            prev.map((p, i) => (i === index ? { ...p, file, preview: photo.dataUrl! } : p))
          );
        }
      } catch (error: any) {
        if (error?.message !== "User cancelled photos app") {
          toast({
            title: "Gallery error",
            description: "Could not access gallery. Try uploading a file instead.",
            variant: "destructive",
          });
        }
      }
    },
    [toast]
  );

  const removePhoto = (index: number) => {
    setPhotos((prev) =>
      prev.map((p, i) => (i === index ? { ...p, file: null, preview: null } : p))
    );
  };

  const uploadedCount = photos.filter((p) => p.file).length;
  const canProceedToReview = uploadedCount >= 2; // minimum 2 photos

  const handleAnalyze = async () => {
    if (!user) return;
    setCurrentStep(7);
    setIsAnalyzing(true);

    try {
      // Upload photos to storage
      const uploadedPhotos: { url: string; angle: string }[] = [];

      for (const photo of photos) {
        if (!photo.file) continue;
        const filePath = `${user.id}/${Date.now()}_${photo.angle}.${photo.file.name.split(".").pop()}`;
        const { error: uploadError } = await supabase.storage
          .from("analysis-photos")
          .upload(filePath, photo.file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          throw new Error(`Failed to upload ${photo.label} photo`);
        }

        // Get signed URL for AI to access
        const { data: signedData } = await supabase.storage
          .from("analysis-photos")
          .createSignedUrl(filePath, 600);

        if (signedData?.signedUrl) {
          uploadedPhotos.push({ url: signedData.signedUrl, angle: photo.angle });
        }
      }

      // Get previous session for comparison
      const { data: prevSessions } = await supabase
        .from("analysis_sessions")
        .select("overall_score, density_score, hairline_score, crown_score")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      const previousScores = prevSessions?.[0]
        ? {
            overall: prevSessions[0].overall_score,
            density: prevSessions[0].density_score,
            hairline: prevSessions[0].hairline_score,
            crown: prevSessions[0].crown_score,
          }
        : null;

      // Call AI analysis
      const { data: analysisData, error: fnError } = await supabase.functions.invoke(
        "analyze-hair",
        {
          body: { photoUrls: uploadedPhotos, previousScores },
        }
      );

      if (fnError) throw fnError;
      if (analysisData?.error) throw new Error(analysisData.error);

      const analysisResult: AnalysisResult = analysisData;

      // Save session
      const { data: session, error: sessionError } = await supabase
        .from("analysis_sessions")
        .insert({
          user_id: user.id,
          overall_score: analysisResult.overall_score,
          density_score: analysisResult.density_score,
          hairline_score: analysisResult.hairline_score,
          crown_score: analysisResult.crown_score,
          ai_summary: analysisResult.ai_summary,
          comparison_notes: analysisResult.comparison_notes || null,
          alert_triggered: analysisResult.alert_triggered,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Save photo references
      for (const photo of uploadedPhotos) {
        await supabase.from("analysis_photos").insert({
          session_id: session.id,
          user_id: user.id,
          angle: photo.angle,
          photo_url: photo.url,
        });
      }

      setResult(analysisResult);
      setCurrentStep(8);
    } catch (error: any) {
      console.error("Analysis error:", error);
      const msg = error.message || "Something went wrong.";
      const code = msg.includes("Rate limit") ? "rate_limit"
        : msg.includes("credits") ? "credits"
        : msg.includes("upload") || msg.includes("Upload") ? "upload"
        : msg.includes("Unauthorized") ? "auth"
        : "unknown";
      setAnalysisError({ message: msg, code });
      setCurrentStep(9); // error step
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (loading || !user) return null;

  const angleIndex = currentStep - 1;

  return (
    <div className="min-h-screen bg-background">
      <AuthNavbar />

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8 pb-24 md:pb-8 max-w-2xl">
        <AnimatePresence mode="wait">
          {/* STEP 0: Intro */}
          {currentStep === 0 && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Camera className="h-10 w-10 text-primary" />
              </div>
              <h1 className="font-display text-3xl font-bold text-foreground mb-3">
                Let's Analyze Your Hair
              </h1>
              <p className="text-muted-foreground mb-2 max-w-md mx-auto">
                We'll guide you through taking photos from 5 angles. You need at least 2 photos, but more angles give better results.
              </p>
              <div className="flex flex-wrap justify-center gap-2 my-6">
                {ANGLES.map((a) => (
                  <span key={a.angle} className="px-3 py-1 rounded-full bg-muted text-xs text-muted-foreground">
                    {a.label}
                  </span>
                ))}
              </div>
              <div className="p-4 rounded-lg bg-manetain-cream border border-border mb-6">
                <div className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground text-left">
                    Your photos are stored privately and only used for your personal analysis. This is not a medical diagnosis.
                  </p>
                </div>
              </div>
              <Button size="lg" className="rounded-full" onClick={() => setCurrentStep(1)}>
                Start Photo Guide <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          )}

          {/* STEPS 1-5: Photo capture per angle */}
          {currentStep >= 1 && currentStep <= 5 && (
            <motion.div
              key={`angle-${angleIndex}`}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
            >
              {/* Progress */}
              <div className="flex items-center gap-1 mb-6">
                {ANGLES.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      i < currentStep ? "bg-primary" : i === currentStep - 1 ? "bg-primary" : "bg-muted"
                    }`}
                  />
                ))}
              </div>

              <p className="text-xs text-muted-foreground mb-1">
                Step {currentStep} of 5
              </p>
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                {photos[angleIndex].label}
              </h2>
              <p className="text-muted-foreground text-sm mb-6">
                {photos[angleIndex].instruction}
              </p>

              {/* Photo area */}
              <div className="mb-6">
                {photos[angleIndex].preview ? (
                  <div className="relative rounded-xl overflow-hidden border border-border aspect-[4/3]">
                    <img
                      src={photos[angleIndex].preview!}
                      alt={photos[angleIndex].label}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => removePhoto(angleIndex)}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-foreground/70 text-background flex items-center justify-center hover:bg-foreground transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Uploaded
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border aspect-[4/3] gap-4 p-6">
                    <Camera className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Take or choose a photo</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        className="rounded-full"
                        onClick={() => handleCameraCapture(angleIndex)}
                      >
                        <Camera className="h-4 w-4 mr-1.5" /> Camera
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="rounded-full"
                        onClick={() => handleGalleryPick(angleIndex)}
                      >
                        <ImageIcon className="h-4 w-4 mr-1.5" /> Gallery
                      </Button>
                      <label>
                        <Button variant="outline" size="sm" className="rounded-full" asChild>
                          <span>
                            <Upload className="h-4 w-4 mr-1.5" /> File
                          </span>
                        </Button>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileChange(angleIndex, e.target.files?.[0] || null)}
                        />
                      </label>
                    </div>
                    <span className="text-xs text-muted-foreground">JPG, PNG up to 10MB</span>
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={() => setCurrentStep(currentStep - 1)}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <div className="flex gap-2">
                  {!photos[angleIndex].file && (
                    <Button
                      variant="ghost"
                      onClick={() => setCurrentStep(Math.min(currentStep + 1, 6))}
                      className="text-muted-foreground"
                    >
                      Skip
                    </Button>
                  )}
                  <Button
                    onClick={() => setCurrentStep(Math.min(currentStep + 1, 6))}
                    className="rounded-full"
                  >
                    {currentStep === 5 ? "Review" : "Next"} <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 6: Review */}
          {currentStep === 6 && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                Review Your Photos
              </h2>
              <p className="text-muted-foreground text-sm mb-6">
                {uploadedCount} of 5 photos uploaded. {canProceedToReview ? "Ready to analyze!" : "Upload at least 2 photos to continue."}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {photos.map((photo, i) => (
                  <div key={photo.angle} className="relative">
                    {photo.preview ? (
                      <div className="rounded-lg overflow-hidden border border-border aspect-square relative">
                        <img src={photo.preview} alt={photo.label} className="w-full h-full object-cover" />
                        <button
                          onClick={() => removePhoto(i)}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-foreground/70 text-background flex items-center justify-center"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border aspect-square cursor-pointer hover:border-primary/50 transition-colors">
                        <Upload className="h-5 w-5 text-muted-foreground mb-1" />
                        <span className="text-[10px] text-muted-foreground">Add</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileChange(i, e.target.files?.[0] || null)}
                        />
                      </label>
                    )}
                    <p className="text-xs text-center text-muted-foreground mt-1">{photo.label}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => setCurrentStep(5)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button
                  className="rounded-full"
                  disabled={!canProceedToReview}
                  onClick={handleAnalyze}
                >
                  Analyze Now <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 7: Analyzing */}
          {currentStep === 7 && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16"
            >
              <Loader2 className="h-16 w-16 text-primary animate-spin mx-auto mb-6" />
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                Analyzing Your Photos
              </h2>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                Our AI is evaluating hair density, hairline position, and crown health. This usually takes 15-30 seconds.
              </p>
            </motion.div>
          )}

          {/* STEP 8: Results */}
          {currentStep === 8 && result && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="text-center mb-8">
                <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-3" />
                <h2 className="font-display text-2xl font-bold text-foreground mb-1">
                  Analysis Complete
                </h2>
                <p className="text-muted-foreground text-sm">Here are your results</p>
              </div>

              {/* Overall Score */}
              <Card className="mb-6">
                <CardContent className="p-6 flex flex-col items-center">
                  <div className="relative w-32 h-32 mb-4">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" className="stroke-muted" />
                      <circle
                        cx="50" cy="50" r="42" fill="none" strokeWidth="8"
                        className="stroke-primary" strokeLinecap="round"
                        strokeDasharray={`${result.overall_score * 2.64} 264`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-display text-4xl font-bold text-foreground">
                        {result.overall_score}
                      </span>
                    </div>
                  </div>
                  <p className="font-display text-lg font-semibold text-foreground">Overall Score</p>
                </CardContent>
              </Card>

              {/* Breakdown */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="font-display text-lg">Score Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {[
                    { label: "Density", score: result.density_score },
                    { label: "Hairline", score: result.hairline_score },
                    { label: "Crown", score: result.crown_score },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-foreground">{item.label}</span>
                        <span className="text-sm text-muted-foreground">{item.score}/100</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.score}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full rounded-full bg-primary"
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* AI Summary */}
              <Card className="mb-6">
                <CardContent className="p-6">
                  <p className="text-sm text-foreground leading-relaxed">{result.ai_summary}</p>
                  {result.comparison_notes && (
                    <p className="text-sm text-muted-foreground mt-3 pt-3 border-t border-border">
                      {result.comparison_notes}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Alert */}
              {result.alert_triggered && (
                <Card className="mb-6 border-accent bg-accent/10">
                  <CardContent className="p-4 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Notable changes detected</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Consider consulting a hair loss specialist for a professional evaluation.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Disclaimer */}
              <div className="p-4 rounded-lg bg-muted/50 mb-8">
                <div className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    This analysis is for informational purposes only and does not constitute medical advice.
                    Consult a healthcare professional for diagnosis and treatment.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button className="flex-1 rounded-full" asChild>
                  <Link to="/dashboard">Back to Dashboard</Link>
                </Button>
                <Button variant="outline" className="flex-1 rounded-full" asChild>
                  <Link to="/treatments">View Treatments</Link>
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 9: Error */}
          {currentStep === 9 && analysisError && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="h-10 w-10 text-destructive" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                Analysis Failed
              </h2>
              <p className="text-muted-foreground text-sm mb-6">
                {analysisError.message}
              </p>

              <Card className="mb-6 text-left">
                <CardHeader>
                  <CardTitle className="font-display text-base">What you can try</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analysisError.code === "rate_limit" && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <RotateCcw className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                      <span>Wait a minute, then retry. The service is temporarily busy.</span>
                    </div>
                  )}
                  {analysisError.code === "credits" && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                      <span>AI credits are exhausted. Please contact support or try again later.</span>
                    </div>
                  )}
                  {analysisError.code === "auth" && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Shield className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                      <span>Your session may have expired. Log out and log back in, then retry.</span>
                    </div>
                  )}
                  {analysisError.code === "upload" && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Upload className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                      <span>Photo upload failed. Check your connection and ensure images are under 10MB.</span>
                    </div>
                  )}
                  {analysisError.code === "unknown" && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                      <span>An unexpected error occurred. Try again — if it persists, try with fewer or smaller photos.</span>
                    </div>
                  )}
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Camera className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    <span>Make sure your photos are clear, well-lit, and show the scalp area properly.</span>
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  className="flex-1 rounded-full"
                  onClick={() => {
                    setAnalysisError(null);
                    handleAnalyze();
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" /> Retry Analysis
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 rounded-full"
                  onClick={() => {
                    setAnalysisError(null);
                    setCurrentStep(6);
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" /> Edit Photos
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Analysis;
