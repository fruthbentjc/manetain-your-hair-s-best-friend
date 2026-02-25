import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar, TrendingUp, ChevronDown, ChevronUp,
  Camera, Activity, ArrowRight, X, Columns2
} from "lucide-react";
import AuthNavbar from "@/components/AuthNavbar";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format } from "date-fns";

interface Session {
  id: string;
  user_id: string;
  overall_score: number | null;
  density_score: number | null;
  hairline_score: number | null;
  crown_score: number | null;
  ai_summary: string | null;
  comparison_notes: string | null;
  alert_triggered: boolean | null;
  created_at: string;
}

interface Photo {
  id: string;
  session_id: string;
  angle: string;
  photo_url: string;
}

const ANGLE_LABELS: Record<string, string> = {
  top: "Top",
  hairline: "Hairline",
  left_temple: "Left Temple",
  right_temple: "Right Temple",
  crown: "Crown",
};

const History = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<[string, string] | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [user, loading, navigate]);

  const { data: sessions = [] } = useQuery({
    queryKey: ["history_sessions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analysis_sessions")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Session[];
    },
    enabled: !!user,
  });

  const { data: allPhotos = [] } = useQuery({
    queryKey: ["history_photos", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analysis_photos")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data as Photo[];
    },
    enabled: !!user,
  });

  if (loading || !user) return null;

  const chartData = [...sessions]
    .reverse()
    .map((s) => ({
      date: format(new Date(s.created_at), "MMM d"),
      overall: s.overall_score ?? 0,
      density: s.density_score ?? 0,
      hairline: s.hairline_score ?? 0,
      crown: s.crown_score ?? 0,
    }));

  const getPhotosForSession = (sessionId: string) =>
    allPhotos.filter((p) => p.session_id === sessionId);

  const toggleCompare = (id: string) => {
    if (!compareIds) {
      setCompareIds([id, sessions.find((s) => s.id !== id)?.id || id]);
    } else if (compareIds[0] === id || compareIds[1] === id) {
      setCompareIds(null);
    } else {
      setCompareIds([compareIds[0], id]);
    }
  };

  const compareSessionA = compareIds ? sessions.find((s) => s.id === compareIds[0]) : null;
  const compareSessionB = compareIds ? sessions.find((s) => s.id === compareIds[1]) : null;

  return (
    <div className="min-h-screen bg-background">
      <AuthNavbar />

      <main className="container mx-auto px-6 py-8 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl font-bold text-foreground mb-1">Progress History</h1>
          <p className="text-muted-foreground text-sm mb-8">
            {sessions.length} {sessions.length === 1 ? "analysis" : "analyses"} recorded
          </p>
        </motion.div>

        {sessions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <Activity className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="font-display text-xl font-semibold text-foreground mb-2">No analyses yet</h2>
            <p className="text-muted-foreground text-sm mb-6">Complete your first photo analysis to start tracking.</p>
            <Button className="rounded-full" asChild>
              <Link to="/analysis">Take Your First Photo <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </motion.div>
        ) : (
          <>
            {/* Trend Chart */}
            {chartData.length > 1 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card className="mb-8">
                  <CardHeader>
                    <CardTitle className="font-display text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Score Trends
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                        <Line type="monotone" dataKey="overall" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(var(--primary))" }} name="Overall" />
                        <Line type="monotone" dataKey="density" stroke="hsl(var(--accent))" strokeWidth={1.5} dot={{ r: 3 }} name="Density" />
                        <Line type="monotone" dataKey="hairline" stroke="hsl(var(--manetain-sage))" strokeWidth={1.5} dot={{ r: 3 }} name="Hairline" />
                        <Line type="monotone" dataKey="crown" stroke="hsl(var(--manetain-warm))" strokeWidth={1.5} dot={{ r: 3 }} name="Crown" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Compare Mode */}
            {sessions.length >= 2 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                {compareIds ? (
                  <Card className="mb-8">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="font-display text-lg flex items-center gap-2">
                        <Columns2 className="h-5 w-5 text-primary" />
                        Side-by-Side Comparison
                      </CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => setCompareIds(null)}>
                        <X className="h-4 w-4 mr-1" /> Close
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {compareSessionA && compareSessionB && (
                        <div className="grid grid-cols-2 gap-4">
                          {[compareSessionA, compareSessionB].map((session) => (
                            <div key={session.id}>
                              <p className="text-xs text-muted-foreground mb-2 text-center">
                                {format(new Date(session.created_at), "MMM d, yyyy")}
                              </p>
                              <div className="text-center mb-3">
                                <span className="font-display text-3xl font-bold text-foreground">
                                  {session.overall_score ?? "—"}
                                </span>
                                <span className="text-sm text-muted-foreground">/100</span>
                              </div>
                              {[
                                { label: "Density", score: session.density_score },
                                { label: "Hairline", score: session.hairline_score },
                                { label: "Crown", score: session.crown_score },
                              ].map((item) => (
                                <div key={item.label} className="mb-2">
                                  <div className="flex justify-between text-xs mb-1">
                                    <span className="text-muted-foreground">{item.label}</span>
                                    <span className="text-foreground">{item.score ?? "—"}</span>
                                  </div>
                                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-primary"
                                      style={{ width: `${item.score ?? 0}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                              {/* Photos */}
                              <div className="grid grid-cols-2 gap-1 mt-3">
                                {getPhotosForSession(session.id).map((photo) => (
                                  <div key={photo.id} className="rounded overflow-hidden aspect-square">
                                    <img
                                      src={photo.photo_url}
                                      alt={ANGLE_LABELS[photo.angle] || photo.angle}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground text-center mt-4">
                        Click any session below to swap it into the comparison.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="mb-6 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={() => setCompareIds([sessions[0].id, sessions[1].id])}
                    >
                      <Columns2 className="h-4 w-4 mr-1" /> Compare Sessions
                    </Button>
                  </div>
                )}
              </motion.div>
            )}

            {/* Timeline */}
            <div className="space-y-4">
              {sessions.map((session, i) => {
                const photos = getPhotosForSession(session.id);
                const isExpanded = expandedId === session.id;
                const prevSession = sessions[i + 1]; // sessions sorted desc
                const scoreDiff =
                  prevSession && session.overall_score != null && prevSession.overall_score != null
                    ? session.overall_score - prevSession.overall_score
                    : null;

                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * i }}
                  >
                    <Card
                      className={`transition-colors cursor-pointer ${
                        compareIds?.includes(session.id) ? "border-primary ring-1 ring-primary" : "hover:border-primary/30"
                      }`}
                    >
                      <CardContent
                        className="p-5"
                        onClick={() => setExpandedId(isExpanded ? null : session.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="font-display text-lg font-bold text-primary">
                                {session.overall_score ?? "—"}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-foreground">
                                  {format(new Date(session.created_at), "MMMM d, yyyy")}
                                </p>
                                {scoreDiff !== null && (
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded-full ${
                                      scoreDiff > 0
                                        ? "bg-primary/10 text-primary"
                                        : scoreDiff < 0
                                        ? "bg-destructive/10 text-destructive"
                                        : "bg-muted text-muted-foreground"
                                    }`}
                                  >
                                    {scoreDiff > 0 ? "+" : ""}{scoreDiff}
                                  </span>
                                )}
                                {session.alert_triggered && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                                    Alert
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {photos.length} photo{photos.length !== 1 ? "s" : ""} · D:{session.density_score} H:{session.hairline_score} C:{session.crown_score}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {compareIds && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCompare(session.id);
                                }}
                                className="text-xs"
                              >
                                {compareIds.includes(session.id) ? "Selected" : "Compare"}
                              </Button>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="pt-4 mt-4 border-t border-border">
                                {/* Scores */}
                                <div className="grid grid-cols-3 gap-4 mb-4">
                                  {[
                                    { label: "Density", score: session.density_score },
                                    { label: "Hairline", score: session.hairline_score },
                                    { label: "Crown", score: session.crown_score },
                                  ].map((item) => (
                                    <div key={item.label}>
                                      <div className="flex justify-between text-xs mb-1">
                                        <span className="text-muted-foreground">{item.label}</span>
                                        <span className="text-foreground font-medium">{item.score ?? "—"}/100</span>
                                      </div>
                                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                                        <div
                                          className="h-full rounded-full bg-primary"
                                          style={{ width: `${item.score ?? 0}%` }}
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {/* Summary */}
                                {session.ai_summary && (
                                  <p className="text-sm text-foreground leading-relaxed mb-4">
                                    {session.ai_summary}
                                  </p>
                                )}

                                {/* Photos */}
                                {photos.length > 0 && (
                                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                    {photos.map((photo) => (
                                      <div key={photo.id} className="relative rounded-lg overflow-hidden aspect-square">
                                        <img
                                          src={photo.photo_url}
                                          alt={ANGLE_LABELS[photo.angle] || photo.angle}
                                          className="w-full h-full object-cover"
                                        />
                                        <span className="absolute bottom-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-foreground/70 text-background">
                                          {ANGLE_LABELS[photo.angle] || photo.angle}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default History;
