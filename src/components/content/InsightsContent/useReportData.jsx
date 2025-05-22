// src/hooks/useReportData.js
import { useState, useEffect } from "react";
import fetchReportData from "./reportService";

const useReportData = (timeRange, selectedMonth, selectedYear, sortBy) => {
  const [reportData, setReportData] = useState({
    chartData: [],
    alarmTypes: [],
    hasCompleteRows: false,
    availableYears: [],
    incompleteRows: [],
    totalRows: 0,
    percentagePerAssignedPerson: {},
    closingAccuracy: "0.00",
    unmatchedRows: [],
    individualAccuracy: {},
    isLoading: true,
    error: null,
    accuracyPercentage: "0.00", // Add accuracyPercentage to the state
  });

  const calculateAccuracy = (totalRows, incompleteRows) => {
    const accuracy =
      totalRows > 0 ? ((totalRows - incompleteRows) / totalRows) * 100 : 0;
    return accuracy.toFixed(2);
  };

  
 
  useEffect(() => {
    const fetchData = async () => {
      setReportData((prevState) => ({ ...prevState, isLoading: true, error: null }));
      try {
        const data = await fetchReportData(timeRange, selectedMonth, selectedYear);
        let sortedChartData = [...data.chartData];
        sortedChartData.sort((a, b) => {
          if (sortBy === "total") {
            const totalA = Object.keys(a)
              .filter((k) => k !== "date")
              .reduce((sum, key) => sum + a[key], 0);
            const totalB = Object.keys(b)
              .filter((k) => k !== "date")
              .reduce((sum, key) => sum + b[key], 0);
            return totalB - totalA;
          }
          return new Date(a.date) - new Date(b.date);
        });
        setReportData({
          ...data,
          chartData: sortedChartData,
          isLoading: false,
          accuracyPercentage: calculateAccuracy(data.totalRows, data.incompleteRows.length), // Calculate and set accuracy
        });
      } catch (error) {
        setReportData((prevState) => ({ ...prevState, isLoading: false, error }));
      }
    };

    fetchData();
  }, [timeRange, selectedMonth, selectedYear, sortBy]);

  return { ...reportData }; // Return the state object which now includes accuracyPercentage
};

export default useReportData;