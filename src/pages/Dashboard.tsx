import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <span className="text-primary font-display text-2xl font-bold">
            {user?.user_metadata?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || "M"}
          </span>
        </div>
        <h1 className="font-display text-3xl font-bold text-foreground">
          Welcome{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ""}!
        </h1>
        <p className="text-muted-foreground">Your dashboard is coming soon.</p>
        <Button variant="outline" onClick={handleSignOut} className="rounded-full">
          Sign Out
        </Button>
      </div>
    </div>
  );
};

export default Dashboard;
