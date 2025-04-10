// src/components/progress/AccuracyProgress.js
import React from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

const AccuracyProgress = ({ percentage, title }) => (
  <div className="w-1/4">
    <h3 className="text-lg font-semibold mr-4 ml-6 mt-4">{title}:</h3>
    <div className="w-60 h-60 mt-8 ml-12">
      <CircularProgressbar
        value={parseFloat(percentage)}
        text={`${percentage}%`}
        styles={buildStyles({
          pathColor: "#4caf50",
          textColor: "#333",
          trailColor: "#f4f4f4",
          strokeWidth: 10,
          textSize: "16px",
        })}
      />
    </div>
  </div>
);

export default AccuracyProgress;