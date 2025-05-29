import React, { useState, useEffect } from "react";
import { FaUpload, FaFileExcel, FaTrash, FaSpinner } from "react-icons/fa";
import toast, { Toaster } from "react-hot-toast";
import supabase from "../../backend/supabase/supabase"; 
import * as XLSX from "xlsx";

const ExcelUploader = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false); // Renamed to avoid conflict
  const [selectedFilesToDelete, setSelectedFilesToDelete] = useState([]);
  const [showMultiDeleteModal, setShowMultiDeleteModal] = useState(false);

  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  const parseExcelMonths = (json) => {
    const seen = new Set();
    const months = [];

    json.forEach((row) => {
      const value = row["opened_at"] || row["sys_created_on"];
      let parsedDate;

      if (typeof value === "number") {
        parsedDate = new Date(Math.round((value - 25569) * 86400 * 1000));
      } else if (typeof value === "string") {
        try {
          parsedDate = new Date(value);
          if (
            isNaN(parsedDate.getTime()) &&
            value.match(/^\d{1,2}\/\d{1,2}\/\d{4} \d{1,2}:\d{2}(:\d{2})?$/)
          ) {
            const parts = value.split(/[\/\s:]/);
            parsedDate = new Date(
              parts[2],
              parts[0] - 1,
              parts[1],
              parts[3],
              parts[4],
              parts[5] || 0
            );
          }
        } catch (e) {
          console.warn("Failed to parse date string:", value, e);
          parsedDate = null;
        }
      }

      if (parsedDate && !isNaN(parsedDate.getTime())) {
        const monthYear = `${parsedDate.toLocaleString("default", {
          month: "long",
        })} (${parsedDate.getFullYear()})`;

        if (!seen.has(monthYear)) {
          seen.add(monthYear);
          months.push(monthYear);
        }
      }
    });

    return months.length > 0 ? months.join(", ") : "—";
  };

  const fetchUploadedFiles = async () => {
    setLoadingFiles(true);
    try {
      const { data, error } = await supabase.storage
        .from("uploads")
        .list("excels", { limit: 1000 });
      if (error) throw error;

      const validFiles = data.filter((file) => !file.name.startsWith("."));

      const fileList = await Promise.all(
        validFiles.map(async (file) => {
          const fullPath = `excels/${file.name}`;
          const fileUrl = supabase.storage
            .from("uploads")
            .getPublicUrl(fullPath).data.publicUrl;

          let month = "—";
          if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
            try {
              const res = await fetch(fileUrl);
              const arrayBuffer = await res.arrayBuffer();
              const workbook = XLSX.read(arrayBuffer, { type: "array" });
              const sheet = workbook.Sheets[workbook.SheetNames[0]];
              const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });

              if (json.length > 0) {
                month = parseExcelMonths(json);
              }
            } catch (err) {
              console.warn(
                `Could not parse ${file.name} for month info:`,
                err.message
              );
              month = "Error parsing file";
            }
          } else {
            month = "N/A";
          }

          const uploadedDate = new Date(file.created_at).toLocaleString(
            "en-PH",
            {
              year: "numeric",
              month: "numeric",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
            }
          );

          return {
            name: file.name,
            date: uploadedDate,
            month,
            url: fileUrl,
          };
        })
      );

      setFiles(fileList.sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (err) {
      console.error("Error loading files:", err.message);
      toast.error("Failed to load uploaded files.");
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleUploadClick = () => {
    setShowUploadModal(true);
    setSelectedFiles([]);
    setUploadProgress(0);
  };

  const handleFilesSelected = (e) => {
    setSelectedFiles(Array.from(e.target.files));
  };

  const handleUploadFile = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Please select files to upload.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    let successfullyProcessedOriginalFiles = 0;
    const totalSelectedFiles = selectedFiles.length;

    for (let i = 0; i < totalSelectedFiles; i++) {
      const file = selectedFiles[i];
      let currentFileStatusToast = toast.loading(`Processing ${file.name}...`);

      try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

        if (rows.length === 0) {
          toast.dismiss(currentFileStatusToast);
          toast(`Skipping empty file: ${file.name}`, { icon: "ℹ️" });
          continue;
        }

        const headers = rows[0];
        const openedIndex = headers.indexOf("opened_at");
        const createdIndex = headers.indexOf("sys_created_on"); // Get Created index as well

        const dateColumnToUse =
          openedIndex !== -1
            ? "opened_at"
            : createdIndex !== -1
            ? "sys_created_on"
            : null;
        const dateColumnIndex = dateColumnToUse
          ? headers.indexOf(dateColumnToUse)
          : -1;

        if (dateColumnIndex === -1) {
          toast.dismiss(currentFileStatusToast);
          toast.error(
            `Neither 'Opened' nor 'Created' column found in ${file.name}. Skipping file.`
          );
          continue;
        }

        const monthGroups = {};

        for (let j = 1; j < rows.length; j++) {
          const row = rows[j];
          const rawDateValue = row[dateColumnIndex];
          let parsedDate;

          if (typeof rawDateValue === "number") {
            const parsed = XLSX.SSF.parse_date_code(rawDateValue);
            if (parsed) {
              parsedDate = new Date(
                parsed.y,
                parsed.m - 1,
                parsed.d,
                parsed.H,
                parsed.M,
                parsed.S
              );
            }
          } else if (typeof rawDateValue === "string") {
            try {
              parsedDate = new Date(rawDateValue);
              if (
                isNaN(parsedDate.getTime()) &&
                rawDateValue.match(
                  /^\d{1,2}\/\d{1,2}\/\d{4} \d{1,2}:\d{2}(:\d{2})?$/
                )
              ) {
                const parts = rawDateValue.split(/[\/\s:]/);
                parsedDate = new Date(
                  parts[2],
                  parts[0] - 1,
                  parts[1],
                  parts[3],
                  parts[4],
                  parts[5] || 0
                );
              }
            } catch (e) {
              console.warn(
                `Failed to parse date string in row ${j + 1}:`,
                rawDateValue,
                e
              );
              parsedDate = null;
            }
          }

          if (parsedDate && !isNaN(parsedDate.getTime())) {
            const datePH = new Date(
              parsedDate.toLocaleString("en-US", { timeZone: "Asia/Manila" })
            );
            const year = datePH.getFullYear();
            const month = String(datePH.getMonth() + 1).padStart(2, "0");
            const groupKey = `${year}-${month}`;

            row[dateColumnIndex] = formatDatePH(datePH);

            if (!monthGroups[groupKey]) {
              monthGroups[groupKey] = [];
            }
            monthGroups[groupKey].push(row);
          } else {
            console.warn(
              `Skipping row ${
                j + 1
              } in ${file.name} due to invalid or unparseable date in '${dateColumnToUse}' column:`,
              rawDateValue
            );
          }
        }

        const monthlyGroupKeys = Object.keys(monthGroups);
        const totalPartsForFile = monthlyGroupKeys.length;

        if (totalPartsForFile === 0) {
          toast.dismiss(currentFileStatusToast);
          toast.error(
            `No valid date entries found in ${file.name} for splitting. Skipping.`
          );
          continue;
        }

        let partsUploadedForThisFile = 0;
        let filesUploadedFromThisOriginal = [];

        // Generate a unique timestamp for this upload batch
        const uniqueTimestamp = Date.now();

        for (const monthKey of monthlyGroupKeys) {
          const monthRows = monthGroups[monthKey];

          const newWorkbook = XLSX.utils.book_new();
          const newSheet = XLSX.utils.aoa_to_sheet([headers, ...monthRows]);
          XLSX.utils.book_append_sheet(newWorkbook, newSheet, "Sheet1");

          const excelBuffer = XLSX.write(newWorkbook, {
            type: "array",
            bookType: "xlsx",
          });

          const blob = new Blob([excelBuffer], { type: file.type });

          const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
          // IMPORTANT CHANGE: Append unique timestamp to the filename
          const newFileName = `${fileNameWithoutExt}_${monthKey}_${uniqueTimestamp}.xlsx`;

          const { error } = await supabase.storage
            .from("uploads")
            .upload(`excels/${newFileName}`, blob, {
              cacheControl: "3600",
              upsert: false, // Set upsert to false, as we're generating unique names
            });

          if (error) {
            console.error(`Supabase upload error for ${newFileName}:`, error);
            throw error; // Re-throw to be caught by the outer try/catch
          }
          filesUploadedFromThisOriginal.push(newFileName);
          partsUploadedForThisFile++;
          setUploadProgress(
            Math.round(
              ((i + partsUploadedForThisFile / totalPartsForFile) /
                totalSelectedFiles) *
                100
            )
          );
        }
        successfullyProcessedOriginalFiles++;
        toast.dismiss(currentFileStatusToast);
        toast.success(
          `Successfully processed ${file.name}. Uploaded ${filesUploadedFromThisOriginal.length} unique monthly files.`
        );
        console.log(
          `Uploaded unique files from ${file.name}:`,
          filesUploadedFromThisOriginal
        );
      } catch (error) {
        toast.dismiss(currentFileStatusToast);
        console.error("Upload failed for file:", file.name, error);
        toast.error(`Failed to process or upload ${file.name}: ${error.message}`);
      }
    }

    if (successfullyProcessedOriginalFiles > 0) {
      toast.success("All selected files have been processed and uploaded uniquely!");
    } else {
      toast.error("No files were successfully processed or uploaded.");
    }

    setUploading(false);
    setShowUploadModal(false);
    fetchUploadedFiles();
  };

  function formatDatePH(date) {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
      .format(date)
      .replace(",", "");
  }

  // --- FIX START ---
  const confirmDelete = (fileName) => {
    setFileToDelete(fileName); // Store ONLY the filename
    setShowDeleteModal(true);
  };

  const handleDeleteFile = async () => {
    if (!fileToDelete) return;
    try {
      // Construct the full path here
      const filePath = `excels/${fileToDelete}`;
      const { error } = await supabase.storage.from("uploads").remove([filePath]);
      if (error) throw error;
      toast.success("File deleted");
      fetchUploadedFiles();
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Failed to delete file");
    } finally {
      setShowDeleteModal(false);
      setFileToDelete(null);
    }
  };
  // --- FIX END ---

  const toggleSelectFile = (fileName) => {
    setSelectedFilesToDelete((prevSelected) =>
      prevSelected.includes(fileName)
        ? prevSelected.filter((name) => name !== fileName)
        : [...prevSelected, fileName]
    );
  };

  const isSelected = (fileName) => selectedFilesToDelete.includes(fileName);

  const allVisibleFileNames = files.map((f) => f.name);
  const areAllSelected =
    allVisibleFileNames.length > 0 &&
    allVisibleFileNames.every((name) => selectedFilesToDelete.includes(name));

  const toggleSelectAll = () => {
    if (areAllSelected) {
      setSelectedFilesToDelete([]);
    } else {
      setSelectedFilesToDelete(allVisibleFileNames);
    }
  };

  const handleDeleteSelectedFiles = async () => {
    if (selectedFilesToDelete.length === 0) return;

    // This part correctly maps to full paths already, so it's fine.
    const filePaths = selectedFilesToDelete.map(
      (fileName) => `excels/${fileName}`
    );

    try {
      const { error } = await supabase.storage
        .from("uploads")
        .remove(filePaths);
      if (error) throw error;

      toast.success("Selected files deleted");
      fetchUploadedFiles();
      setSelectedFilesToDelete([]);
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Failed to delete selected files");
    } finally {
      setShowMultiDeleteModal(false);
    }
  };

  return (
    <>
      <Toaster position="bottom-right" />
      <div className="p-6 h-[calc(100vh-100px)] flex flex-col bg-gray-50">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-3xl font-semibold text-indigo-700">
            Excel Files
          </h2>
          <div className="flex items-center gap-3">
            {files.length > 0 && (
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 bg-gray-100 text-gray-800 px-4 py-2 rounded-xl hover:bg-gray-200 transition"
              >
                {areAllSelected ? "Unselect All" : "Select All"}
              </button>
            )}

            {selectedFilesToDelete.length > 0 && (
              <button
                onClick={() => setShowMultiDeleteModal(true)}
                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition"
              >
                <FaTrash className="w-4 h-4" />
                Delete Selected ({selectedFilesToDelete.length})
              </button>
            )}

            <button
              onClick={handleUploadClick}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition"
            >
              <FaUpload className="w-4 h-4" />
              Upload File
            </button>
          </div>
        </div>

        <div className="flex-1 border border-gray-200 rounded-xl bg-white p-6 shadow-sm overflow-auto">
          <div className="grid grid-cols-12 gap-4 pb-3 border-b border-gray-300 text-gray-700 font-bold text-sm px-4 sticky top-0 bg-white z-10">
            <div className="col-span-4">File</div>
            <div className="col-span-4">Month</div>
            <div className="col-span-2">Added On</div>
            <div className="col-span-2 text-right">Action</div>
          </div>

          <div className="divide-y divide-gray-100 text-[15px] font-medium text-[#111827]">
            {loadingFiles ? (
              <div className="flex items-center justify-center h-[300px]">
                <div className="text-center">
                  <div className="animate-spin h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-gray-500">Loading files...</p>
                </div>
              </div>
            ) : files.length > 0 ? (
              files.map((file, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-4 py-3 items-center hover:bg-indigo-50 transition rounded-lg px-4"
                >
                  <div className="col-span-4 flex items-center gap-2 truncate">
                    <input
                      type="checkbox"
                      checked={isSelected(file.name)}
                      onChange={() => toggleSelectFile(file.name)}
                      className="w-4 h-4 shrink-0 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    />
                    <FaFileExcel className="text-green-600 w-5 h-5" />
                    <span className="truncate">{file.name}</span>
                  </div>
                  <div className="col-span-4 text-sm">{file.month || "—"}</div>
                  <div className="col-span-2 text-sm">{file.date}</div>
                  <div className="col-span-2 text-right">
                    <button
                      onClick={() => confirmDelete(file.name)} // Pass only the filename here
                      className="text-red-600 hover:text-red-800"
                      title="Delete"
                    >
                      <FaTrash className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-10">
                No files uploaded yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Upload Excel File(s)</h3>

            <div
              onDrop={(e) => {
                e.preventDefault();
                setSelectedFiles(Array.from(e.dataTransfer.files));
              }}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-300 hover:border-indigo-500 rounded-lg p-6 text-center text-gray-500 cursor-pointer transition mb-3"
              onClick={() => document.getElementById("fileInput").click()}
            >
              <input
                id="fileInput"
                type="file"
                multiple
                accept=".xlsx,.xls"
                onChange={handleFilesSelected}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-2">
                <FaUpload className="text-indigo-500 text-3xl" />
                <p className="text-sm">Drag & drop your Excel files here</p>
                <p className="text-xs text-gray-400">or click to browse</p>
              </div>
            </div>

            {selectedFiles.length > 0 && (
              <ul className="text-sm text-gray-700 mb-3 space-y-1 max-h-24 overflow-y-auto border p-2 rounded">
                {selectedFiles.map((file, index) => (
                  <li key={index}>• {file.name}</li>
                ))}
              </ul>
            )}

            {uploading && (
              <div className="w-full bg-gray-200 rounded h-2 mb-4 overflow-hidden">
                <div
                  className="bg-indigo-600 h-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300"
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                onClick={handleUploadFile}
                disabled={uploading || selectedFiles.length === 0}
                className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50"
              >
                {uploading && <FaSpinner className="animate-spin" />}
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-3">Delete File</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete{" "}
              <strong>{fileToDelete}</strong>?{" "}
              {/* Display just the filename */}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteFile}
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multi Delete Modal */}
      {showMultiDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-3">
              Delete Selected Files
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete{" "}
              <strong>{selectedFilesToDelete.length}</strong> selected{" "}
              {selectedFilesToDelete.length === 1 ? "file" : "files"}?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowMultiDeleteModal(false)}
                className="px-4 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDeleteSelectedFiles();
                  setShowMultiDeleteModal(false);
                }}
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ExcelUploader;