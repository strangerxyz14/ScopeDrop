
import { Header } from "@/components/Header/Header";
import Footer from "@/components/Footer";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Mail, BookOpen, Clock, Send } from "lucide-react";

const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
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
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow">
        {/* Header */}
        <div className="bg-gradient-to-r from-oxford to-oxford-400 text-white py-16">
          <div className="container mx-auto px-4 text-center">
            <Mail size={48} className="text-parrot mx-auto mb-4" />
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-4">
              ElevArc Newsletter
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              The twice-weekly briefing that keeps founders, investors, and operators 
              ahead of the curve on startup trends and opportunities.
            </p>
          </div>
        </div>
        
        {/* Newsletter Features */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center p-6 rounded-lg bg-white shadow-md">
                <BookOpen size={32} className="text-oxford mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Curated Insights</h3>
                <p className="text-gray-600">
                  Expert analysis on funding rounds, acquisitions, and market trends that matter most.
                </p>
              </div>
              
              <div className="text-center p-6 rounded-lg bg-white shadow-md">
                <Clock size={32} className="text-oxford mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Twice Weekly</h3>
                <p className="text-gray-600">
                  Delivered Tuesday and Friday mornings, optimized for your morning review.
                </p>
              </div>
              
              <div className="text-center p-6 rounded-lg bg-white shadow-md">
                <Send size={32} className="text-oxford mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">No Spam</h3>
                <p className="text-gray-600">
                  Focused content, no fluff, and a clean reading experience with one-click unsubscribe.
                </p>
              </div>
            </div>
          </div>
        </section>
        
        {/* Subscription Form */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 max-w-lg">
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <h2 className="text-2xl font-display font-bold mb-6 text-oxford text-center">
                Subscribe to the Newsletter
              </h2>
              
              {submitted ? (
                <div className="text-center py-8">
                  <div className="bg-green-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                    <Check size={32} className="text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">You're subscribed!</h3>
                  <p className="text-gray-600">
                    Thank you for subscribing. Your first newsletter will arrive in your inbox soon!
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email address
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full"
                      required
                    />
                  </div>
                  
                  <Button 
                    type="submit"
                    className="w-full bg-oxford text-white hover:bg-oxford-400"
                    disabled={loading}
                  >
                    {loading ? "Subscribing..." : "Subscribe for Free"}
                  </Button>
                  
                  <p className="text-xs text-gray-500 text-center">
                    We respect your privacy. Unsubscribe at any time.
                  </p>
                </form>
              )}
            </div>
          </div>
        </section>
        
        {/* Social Proof */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-display font-bold mb-8 text-center text-oxford">
              Trusted by Startup Leaders
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
                <p className="italic text-gray-600 mb-4">
                  "ElevArc's newsletter has become essential reading for our team. It consistently surfaces 
                  insights that we wouldn't find anywhere else."
                </p>
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-oxford-100 flex items-center justify-center text-oxford font-bold">
                    JD
                  </div>
                  <div className="ml-3">
                    <p className="font-bold">Jane Doe</p>
                    <p className="text-sm text-gray-600">Founder, TechVentures</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
                <p className="italic text-gray-600 mb-4">
                  "The twice-weekly format is perfect—comprehensive enough to keep me informed, 
                  but concise enough that I can digest it quickly."
                </p>
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-oxford-100 flex items-center justify-center text-oxford font-bold">
                    JS
                  </div>
                  <div className="ml-3">
                    <p className="font-bold">John Smith</p>
                    <p className="text-sm text-gray-600">Partner, Venture Capital Firm</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
                <p className="italic text-gray-600 mb-4">
                  "I appreciate how ElevArc connects the dots between funding announcements and 
                  larger market trends. It's more than just news—it's insight."
                </p>
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-oxford-100 flex items-center justify-center text-oxford font-bold">
                    SJ
                  </div>
                  <div className="ml-3">
                    <p className="font-bold">Sarah Johnson</p>
                    <p className="text-sm text-gray-600">CEO, Growth Startup</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Newsletter;
