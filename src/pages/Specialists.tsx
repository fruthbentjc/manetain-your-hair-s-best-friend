import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  MapPin, Phone, Globe, Star, Search, ExternalLink, Calendar,
} from "lucide-react";
import AuthNavbar from "@/components/AuthNavbar";

interface Clinic {
  id: string;
  name: string;
  specialty: string;
  location: string;
  city: string;
  rating: number;
  reviewCount: number;
  phone: string;
  website: string;
  acceptsReport: boolean;
  image: string;
}

const CLINICS: Clinic[] = [
  {
    id: "1", name: "Hairline Restoration Clinic", specialty: "Hair Transplant",
    location: "123 Medical Center Dr", city: "New York", rating: 4.8, reviewCount: 234,
    phone: "(212) 555-0101", website: "https://example.com",
    acceptsReport: true, image: "👨‍⚕️",
  },
  {
    id: "2", name: "Derma Hair Solutions", specialty: "Dermatology",
    location: "456 Wellness Blvd", city: "Los Angeles", rating: 4.6, reviewCount: 189,
    phone: "(310) 555-0202", website: "https://example.com",
    acceptsReport: true, image: "🏥",
  },
  {
    id: "3", name: "Crown & Glory Medical", specialty: "PRP Therapy",
    location: "789 Health Park Ave", city: "Chicago", rating: 4.9, reviewCount: 312,
    phone: "(312) 555-0303", website: "https://example.com",
    acceptsReport: true, image: "💉",
  },
  {
    id: "4", name: "Follicle First Clinic", specialty: "Trichology",
    location: "321 Care Center Ln", city: "Houston", rating: 4.5, reviewCount: 156,
    phone: "(713) 555-0404", website: "https://example.com",
    acceptsReport: false, image: "🔬",
  },
  {
    id: "5", name: "Advanced Hair Lab", specialty: "Hair Transplant",
    location: "654 Innovation Way", city: "Miami", rating: 4.7, reviewCount: 278,
    phone: "(305) 555-0505", website: "https://example.com",
    acceptsReport: true, image: "🧪",
  },
  {
    id: "6", name: "Scalp Health Institute", specialty: "Dermatology",
    location: "987 University Pkwy", city: "San Francisco", rating: 4.4, reviewCount: 143,
    phone: "(415) 555-0606", website: "https://example.com",
    acceptsReport: false, image: "🩺",
  },
];

const SPECIALTIES = ["All", "Hair Transplant", "Dermatology", "PRP Therapy", "Trichology"];
const CITIES = ["All", ...Array.from(new Set(CLINICS.map((c) => c.city)))];

const Specialists = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("All");
  const [city, setCity] = useState("All");

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  const filtered = CLINICS.filter((c) => {
    if (specialty !== "All" && c.specialty !== specialty) return false;
    if (city !== "All" && c.city !== city) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.location.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <AuthNavbar />

      <main className="container mx-auto px-6 py-8 max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl font-bold text-foreground mb-1">Find a Specialist</h1>
          <p className="text-muted-foreground text-sm mb-8">
            Connect with trusted hair health professionals near you.
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clinics..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                maxLength={100}
              />
            </div>
            <Select value={specialty} onValueChange={setSpecialty}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPECIALTIES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CITIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        <p className="text-xs text-muted-foreground mb-4">
          Showing {filtered.length} of {CLINICS.length} clinics
        </p>

        {/* Clinic Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((clinic, i) => (
            <motion.div
              key={clinic.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
            >
              <Card className="h-full hover:border-primary/30 transition-colors">
                <CardContent className="p-5 flex flex-col h-full">
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl shrink-0">
                      {clinic.image}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-sm font-semibold text-foreground leading-tight">
                        {clinic.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[10px]">{clinic.specialty}</Badge>
                        {clinic.acceptsReport && (
                          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                            Accepts Reports
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="space-y-1.5 text-xs text-muted-foreground flex-1 mb-4">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span>{clinic.location}, {clinic.city}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3 shrink-0" />
                      <span>{clinic.phone}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Star className="h-3 w-3 text-primary fill-primary shrink-0" />
                      <span className="text-foreground font-medium">{clinic.rating}</span>
                      <span>({clinic.reviewCount} reviews)</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-3 border-t border-border">
                    <Button className="flex-1 rounded-full text-xs" size="sm">
                      <Calendar className="h-3 w-3 mr-1" /> Book Consultation
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-full text-xs" asChild>
                      <a href={clinic.website} target="_blank" rel="noopener noreferrer">
                        <Globe className="h-3 w-3 mr-1" /> Website
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-sm">No clinics match your search.</p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setSearch(""); setSpecialty("All"); setCity("All"); }}>
              Clear filters
            </Button>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground text-center mt-8 max-w-lg mx-auto">
          🏥 Clinic listings are for informational purposes. Manetain does not endorse any specific provider.
          Always verify credentials before scheduling.
        </p>
      </main>
    </div>
  );
};

export default Specialists;
