
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";

const SignOut = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Simulate sign out process
    setTimeout(() => {
      // Show success toast
      toast({
        title: "Signed out successfully",
        description: "You have been signed out of your account.",
      });
      
      // Redirect to home page
      navigate("/");
    }, 800);
  }, [navigate]);
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Signing out...</h1>
        <div className="flex justify-center space-x-2">
          <div className="h-2 w-2 bg-oxford rounded-full animate-bounce"></div>
          <div className="h-2 w-2 bg-oxford rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
          <div className="h-2 w-2 bg-oxford rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
        </div>
      </div>
    </div>
  );
};

export default SignOut;
