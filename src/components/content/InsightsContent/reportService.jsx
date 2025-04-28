// src/services/reportService.js
import * as XLSX from "xlsx";
// In a real application, you would import your actual backend API client
// For this simulation, we'll keep the Supabase logic here but ideally,
// this would be handled server-side.
import supabase from "../../../backend/supabase/supabase";

const processExcelData = async (fileUrl) => {
  const response = await fetch(fileUrl);
  const blob = await response.arrayBuffer();
  const workbook = XLSX.read(blob, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
  });
  return sheet;
};

const getIncompleteRows = (sheet, headers) => {
  const requiredColumns = [
    "Failure Category",
    "Cause",
    "AOR001",
    "AOR002",
    "Number",
    "Opened",
  ];
  const requiredIndices = requiredColumns.map((col) => headers.indexOf(col));
  const assignedToIndex = headers.indexOf("Assigned to");

  if (requiredIndices.some((idx) => idx === -1)) {
    console.warn("One or more required columns not found in the sheet.");
    return [];
  }

  const incompleteRows = [];

  sheet.slice(1).forEach((row, i) => {
    const missingColumns = [];

    requiredIndices.forEach((idx, idxRow) => {
      if (row[idx] === undefined || String(row[idx]).trim() === "") {
        missingColumns.push(requiredColumns[idxRow]);
      }
    });

    if (missingColumns.length > 0) {
      const assignedTo = assignedToIndex !== -1 ? row[assignedToIndex] : "";
      const number = row[headers.indexOf("Number")] || "Not Provided";
      const openedRaw = row[headers.indexOf("Opened")];
    
      let openedFormatted = "";
      if (openedRaw) {
        if (typeof openedRaw === "number") {
          const date = new Date((openedRaw - 25569) * 86400 * 1000); // Excel serial to Date
          const day = String(date.getDate()).padStart(2, "0");
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const year = date.getFullYear();
          openedFormatted = `${day}/${month}/${year}`;
        } else if (typeof openedRaw === "string") {
          openedFormatted = openedRaw; // Already a string date
        }
      }
    
      incompleteRows.push({
        number: number,
        assignedTo,
        missingColumns,
        rowData: row,
        opened: openedFormatted,
      });
    }
    
  });

  return incompleteRows;
};

