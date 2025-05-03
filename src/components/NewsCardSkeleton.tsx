
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const NewsCardSkeleton = () => {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-video w-full">
        <Skeleton className="h-full w-full" />
      </div>
      
      <CardHeader className="py-3">
        <Skeleton className="h-6 w-full" />
      </CardHeader>
      
      <CardContent className="py-1">
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
      
      <CardFooter className="py-2 flex justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
      </CardFooter>
    </Card>
  );
};

export default NewsCardSkeleton;
