// src/components/progress/AccuracyProgress.js
import React from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

const AccuracyProgress = ({ percentage, title }) => {
  // Determine the path color based on the percentage
  let pathColor;
  if (percentage < 50) {
    pathColor = "#f44336"; // Red for low accuracy
  } else if (percentage >= 50 && percentage < 80) {
    pathColor = "#ffc107"; // Orange/Yellow for medium accuracy
  } else {
    pathColor = "#16C47F"; // Green for high accuracy
  }

  // You can also make the text color dynamic if you wish
  // let textColor = pathColor; // For example, make text color the same as path color

  return (
    <div className="w-1/4">
      <h3 className="text-lg font-semibold mr-4 ml-6 mt-4">{title}</h3>
      <div className="w-60 h-60 mt-8 ml-12">
        <CircularProgressbar
          value={parseFloat(percentage)}
          text={`${percentage}%`}
          styles={buildStyles({
            pathColor: pathColor, // Dynamically set path color
            textColor: pathColor, // You can keep this static or make it dynamic too
            trailColor: "#f4f4f4",
            strokeWidth: 20,
            textSize: "16px",
            strokeLinecap: "round", // Added for a softer look
          })}
        />
      </div>
    </div>
  );
};

export default AccuracyProgress;