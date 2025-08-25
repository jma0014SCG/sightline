import Image from 'next/image';
import { useState } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
  sizes?: string;
  quality?: number;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className = '',
  sizes = '100vw',
  quality = 85,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  
  // Convert to optimized path if not already
  const optimizedSrc = src.startsWith('/images/optimized/') 
    ? src 
    : src.replace('/images/', '/images/optimized/');
  
  // Check for WebP support
  const webpSrc = optimizedSrc.replace(/\.(jpg|jpeg|png)$/, '.webp');
  
  return (
    <div className={`relative ${className}`}>
      <Image
        src={webpSrc}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        sizes={sizes}
        quality={quality}
        className={`
          duration-700 ease-in-out
          ${isLoading ? 'scale-110 blur-2xl grayscale' : 'scale-100 blur-0 grayscale-0'}
        `}
        onLoadingComplete={() => setIsLoading(false)}
        onError={(e) => {
          // Fallback to original format if WebP fails
          (e.target as HTMLImageElement).src = optimizedSrc;
        }}
      />
    </div>
  );
}
