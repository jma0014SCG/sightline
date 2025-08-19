/**
 * Calculate estimated reading time for content
 * @param content - The text content to analyze
 * @returns Formatted reading time string
 */
export const calculateReadingTime = (content: string | null | undefined): string => {
  if (!content) return '< 1 min read';
  
  const wordsPerMinute = 200; // Average reading speed
  const words = content.split(/\s+/).filter(word => word.length > 0).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  
  if (minutes === 0) return '< 1 min read';
  return minutes === 1 ? '1 min read' : `${minutes} min read`;
};

/**
 * Calculate reading time with additional metadata
 * @param content - The text content to analyze
 * @returns Object with reading time details
 */
export const getReadingTimeDetails = (content: string | null | undefined): {
  minutes: number;
  words: number;
  text: string;
} => {
  if (!content) {
    return { minutes: 0, words: 0, text: '< 1 min read' };
  }
  
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).filter(word => word.length > 0).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  
  return {
    minutes,
    words,
    text: minutes === 0 ? '< 1 min read' : minutes === 1 ? '1 min read' : `${minutes} min read`
  };
};