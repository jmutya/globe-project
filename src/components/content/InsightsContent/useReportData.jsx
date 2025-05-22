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
    allRows: [],                  // <-- keep full data
    totalRows: 0,
    percentagePerAssignedPerson: {},
    closingAccuracy: "0.00",
    unmatchedRows: [],
    individualAccuracy: {},
    isLoading: true,
    error: null,
    accuracyPercentage: "0.00",
    monthlyAccuracy: {},          // <-- add this
  });

  const getMonthYearFromFormattedDate = (formattedDate) => {
    if (!formattedDate) return "";
    const [year, month] = formattedDate.split("/");
    return `${month}/${year}`;
  };

  const calculateAccuracy = (totalRows, incompleteRows) => {
    const accuracy =
      totalRows > 0 ? ((totalRows - incompleteRows) / totalRows) * 100 : 0;
    return accuracy.toFixed(2);
  };

  const calculateMonthlyAccuracy = (allRows, incompleteRows) => {
    const monthlyCounts = {};

    allRows.forEach((row) => {
      const month = getMonthYearFromFormattedDate(row.opened);
      if (!monthlyCounts[month]) {
        monthlyCounts[month] = { total: 0, incomplete: 0 };
      }
      monthlyCounts[month].total += 1;
    });

    incompleteRows.forEach((row) => {
      const month = getMonthYearFromFormattedDate(row.opened);
      if (monthlyCounts[month]) {
        monthlyCounts[month].incomplete += 1;
      }
    });

    return Object.fromEntries(
      Object.entries(monthlyCounts).map(([month, { total, incomplete }]) => {
        return [month, calculateAccuracy(total, incomplete)];
      })
    );
  };

  useEffect(() => {
    const fetchData = async () => {
      setReportData((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const data = await fetchReportData(
          timeRange,
          selectedMonth,
          selectedYear
        );

        // Sort your chart data
        const sortedChartData = [...data.chartData].sort((a, b) => {
          if (sortBy === "total") {
            const sum = obj =>
              Object.keys(obj)
                .filter(k => k !== "date")
                .reduce((acc, key) => acc + obj[key], 0);
            return sum(b) - sum(a);
          }
          return new Date(a.date) - new Date(b.date);
        });

        // Compute monthly accuracy
        const monthlyAccuracy = calculateMonthlyAccuracy(
          data.allRows,
          data.incompleteRows
        );

        setReportData({
          ...data,
          chartData: sortedChartData,
          allRows: data.allRows,
          isLoading: false,
          accuracyPercentage: calculateAccuracy(
            data.totalRows,
            data.incompleteRows.length
          ),
          monthlyAccuracy,
        });
      } catch (error) {
        setReportData((prev) => ({ ...prev, isLoading: false, error }));
      }
    };

    fetchData();
  }, [timeRange, selectedMonth, selectedYear, sortBy]);

  return reportData;
};

export default useReportData;
