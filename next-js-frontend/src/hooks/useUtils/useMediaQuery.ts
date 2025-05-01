import { useEffect, useState } from 'react';

// Custom hook to detect media query matches (screen size) and react to changes
export const useMediaQuery = (number: number) => {
  // Construct the media query string based on the passed number
  const query = `(max-width:${number - 1}px)`;

  // Initialize state with `false` by default for SSR safety
  const [isMatches, setIsMatches] = useState<boolean>(false);

  useEffect(() => {
    // Check if `window` is defined to ensure client-side execution
    if (typeof window !== 'undefined') {
      // Create a MediaQueryList object
      const mediaQuery = window.matchMedia(query);

      // Set initial match status
      setIsMatches(mediaQuery.matches);

      // Handler function to update state when the media query matches or doesn't match
      const handleMediaQueryChange = (event: MediaQueryListEvent) => {
        setIsMatches(event.matches);
      };

      // Add event listener for changes
      mediaQuery.addEventListener('change', handleMediaQueryChange);

      // Cleanup function to remove the event listener
      return () => {
        mediaQuery.removeEventListener('change', handleMediaQueryChange);
      };
    }
  }, [query]); // Dependency on `query`

  // Return whether the media query currently matches
  return isMatches;
};
