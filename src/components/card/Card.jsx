// components/common/Card.jsx
const Card = ({ children, className = "" }) => {
    return (
      <div className={`bg-white rounded-xl p-6 ${className}`}>
        {children}
      </div>
    );
  };
  
  export default Card;
  