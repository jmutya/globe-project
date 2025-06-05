import React from 'react';

const MainContent = ({ renderContent }) => {
  return (
    // The parent div should define its own height and width.
    // Use 'flex-grow' to make this component take up available space in a flex parent.
    // 'overflow-auto' ensures that if content exceeds the container, scrollbars appear.
    <div className="flex-grow w-full h-full border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 p-4 overflow-auto">
      {renderContent ? (
        // Added flex-col to the content wrapper to ensure internal stacking if needed
        // Also added overflow-hidden to prevent individual content items from causing external scroll
        <div className="flex flex-col h-full w-full">
          {renderContent()}
        </div>
      ) : (
        <div className="flex items-center justify-center h-full text-gray-500">
          Loading content...
        </div>
      )}
    </div>
  );
};

export default MainContent;