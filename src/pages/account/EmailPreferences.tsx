
import React from "react";
import AccountPageTemplate from "@/components/AccountPageTemplate";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const EmailPreferences = () => {
  return (
    <AccountPageTemplate
      title="Email Preferences"
      description="Manage your email notification settings"
    >
      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Newsletter Subscriptions</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="daily-newsletter">Daily Newsletter</Label>
                <p className="text-sm text-gray-500">Get the latest startup news every morning</p>
              </div>
              <Switch id="daily-newsletter" defaultChecked={true} />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="weekly-digest">Weekly Digest</Label>
                <p className="text-sm text-gray-500">A summary of the week's top stories</p>
              </div>
              <Switch id="weekly-digest" defaultChecked={true} />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="funding-alerts">Funding Alerts</Label>
                <p className="text-sm text-gray-500">Get notified about major funding rounds</p>
              </div>
              <Switch id="funding-alerts" defaultChecked={false} />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="event-reminders">Event Reminders</Label>
                <p className="text-sm text-gray-500">Upcoming startup events and conferences</p>
              </div>
              <Switch id="event-reminders" defaultChecked={false} />
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Notification Preferences</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="saved-articles">Saved Articles Reminders</Label>
                <p className="text-sm text-gray-500">Remind me about articles I've saved but haven't read</p>
              </div>
              <Switch id="saved-articles" defaultChecked={true} />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="topic-updates">Topic Updates</Label>
                <p className="text-sm text-gray-500">Get updates on topics you follow</p>
              </div>
              <Switch id="topic-updates" defaultChecked={true} />
            </div>
          </div>
        </div>
        
        <div className="pt-4 flex justify-end space-x-4">
          <Button variant="outline">Cancel</Button>
          <Button>Save Preferences</Button>
        </div>
      </div>
    </AccountPageTemplate>
  );
};

export default EmailPreferences;
