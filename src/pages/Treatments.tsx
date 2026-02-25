import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Star, Filter, Droplets, Pill as PillIcon,
  Heart, Stethoscope, DollarSign, Clock, ExternalLink,
} from "lucide-react";
import AuthNavbar from "@/components/AuthNavbar";

type Treatment = {
  id: string;
  name: string;
  description: string;
  category: string;
  cost_level: string | null;
  commitment_level: string | null;
  evidence_rating: number | null;
  affiliate_url: string | null;
};

const CATEGORIES = ["all", "topical", "supplement", "lifestyle", "professional"] as const;
const COSTS = ["all", "low", "medium", "high"] as const;
const COMMITMENTS = ["all", "low", "medium", "high"] as const;

const categoryIcon = (cat: string) => {
  switch (cat) {
    case "topical": return <Droplets className="h-4 w-4" />;
    case "supplement": return <PillIcon className="h-4 w-4" />;
    case "lifestyle": return <Heart className="h-4 w-4" />;
    case "professional": return <Stethoscope className="h-4 w-4" />;
    default: return null;
  }
};

const categoryLabel = (cat: string) =>
  cat.charAt(0).toUpperCase() + cat.slice(1);

const costLabel = (c: string | null) => {
  if (!c) return "—";
  return c === "low" ? "$" : c === "medium" ? "$$" : "$$$";
};

const commitmentLabel = (c: string | null) => {
  if (!c) return "—";
  return c === "low" ? "Low effort" : c === "medium" ? "Regular" : "High effort";
};

const Treatments = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [category, setCategory] = useState<string>("all");
  const [cost, setCost] = useState<string>("all");
  const [commitment, setCommitment] = useState<string>("all");

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [user, loading, navigate]);

  const { data: treatments = [] } = useQuery({
    queryKey: ["treatments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("treatments")
        .select("*")
        .order("evidence_rating", { ascending: false });
      if (error) throw error;
      return data as Treatment[];
    },
    enabled: !!user,
  });

  if (loading || !user) return null;

  const filtered = treatments.filter((t) => {
    if (category !== "all" && t.category !== category) return false;
    if (cost !== "all" && t.cost_level !== cost) return false;
    if (commitment !== "all" && t.commitment_level !== commitment) return false;
    return true;
  });

  const FilterChips = ({
    label,
    options,
    value,
    onChange,
  }: {
    label: string;
    options: readonly string[];
    value: string;
    onChange: (v: string) => void;
  }) => (
    <div>
      <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              value === opt
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {opt === "all" ? "All" : categoryLabel(opt)}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <AuthNavbar />

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8 pb-24 md:pb-8 max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl font-bold text-foreground mb-1">
            Treatment Recommendations
          </h1>
          <p className="text-muted-foreground text-sm mb-8">
            Evidence-based options to support your hair health journey.
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-8">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Filter className="h-4 w-4 text-primary" /> Filters
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FilterChips label="Category" options={CATEGORIES} value={category} onChange={setCategory} />
                <FilterChips label="Cost" options={COSTS} value={cost} onChange={setCost} />
                <FilterChips label="Commitment" options={COMMITMENTS} value={commitment} onChange={setCommitment} />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Results count */}
        <p className="text-xs text-muted-foreground mb-4">
          Showing {filtered.length} of {treatments.length} treatments
        </p>

        {/* Treatment Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
            >
              <Card className="h-full hover:border-primary/30 transition-colors">
                <CardContent className="p-5 flex flex-col h-full">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        {categoryIcon(t.category)}
                      </div>
                      <div>
                        <h3 className="font-display text-sm font-semibold text-foreground leading-tight">
                          {t.name}
                        </h3>
                        <Badge variant="secondary" className="text-[10px] mt-1">
                          {categoryLabel(t.category)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground leading-relaxed flex-1 mb-4">
                    {t.description}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div className="flex items-center gap-3">
                      {/* Evidence */}
                      <div className="flex items-center gap-1" title="Evidence rating">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <Star
                            key={idx}
                            className={`h-3 w-3 ${
                              idx < (t.evidence_rating ?? 0)
                                ? "text-primary fill-primary"
                                : "text-muted"
                            }`}
                          />
                        ))}
                      </div>
                      {/* Cost */}
                      <span className="flex items-center gap-0.5 text-xs text-muted-foreground" title="Cost level">
                        <DollarSign className="h-3 w-3" />
                        {costLabel(t.cost_level)}
                      </span>
                      {/* Commitment */}
                      <span className="flex items-center gap-0.5 text-xs text-muted-foreground" title="Commitment level">
                        <Clock className="h-3 w-3" />
                        {commitmentLabel(t.commitment_level)}
                      </span>
                    </div>
                    {t.affiliate_url && (
                      <a
                        href={t.affiliate_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary flex items-center gap-1 hover:underline"
                      >
                        Learn more <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-sm">No treatments match your filters.</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => { setCategory("all"); setCost("all"); setCommitment("all"); }}
            >
              Clear filters
            </Button>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-[10px] text-muted-foreground text-center mt-8 max-w-lg mx-auto">
          ⚕️ These recommendations are for informational purposes only and do not constitute medical advice.
          Consult a healthcare professional before starting any treatment.
        </p>
      </main>
    </div>
  );
};

export default Treatments;
