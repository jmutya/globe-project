

const MainContent = ({ renderContent }) => {
    return (
      <div className="w-full h-full border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 p-4">
         {renderContent ? renderContent() : <div>Loading...</div>}
      </div>
    );
  };
  
  export default MainContent;
  