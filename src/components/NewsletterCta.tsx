
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, Check } from "lucide-react";

const NewsletterCta = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setSubmitted(true);
      setLoading(false);
    }, 1000);
  };

  return (
    <section className="py-16 bg-oxford text-white">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <Mail size={40} className="text-parrot mx-auto mb-4" />
          
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold mb-4">
            Get Startup Intelligence Directly to Your Inbox
          </h2>
          
          <p className="text-blue-100 mb-8 text-lg">
            Join over 20,000 founders, investors, and operators who receive our twice-weekly 
            briefing on funding rounds, market trends, and growth opportunities.
          </p>
          
          {submitted ? (
            <div className="bg-oxford-400 rounded-lg p-8 inline-flex items-center">
              <Check size={24} className="text-parrot mr-3" />
              <span className="text-lg">Thank you for subscribing!</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                className="flex-grow px-4 py-3 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-parrot"
                required
              />
              <Button 
                type="submit"
                disabled={loading}
                className="bg-parrot text-oxford font-medium hover:bg-parrot-400 px-6 py-3"
              >
                {loading ? "Subscribing..." : "Subscribe Free"}
              </Button>
            </form>
          )}
          
          <p className="text-blue-200 mt-4 text-sm">
            We respect your privacy. Unsubscribe at any time.
          </p>
        </div>
      </div>
    </section>
  );
};

export default NewsletterCta;
