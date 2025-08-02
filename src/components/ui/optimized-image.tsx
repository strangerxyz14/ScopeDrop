import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";
import { ImageIcon } from "lucide-react";

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  fallback?: string;
  skeleton?: boolean;
  lazy?: boolean;
  aspectRatio?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className,
  fallback,
  skeleton = true,
  lazy = true,
  aspectRatio,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!lazy) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [lazy]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const containerStyle = aspectRatio ? { aspectRatio } : {};

  if (!isInView) {
    return (
      <div
        ref={imgRef}
        className={cn("relative overflow-hidden", className)}
        style={containerStyle}
      >
        {skeleton && <Skeleton className="w-full h-full" />}
      </div>
    );
  }

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={containerStyle}
    >
      {isLoading && skeleton && (
        <Skeleton className="absolute inset-0 w-full h-full" />
      )}
      
      {hasError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="text-center text-muted-foreground">
            <ImageIcon className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">Failed to load image</p>
          </div>
        </div>
      ) : (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "transition-opacity duration-300",
            isLoading ? "opacity-0" : "opacity-100",
            "w-full h-full object-cover"
          )}
          loading={lazy ? "lazy" : "eager"}
          {...props}
        />
      )}
    </div>
  );
};