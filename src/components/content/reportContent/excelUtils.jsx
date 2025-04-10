// src/utils/excelUtils.js

/**
 * Gets incomplete rows from an Excel sheet.
 * @param {Array<Array<any>>} sheet - The Excel sheet data as a 2D array.
 * @returns {Array<{ number: string, assignedTo: string, missingColumns: string[], rowData: any[] }>} An array of incomplete rows.
 */
export const getIncompleteRows = (sheet) => {
    const headers = sheet[0];
    const rows = sheet.slice(1);
  
    const requiredColumns = [
      "Failure Category",
      "Cause",
      "AOR001",
      "AOR002",
      "Number",
    ];
    const requiredIndices = requiredColumns.map((col) => headers.indexOf(col));
    const assignedToIndex = headers.indexOf("Assigned to");
  
    if (requiredIndices.some((idx) => idx === -1)) {
      console.warn("One or more required columns not found in the sheet.");
      return [];
    }
  
    const incompleteRows = [];
  
    rows.forEach((row, i) => {
      const missingColumns = [];
  
      requiredIndices.forEach((idx, idxRow) => {
        if (row[idx] === undefined || String(row[idx]).trim() === "") {
          missingColumns.push(requiredColumns[idxRow]);
        }
      });
  
      if (missingColumns.length > 0) {
        const assignedTo = assignedToIndex !== -1 ? row[assignedToIndex] : "";
        const number = row[headers.indexOf("Number")] || "Not Provided";
        incompleteRows.push({
          number: number,
          assignedTo,
          missingColumns,
          rowData: row,
        });
      }
    });
  
    return incompleteRows;
  };
  
  