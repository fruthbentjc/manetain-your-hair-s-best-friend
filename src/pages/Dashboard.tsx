import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Camera, TrendingUp, Flame, AlertTriangle, ArrowRight,
  BarChart3, Pill, Stethoscope, Activity
} from "lucide-react";
import AuthNavbar from "@/components/AuthNavbar";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, differenceInDays, differenceInWeeks, startOfWeek, eachWeekOfInterval, subWeeks } from "date-fns";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [user, loading, navigate]);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["analysis_sessions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analysis_sessions")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (loading || !user) return null;

  const latestSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;
  const hasAlert = latestSession?.alert_triggered;

  // Streak calculation
  const calculateStreak = () => {
    if (sessions.length === 0) return 0;
    let streak = 0;
    const now = new Date();
    const sortedDesc = [...sessions].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    for (let i = 0; i < sortedDesc.length; i++) {
      const sessionWeek = startOfWeek(new Date(sortedDesc[i].created_at));
      const expectedWeek = startOfWeek(subWeeks(now, i));
      if (sessionWeek.getTime() === expectedWeek.getTime()) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  const streak = calculateStreak();

  // Chart data
  const chartData = sessions.map((s) => ({
    date: format(new Date(s.created_at), "MMM d"),
    score: s.overall_score ?? 0,
    density: s.density_score ?? 0,
  }));

  const displayName = profile?.full_name || user.user_metadata?.full_name || "there";
  const firstName = displayName.split(" ")[0];

  return (
    <div className="min-h-screen bg-background">
      <AuthNavbar />

      <main className="container mx-auto px-6 py-8 max-w-6xl">
        {/* Welcome */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0} className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            Hey, {firstName} 👋
          </h1>
          <p className="text-muted-foreground mt-1">Here's your hair health overview.</p>
        </motion.div>

        {/* Alert Banner */}
        {hasAlert && (
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0.5}>
            <Card className="mb-6 border-accent bg-accent/10">
              <CardContent className="flex items-center gap-3 py-4">
                <AlertTriangle className="h-5 w-5 text-accent shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Change detected</p>
                  <p className="text-xs text-muted-foreground">
                    Our AI noticed changes in your latest analysis. Consider reviewing your progress or consulting a specialist.
                  </p>
                </div>
                <Button size="sm" variant="outline" className="ml-auto shrink-0 rounded-full" asChild>
                  <Link to="/history">View Details</Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Health Score */}
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}>
            <Card className="h-full">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="relative w-28 h-28 mb-4">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" className="stroke-muted" />
                    <circle
                      cx="50" cy="50" r="42" fill="none" strokeWidth="8"
                      className="stroke-primary"
                      strokeLinecap="round"
                      strokeDasharray={`${(latestSession?.overall_score ?? 0) * 2.64} 264`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-display text-3xl font-bold text-foreground">
                      {latestSession?.overall_score ?? "—"}
                    </span>
                  </div>
                </div>
                <p className="text-sm font-medium text-foreground">Hair Health Score</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {latestSession ? "Based on your latest analysis" : "Complete your first analysis"}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Streak */}
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2}>
            <Card className="h-full">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="w-28 h-28 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                  <Flame className="h-12 w-12 text-accent" />
                </div>
                <p className="font-display text-3xl font-bold text-foreground">{streak}</p>
                <p className="text-sm font-medium text-foreground mt-1">Week Streak</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {streak > 0 ? "Keep it going!" : "Start your first analysis"}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Action */}
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3}>
            <Card className="h-full bg-primary text-primary-foreground">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                <Camera className="h-12 w-12 mb-4 opacity-90" />
                <p className="font-display text-lg font-semibold mb-2">Take This Week's Photo</p>
                <p className="text-sm opacity-80 mb-4">Stay consistent for the best tracking results.</p>
                <Button
                  variant="secondary"
                  className="rounded-full"
                  asChild
                >
                  <Link to="/analysis">
                    Start Analysis <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Progress Chart */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4}>
          <Card className="mb-8">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Progress Over Time
              </CardTitle>
              {sessions.length > 0 && (
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/history" className="text-xs">View All</Link>
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {chartData.length > 1 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <YAxis domain={[0, 100]} className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(var(--primary))" }} name="Overall" />
                    <Line type="monotone" dataKey="density" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 3, fill: "hsl(var(--accent))" }} name="Density" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[240px] flex flex-col items-center justify-center text-center">
                  <Activity className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {sessions.length === 1
                      ? "Complete one more analysis to see your trend."
                      : "Your progress chart will appear after your first analysis."}
                  </p>
                  <Button variant="outline" className="mt-4 rounded-full" size="sm" asChild>
                    <Link to="/analysis">Take Your First Photo</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Score Breakdown */}
        {latestSession && (
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={5}>
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Latest Analysis Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {[
                    { label: "Density", score: latestSession.density_score, color: "bg-primary" },
                    { label: "Hairline", score: latestSession.hairline_score, color: "bg-primary" },
                    { label: "Crown", score: latestSession.crown_score, color: "bg-primary" },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">{item.label}</span>
                        <span className="text-sm text-muted-foreground">{item.score ?? "—"}/100</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${item.color} transition-all duration-700`}
                          style={{ width: `${item.score ?? 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {latestSession.ai_summary && (
                  <div className="mt-6 p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-foreground leading-relaxed">{latestSession.ai_summary}</p>
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      ⚠️ This is not medical advice. Consult a healthcare professional for diagnosis.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Quick Links */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={6}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: BarChart3, title: "View History", desc: "See all past analyses", href: "/history" },
              { icon: Pill, title: "Treatments", desc: "Personalized recommendations", href: "/treatments" },
              { icon: Stethoscope, title: "Find Specialist", desc: "Connect with experts", href: "/specialists" },
            ].map((item) => (
              <Link key={item.href} to={item.href}>
                <Card className="h-full hover:border-primary/30 transition-colors cursor-pointer">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Dashboard;
