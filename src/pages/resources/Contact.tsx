
import ResourcePageTemplate from "@/components/ResourcePageTemplate";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { Map, Mail, Phone, MapPin } from "lucide-react";

const Contact = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate submission process
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "Message Received",
        description: "Thank you for contacting us. We'll get back to you shortly.",
      });
      
      // Reset form
      const form = e.target as HTMLFormElement;
      form.reset();
    }, 1000);
  };
  
  return (
    <ResourcePageTemplate
      title="Contact & Support"
      description="Get in touch with the ScopeDrop team"
      topic="contact"
    >
      <div className="space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-oxford text-white p-6 rounded-lg flex flex-col items-center text-center">
            <Mail className="h-10 w-10 text-parrot mb-4" />
            <h3 className="text-lg font-bold mb-2">Email Us</h3>
            <p className="mb-3">For general inquiries and support</p>
            <a href="mailto:contact@scopedrop.com" className="text-parrot hover:underline">
              contact@scopedrop.com
            </a>
          </div>
          
          <div className="bg-oxford text-white p-6 rounded-lg flex flex-col items-center text-center">
            <Phone className="h-10 w-10 text-parrot mb-4" />
            <h3 className="text-lg font-bold mb-2">Call Us</h3>
            <p className="mb-3">Available Monday-Friday, 9am-5pm ET</p>
            <a href="tel:+15551234567" className="text-parrot hover:underline">
              +1 (555) 123-4567
            </a>
          </div>
          
          <div className="bg-oxford text-white p-6 rounded-lg flex flex-col items-center text-center">
            <MapPin className="h-10 w-10 text-parrot mb-4" />
            <h3 className="text-lg font-bold mb-2">Visit Us</h3>
            <p className="mb-3">ScopeDrop HQ</p>
            <address className="text-parrot not-italic">
              123 Startup Way<br />
              San Francisco, CA 94107
            </address>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <h2 className="text-2xl font-bold mb-4">Send Us a Message</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name*</Label>
                  <Input id="name" required />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email*</Label>
                  <Input id="email" type="email" required />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="subject">Subject*</Label>
                <Select required>
                  <SelectTrigger id="subject">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Inquiry</SelectItem>
                    <SelectItem value="support">Technical Support</SelectItem>
                    <SelectItem value="partnership">Partnership Opportunity</SelectItem>
                    <SelectItem value="press">Press & Media</SelectItem>
                    <SelectItem value="careers">Careers</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="message">Message*</Label>
                <Textarea id="message" rows={5} required />
              </div>
              
              <div className="pt-4">
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Sending..." : "Send Message"}
                </Button>
              </div>
            </form>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold mb-4">Frequently Asked Questions</h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-bold mb-2">How can I submit my startup for feature consideration?</h3>
                <p className="text-gray-600">
                  Visit our <a href="/startup-submission" className="text-oxford hover:text-parrot">Startup Submission</a> page 
                  to fill out our application form. Our editorial team reviews all submissions.
                </p>
              </div>
              
              <div>
                <h3 className="font-bold mb-2">Do you offer API access to your data?</h3>
                <p className="text-gray-600">
                  Yes, we provide API access for enterprise customers. Visit our <a href="/api-access" className="text-oxford hover:text-parrot">API Access</a> page 
                  for more information and pricing details.
                </p>
              </div>
              
              <div>
                <h3 className="font-bold mb-2">How can I report inaccurate information?</h3>
                <p className="text-gray-600">
                  We strive for accuracy in all our reporting. If you spot an error, please contact us using the form on this page 
                  with subject "Correction Request" and include details about the inaccuracy.
                </p>
              </div>
              
              <div>
                <h3 className="font-bold mb-2">Are you hiring?</h3>
                <p className="text-gray-600">
                  We're always looking for talented individuals to join our team. Check our <a href="/careers" className="text-oxford hover:text-parrot">Careers</a> page 
                  for current openings or send your resume to careers@scopedrop.com.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ResourcePageTemplate>
  );
};

export default Contact;
