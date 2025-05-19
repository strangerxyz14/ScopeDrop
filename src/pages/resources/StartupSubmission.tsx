
import ResourcePageTemplate from "@/components/ResourcePageTemplate";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "@/components/ui/use-toast";

const StartupSubmission = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate submission process
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "Submission Received",
        description: "Thank you for submitting your startup. Our team will review it shortly.",
      });
      
      // Reset form
      const form = e.target as HTMLFormElement;
      form.reset();
    }, 1000);
  };
  
  return (
    <ResourcePageTemplate
      title="Startup Submission"
      description="Submit your startup to be featured on ScopeDrop"
      topic="startup-submission"
    >
      <div className="space-y-8">
        <div className="prose max-w-none">
          <p>
            We're always looking for innovative startups to feature on ScopeDrop. Submit your 
            details below and our editorial team will review your application. If selected, 
            your startup could be featured in our newsletter, website, or social media channels.
          </p>
          
          <h2>Submission Guidelines</h2>
          <ul>
            <li>Your startup should have a functional product or service</li>
            <li>Please provide accurate information about your funding status</li>
            <li>Include high-quality images and logos for better presentation</li>
            <li>Be clear about what makes your startup innovative or unique</li>
          </ul>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Company Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name*</Label>
                <Input id="company-name" required />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="website">Website URL*</Label>
                <Input id="website" type="url" required />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Company Description*</Label>
              <Textarea id="description" placeholder="Tell us about your startup" required />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="founding-date">Founding Date*</Label>
                <Input id="founding-date" type="date" required />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location">Headquarters Location*</Label>
                <Input id="location" required />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sector">Primary Sector*</Label>
                <Select required>
                  <SelectTrigger id="sector">
                    <SelectValue placeholder="Select sector" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ai-ml">AI & Machine Learning</SelectItem>
                    <SelectItem value="fintech">Fintech</SelectItem>
                    <SelectItem value="health-tech">Health Tech</SelectItem>
                    <SelectItem value="climate-tech">Climate Tech</SelectItem>
                    <SelectItem value="ed-tech">EdTech</SelectItem>
                    <SelectItem value="saas">SaaS</SelectItem>
                    <SelectItem value="e-commerce">E-commerce</SelectItem>
                    <SelectItem value="crypto">Crypto & Web3</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="funding-status">Funding Status*</Label>
                <Select required>
                  <SelectTrigger id="funding-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bootstrapped">Bootstrapped</SelectItem>
                    <SelectItem value="pre-seed">Pre-seed</SelectItem>
                    <SelectItem value="seed">Seed</SelectItem>
                    <SelectItem value="series-a">Series A</SelectItem>
                    <SelectItem value="series-b">Series B</SelectItem>
                    <SelectItem value="series-c">Series C+</SelectItem>
                    <SelectItem value="public">Publicly Traded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Contact Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact-name">Contact Name*</Label>
                <Input id="contact-name" required />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contact-position">Position*</Label>
                <Input id="contact-position" required />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact-email">Email Address*</Label>
                <Input id="contact-email" type="email" required />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contact-phone">Phone Number</Label>
                <Input id="contact-phone" type="tel" />
              </div>
            </div>
          </div>
          
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Startup"}
            </Button>
          </div>
        </form>
      </div>
    </ResourcePageTemplate>
  );
};

export default StartupSubmission;
