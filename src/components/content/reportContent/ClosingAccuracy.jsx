import React from 'react';
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";

const ClosingAccuracy = ({ title, percentage }) => {
    return (
        <div>
            <h3 className="font-semibold text-lg mb-2">{title}</h3>
            <div className="w-32 h-32">
                <CircularProgressbar
                    value={percentage}
                    text={`${percentage}%`}
                    styles={buildStyles({
                        pathColor: percentage < 80 ? "#ff6b6b" : "#22c55e",
                        textColor: "#000000",
                        trailColor: "#d1d5db",
                    })}
                />
            </div>
        </div>
    );
};

export default ClosingAccuracy;