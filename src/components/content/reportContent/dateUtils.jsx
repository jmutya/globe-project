// src/utils/dateUtils.js

/**
 * Groups data by the specified time range.
 * @param {Array<any>} data - The data to group.
 * @param {string} timeRange - The time range ('daily', 'weekly', 'monthly', 'yearly').
 * @returns {Array<any>} The grouped data.
 */
export const groupByTimeRange = (data, timeRange) => {
    switch (timeRange) {
      case "weekly":
        return groupDataByWeek(data);
      case "monthly":
        return groupDataByMonth(data);
      case "yearly":
        return groupDataByYear(data);
      default:
        return data;
    }
  };
  
  /**
   * Groups data by week.
   * @param {Array<any>} data - The data to group.
   * @returns {Array<any>} The data grouped by week.
   */
  const groupDataByWeek = (data) => {
    const groupedData = {};
    data.forEach((entry) => {
      const date = new Date(entry.date);
      const startOfWeek = new Date(
        date.setDate(date.getDate() - date.getDay())
      );
      const weekKey = `${startOfWeek.getFullYear()}-${
        startOfWeek.getMonth() + 1
      }-${startOfWeek.getDate()}`;
      if (!groupedData[weekKey]) {
        groupedData[weekKey] = { date: weekKey };
      }
      Object.keys(entry).forEach((key) => {
        if (key !== "date") {
          groupedData[weekKey][key] =
            (groupedData[weekKey][key] || 0) + entry[key];
        }
      });
    });
    return Object.values(groupedData);
  };
  
  /**
   * Groups data by month.
   * @param {Array<any>} data - The data to group.
   * @returns {Array<any>} The data grouped by month.
   */
  const groupDataByMonth = (data) => {
    const groupedData = {};
    data.forEach((entry) => {
      const date = new Date(entry.date);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const monthKey = `${year}-${month.toString().padStart(2, "0")}`;
      if (!groupedData[monthKey]) {
        groupedData[monthKey] = { date: monthKey };
      }
      Object.keys(entry).forEach((key) => {
        if (key !== "date") {
          groupedData[monthKey][key] =
            (groupedData[monthKey][key] || 0) + entry[key];
        }
      });
    });
    return Object.values(groupedData);
  };
  
  /**
   * Groups data by year.
   * @param {Array<any>} data - The data to group.
   * @returns {Array<any>} The data grouped by year.
   */
  const groupDataByYear = (data) => {
    const groupedData = {};
    data.forEach((entry) => {
      const date = new Date(entry.date);
      const yearKey = `${date.getFullYear()}`;
      if (!groupedData[yearKey]) {
        groupedData[yearKey] = { date: yearKey };
      }
      Object.keys(entry).forEach((key) => {
        if (key !== "date") {
          groupedData[yearKey][key] =
            (groupedData[yearKey][key] || 0) + entry[key];
        }
      });
    });
    return Object.values(groupedData);
  };
  
  