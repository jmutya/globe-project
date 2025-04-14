import React, { useState, useEffect } from "react";

const LazyLoadWrapper = ({ children, onLoaded, loadingMessage = "Loading..." }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false); // Track if the component is loaded

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(document.getElementById("lazyLoadComponent"));

    return () => {
      observer.disconnect();
    };
  }, []);

  // Trigger onLoaded callback when the component is rendered
  const handleComponentLoad = () => {
    setIsLoaded(true);
    if (onLoaded) onLoaded(); // Call the onLoaded callback if passed
  };

  return (
    <div id="lazyLoadComponent" className={isLoaded ? "loaded" : "loading"}>
      {isVisible ? (
        React.cloneElement(children, { onLoad: handleComponentLoad })
      ) : (
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
          <p className="ml-3 text-gray-600">{loadingMessage}</p>
        </div>
      )}
    </div>
  );
};

export default LazyLoadWrapper;
