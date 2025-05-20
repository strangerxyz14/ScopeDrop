
import ResourcePageTemplate from "@/components/ResourcePageTemplate";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeIcon, KeyIcon, LockIcon, CheckCircleIcon } from "lucide-react";

const ApiAccess = () => {
  return (
    <ResourcePageTemplate
      title="API Access"
      description="Integrate ScopeDrop's startup intelligence into your applications and workflows"
      topic="api-access"
    >
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid gap-12">
          <section>
            <h2 className="text-2xl font-bold mb-6">Leverage ScopeDrop Data</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Connect to our comprehensive API to integrate real-time startup intelligence 
              directly into your applications, dashboards, or research workflows.
            </p>
            
            <Tabs defaultValue="rest" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="rest">REST API</TabsTrigger>
                <TabsTrigger value="graphql">GraphQL</TabsTrigger>
                <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
              </TabsList>
              <TabsContent value="rest" className="p-4 border rounded-md mt-2">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-oxford/10 rounded-lg">
                    <CodeIcon className="h-10 w-10 text-oxford" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">RESTful Endpoints</h3>
                    <p className="text-muted-foreground mb-4">
                      Our REST API provides simple, predictable URLs, returning JSON-encoded responses 
                      and using standard HTTP response codes.
                    </p>
                    <div className="bg-muted p-3 rounded font-mono text-sm overflow-x-auto">
                      <pre>GET https://api.scopedrop.com/v1/startups?category=fintech&funding=seriesb</pre>
                    </div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="graphql" className="p-4 border rounded-md mt-2">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-oxford/10 rounded-lg">
                    <CodeIcon className="h-10 w-10 text-oxford" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">GraphQL API</h3>
                    <p className="text-muted-foreground mb-4">
                      Our GraphQL API allows you to request exactly the data you need in a single query,
                      reducing the number of requests and data transfer.
                    </p>
                    <div className="bg-muted p-3 rounded font-mono text-sm overflow-x-auto">
                      <pre>{`query {
  startups(category: "fintech", funding: "seriesb") {
    name
    description
    founders {
      name
      linkedin
    }
    fundingRounds {
      amount
      date
      investors
    }
  }
}`}</pre>
                    </div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="webhooks" className="p-4 border rounded-md mt-2">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-oxford/10 rounded-lg">
                    <CodeIcon className="h-10 w-10 text-oxford" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Webhooks</h3>
                    <p className="text-muted-foreground mb-4">
                      Subscribe to real-time updates with webhooks. Get notified about new funding rounds, 
                      acquisitions, or other events as they happen.
                    </p>
                    <div className="bg-muted p-3 rounded font-mono text-sm overflow-x-auto">
                      <pre>{`// Example webhook payload
{
  "event": "funding_round",
  "startup": "FinanceAI",
  "details": {
    "amount": "$25M",
    "series": "B",
    "lead_investor": "Sequoia Capital",
    "date": "2025-05-15"
  }
}`}</pre>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </section>
          
          <section>
            <h2 className="text-2xl font-bold mb-6">Pricing & Access Tiers</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="border-2 hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="text-center mb-4">
                    <h3 className="text-xl font-bold">Developer</h3>
                    <div className="text-3xl font-bold mt-2">$99<span className="text-lg text-muted-foreground">/mo</span></div>
                  </div>
                  <ul className="space-y-2 mt-6">
                    <li className="flex items-center gap-2">
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      <span>10,000 API calls per month</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      <span>Basic data access</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      <span>REST API only</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card className="border-2 border-parrot relative hover:shadow-lg transition-shadow">
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-parrot text-oxford px-4 py-1 rounded-full font-medium text-sm">
                  POPULAR
                </div>
                <CardContent className="pt-6">
                  <div className="text-center mb-4">
                    <h3 className="text-xl font-bold">Business</h3>
                    <div className="text-3xl font-bold mt-2">$299<span className="text-lg text-muted-foreground">/mo</span></div>
                  </div>
                  <ul className="space-y-2 mt-6">
                    <li className="flex items-center gap-2">
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      <span>100,000 API calls per month</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      <span>Complete data access</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      <span>REST & GraphQL APIs</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      <span>Webhook support</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card className="border-2 hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="text-center mb-4">
                    <h3 className="text-xl font-bold">Enterprise</h3>
                    <div className="text-3xl font-bold mt-2">Custom</div>
                  </div>
                  <ul className="space-y-2 mt-6">
                    <li className="flex items-center gap-2">
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      <span>Unlimited API access</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      <span>Premium data & insights</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      <span>All API options</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      <span>Dedicated support</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      <span>SLA guarantees</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </section>
          
          <section>
            <h2 className="text-2xl font-bold mb-6">Get Started</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 bg-oxford/5 rounded-lg">
                <div className="flex items-center mb-4">
                  <KeyIcon className="h-8 w-8 text-oxford mr-3" />
                  <h3 className="text-xl font-bold">Register for API Key</h3>
                </div>
                <p className="text-muted-foreground">
                  Create an account and register for an API key to start accessing our data endpoints.
                </p>
              </div>
              
              <div className="p-6 bg-oxford/5 rounded-lg">
                <div className="flex items-center mb-4">
                  <CodeIcon className="h-8 w-8 text-oxford mr-3" />
                  <h3 className="text-xl font-bold">Explore Documentation</h3>
                </div>
                <p className="text-muted-foreground">
                  Browse our comprehensive documentation, code samples, and integration guides.
                </p>
              </div>
              
              <div className="p-6 bg-oxford/5 rounded-lg">
                <div className="flex items-center mb-4">
                  <LockIcon className="h-8 w-8 text-oxford mr-3" />
                  <h3 className="text-xl font-bold">Secure Implementation</h3>
                </div>
                <p className="text-muted-foreground">
                  Follow our security best practices to ensure your API usage is safe and compliant.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </ResourcePageTemplate>
  );
};

export default ApiAccess;
