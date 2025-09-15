import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import universityLogo from "@/assets/university-logo.png";
import engexLogo from "@/assets/engex-logo.png";

interface RegistrationProps {
  onRegistrationSuccess: (username: string, name: string, phone: string) => void;
}

export default function Registration({ onRegistrationSuccess }: RegistrationProps) {
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !name.trim() || !phone.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Check if username already exists
      const { data: existingPlayer } = await supabase
        .from("players")
        .select("username")
        .eq("username", username.trim())
        .single();

      if (existingPlayer) {
        toast({
          title: "Username taken",
          description: "This username is already taken. Please choose another one.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Insert new player
      const { error } = await supabase
        .from("players")
        .insert({
          username: username.trim(),
          name: name.trim(),
          phone: phone.trim(),
        });

      if (error) throw error;

      toast({
        title: "Registration successful!",
        description: "Get ready to start the quiz!",
      });

      onRegistrationSuccess(username.trim(), name.trim(), phone.trim());
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: "There was an error during registration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md quiz-card border-0 shadow-2xl">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center items-center gap-6 mb-4">
            <img src={universityLogo} alt="University of Peradeniya" className="h-16 w-auto" />
            <img src={engexLogo} alt="EngEX Exhibition" className="h-16 w-auto" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Math Quiz Challenge
          </CardTitle>
          <p className="text-muted-foreground text-sm mt-2">
            Celebrating 75 Years of Excellence
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your unique username"
                className="mt-1"
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="mt-1"
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter your phone number"
                className="mt-1"
                disabled={loading}
              />
            </div>
            <Button
              type="submit"
              className="w-full quiz-gradient hover:opacity-90 transition-opacity"
              disabled={loading}
            >
              {loading ? "Registering..." : "Submit and Play"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}