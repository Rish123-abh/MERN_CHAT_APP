import { useEffect, useRef } from 'react';

export function useClickOutside(handler: () => void) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if the click target is NOT inside the referenced element
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler(); // Call the provided handler function
      }
    };

    // Add event listener to the entire document
    document.addEventListener('mousedown', handleClickOutside);

    // Clean up the event listener when the component unmounts
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handler]);

  return ref;
}