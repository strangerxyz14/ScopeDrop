
import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getErrorLog, clearErrorLog } from "@/services/newsService";

const ErrorMonitor = () => {
  const [open, setOpen] = useState(false);
  const errors = getErrorLog();
  
  const handleClear = () => {
    clearErrorLog();
    setOpen(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="fixed bottom-4 right-4 bg-white shadow-md"
        >
          {errors.length > 0 ? (
            <>
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse-subtle absolute -top-1 -right-1"></span>
              Error Log ({errors.length})
            </>
          ) : (
            "Error Log"
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Error Monitoring</DialogTitle>
          <DialogDescription>
            View recent errors from API calls and other operations
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-96">
          {errors.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              No errors recorded
            </div>
          ) : (
            <div className="space-y-4">
              {errors.map((error, index) => (
                <div key={index} className="border rounded-md p-4 bg-gray-50">
                  <div className="font-medium text-red-600 flex justify-between items-start">
                    <span>Source: {error.source}</span>
                    <span className="text-xs text-gray-500">
                      {error.timestamp.toLocaleString()}
                    </span>
                  </div>
                  <pre className="mt-2 text-sm bg-gray-100 p-2 rounded overflow-x-auto">
                    {JSON.stringify(error.error, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button variant="destructive" onClick={handleClear}>
            Clear Errors
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ErrorMonitor;