const fetchReportData = async (timeRange, selectedMonth, selectedYear) => {
  try {
    const { data: files, error } = await supabase.storage
      .from("uploads")
      .list("excels");
    if (error) throw error;

    let alarmData = {};
    let allRequiredFieldsComplete = true;
    const detectedYears = new Set();
    const allIncompleteRows = [];
    let totalRowCount = 0;
    const assignedPersonsData = {};
    const unmatchedRows = []; // Keep as array for now
    const seenUnmatchedNumbers = new Set(); // To track unique unmatched IDs
    let resolverStats = {};
    let allAlarmTypes = new Set();

    for (const file of files) {
      const { data: fileUrl } = supabase.storage
        .from("uploads")
        .getPublicUrl(`excels/${file.name}`);
      const sheet = await processExcelData(fileUrl.publicUrl);

      if (sheet.length > 1) {
        const headers = sheet[0];
        const timestampIndex = headers.indexOf("Opened");
        const alarmTypeIndex = headers.indexOf("AOR002");
        const causeIndex = headers.indexOf("Cause");
        const reasonIndex = headers.indexOf("Reason For Outage");
        const resolvedByIndex = headers.indexOf("Resolved by");
        const numberByIndex = headers.indexOf("Number");
        const assignedToIndex = headers.indexOf("Assigned to");

        if (timestampIndex === -1 || alarmTypeIndex === -1) continue;

        const incompleteRows = getIncompleteRows(sheet, headers);
        if (incompleteRows.length > 0) {
          allIncompleteRows.push(...incompleteRows);
          allRequiredFieldsComplete = false;
        }

        totalRowCount += sheet.length - 1;

        sheet.slice(1).forEach((row) => {
          const timestamp = row[timestampIndex];
          const alarmType = row[alarmTypeIndex]?.trim();
          const assignedTo = row[assignedToIndex];

          let date = "";
          if (timestamp && alarmType) {
            if (typeof timestamp === "number") {
              const excelEpoch = new Date(1899, 11, 30);
              date = new Date(excelEpoch.getTime() + timestamp * 86400000)
                .toISOString()
                .split("T")[0];
            } else if (typeof timestamp === "string") {
              const parts = timestamp.split(" ")[0].split("/");
              if (parts.length === 3) {
                const [month, day, year] = parts;
                date = `${year}-${month.padStart(2, "0")}-${day.padStart(
                  2,
                  "0"
                )}`;
              }
            }

            if (!date) return;

            const dateObj = new Date(date);
            const year = dateObj.getFullYear();
            const month = dateObj.getMonth() + 1;

            if (
              (timeRange === "monthly" &&
                (year !== selectedYear || month !== selectedMonth)) ||
              (timeRange === "yearly" && year !== selectedYear)
            ) {
              return;
            }

            detectedYears.add(year);

            if (!alarmData[date]) {
              alarmData[date] = {};
            }
            alarmData[date][alarmType] = (alarmData[date][alarmType] || 0) + 1;
            allAlarmTypes.add(alarmType);

            if (assignedTo) {
              if (!assignedPersonsData[assignedTo]) {
                assignedPersonsData[assignedTo] = { total: 0, completed: 0 };
              }
              assignedPersonsData[assignedTo].total += 1;
              const isComplete = !incompleteRows.some(
                (ir) => ir.rowData === row
              );
              if (isComplete) {
                assignedPersonsData[assignedTo].completed += 1;
              }
            }

            const cause = row[causeIndex];
            const reason = row[reasonIndex];
            const resolvedBy = row[resolvedByIndex]?.trim();
            const number = row[numberByIndex];

            if (resolvedBy && !resolverStats[resolvedBy]) {
              resolverStats[resolvedBy] = { totalResolved: 0, errors: 0 };
            }
            if (resolvedBy) {
              resolverStats[resolvedBy].totalResolved += 1;
            }

            const hasError =
              !cause ||
              !reason ||
              typeof cause !== "string" ||
              typeof reason !== "string" ||
              reason.split("-")[0].trim().toLowerCase() !==
                cause.trim().toLowerCase();

            if (hasError) {
              unmatchedRows.push({ number, cause, reason, resolvedBy });
              if (resolvedBy) {
                resolverStats[resolvedBy].errors += 1;
              }
            }
          }
        });
      }
    }

    const percentagePerAssignedPerson = {};

    for (const [person, data] of Object.entries(assignedPersonsData)) {
      const accurate = data.completed;
      const total = data.total;
      const percentage = total ? (accurate / total) * 100 : 0;

      percentagePerAssignedPerson[person] = {
        accurate,
        total,
        percentage: parseFloat(percentage),
      };
    }

    let formattedData = Object.entries(alarmData).map(([date, alarms]) => {
      let entry = { date };
      [...allAlarmTypes].forEach((type) => {
        entry[type] = alarms[type] || 0;
      });
      return entry;
    });

    const groupByTimeRange = (data, timeRange) => {
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

    formattedData = groupByTimeRange(formattedData, timeRange);

    const individualAccuracy = {};

    Object.entries(resolverStats).forEach(([resolver, stats]) => {
      const totalAssigned = stats.totalResolved- stats.errors; // Assuming you have this data in `stats.totalAssigned`
      const totalResolved = stats.totalResolved;

      let accuracy = "0.00";

      if (totalResolved > 0) {
        accuracy = (
          ((totalResolved - stats.errors) / totalResolved) *
          100
        ).toFixed(2);
      }

      individualAccuracy[resolver] = {
        totalAssigned,
        totalResolved,
        accuracy: parseFloat(accuracy),
      };
    });

    const closingAccuracy =
      totalRowCount > 0
        ? (
            ((totalRowCount - unmatchedRows.length) / totalRowCount) *
            100
          ).toFixed(2)
        : "0.00";

    return {
      chartData: formattedData,
      alarmTypes: [...allAlarmTypes],
      hasCompleteRows: allRequiredFieldsComplete,
      availableYears: Array.from(detectedYears).sort(),
      incompleteRows: allIncompleteRows,
      totalRows: totalRowCount,
      percentagePerAssignedPerson,
      closingAccuracy,
      unmatchedRows,
      individualAccuracy,
    };
  } catch (error) {
    console.error("Error fetching or processing files:", error);
    throw error;
  }
};

export default fetchReportData;
