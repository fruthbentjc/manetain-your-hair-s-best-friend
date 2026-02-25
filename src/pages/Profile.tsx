import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  User, Save, Trash2, Shield, Bell,
} from "lucide-react";
import AuthNavbar from "@/components/AuthNavbar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const HAIR_TYPES = [
  { value: "straight", label: "Straight" },
  { value: "wavy", label: "Wavy" },
  { value: "curly", label: "Curly" },
  { value: "coily", label: "Coily" },
  { value: "thinning", label: "Thinning" },
];

const Profile = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [hairType, setHairType] = useState("");
  const [familyHistory, setFamilyHistory] = useState(false);
  const [weeklyReminder, setWeeklyReminder] = useState(true);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [user, loading, navigate]);

  const { data: profile, isLoading: profileLoading } = useQuery({
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

  // Sync form when profile loads
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setAge(profile.age?.toString() || "");
      setHairType(profile.hair_type || "");
      setFamilyHistory(profile.family_history_hair_loss || false);
      setDirty(false);
    }
  }, [profile]);

  const updateProfile = useMutation({
    mutationFn: async () => {
      const parsedAge = age ? parseInt(age, 10) : null;
      if (parsedAge !== null && (isNaN(parsedAge) || parsedAge < 1 || parsedAge > 120)) {
        throw new Error("Age must be between 1 and 120");
      }
      const trimmedName = fullName.trim().slice(0, 100);

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: trimmedName || null,
          age: parsedAge,
          hair_type: hairType || null,
          family_history_hair_loss: familyHistory,
        })
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setDirty(false);
      toast({ title: "Profile updated", description: "Your changes have been saved." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleChange = (setter: (v: any) => void) => (v: any) => {
    setter(v);
    setDirty(true);
  };

  if (loading || !user || profileLoading) return null;

  return (
    <div className="min-h-screen bg-background">
      <AuthNavbar />

      <main className="container mx-auto px-6 py-8 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl font-bold text-foreground mb-1">Profile & Settings</h1>
          <p className="text-muted-foreground text-sm mb-8">Manage your hair profile and preferences.</p>
        </motion.div>

        {/* Hair Profile */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-primary" /> Hair Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => handleChange(setFullName)(e.target.value)}
                  placeholder="Your name"
                  maxLength={100}
                />
              </div>

              {/* Age */}
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  min={1}
                  max={120}
                  value={age}
                  onChange={(e) => handleChange(setAge)(e.target.value)}
                  placeholder="e.g. 30"
                />
              </div>

              {/* Hair Type */}
              <div className="space-y-2">
                <Label>Hair Type</Label>
                <Select value={hairType} onValueChange={handleChange(setHairType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select hair type" />
                  </SelectTrigger>
                  <SelectContent>
                    {HAIR_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Family History */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>Family History of Hair Loss</Label>
                  <p className="text-xs text-muted-foreground">Helps personalize your analysis</p>
                </div>
                <Switch
                  checked={familyHistory}
                  onCheckedChange={handleChange(setFamilyHistory)}
                />
              </div>

              {/* Save */}
              <Button
                className="w-full rounded-full"
                disabled={!dirty || updateProfile.isPending}
                onClick={() => updateProfile.mutate()}
              >
                <Save className="h-4 w-4 mr-2" />
                {updateProfile.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Notifications */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" /> Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Weekly Photo Reminders</p>
                  <p className="text-xs text-muted-foreground">Get reminded to take your weekly analysis photos</p>
                </div>
                <Switch
                  checked={weeklyReminder}
                  onCheckedChange={setWeeklyReminder}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Account */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" /> Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Email */}
              <div className="space-y-1">
                <Label>Email</Label>
                <p className="text-sm text-foreground">{user.email}</p>
              </div>

              <Separator />

              {/* Sign Out */}
              <Button
                variant="outline"
                className="w-full rounded-full"
                onClick={async () => {
                  await signOut();
                  navigate("/");
                }}
              >
                Sign Out
              </Button>

              {/* Delete Account */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" className="w-full text-destructive hover:text-destructive rounded-full">
                    <Trash2 className="h-4 w-4 mr-2" /> Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. All your data, photos, and analysis history will be permanently deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => {
                        toast({ title: "Account deletion", description: "Please contact support to delete your account." });
                      }}
                    >
                      Delete Account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </motion.div>

        <p className="text-[10px] text-muted-foreground text-center mt-4">
          Your data is stored securely and never shared with third parties.
        </p>
      </main>
    </div>
  );
};

export default Profile;
