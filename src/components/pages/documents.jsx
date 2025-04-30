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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedFilesToDelete, setSelectedFilesToDelete] = useState([]);
  const [showMultiDeleteModal, setShowMultiDeleteModal] = useState(false);

  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  const parseExcelMonths = (json) => {
    const seen = new Set();
    const months = [];

    json.forEach((row) => {
      const value = row["Opened"] || row["Created"];
      let parsedDate;

      if (typeof value === "number") {
        parsedDate = new Date(Math.round((value - 25569) * 86400 * 1000));
      } else if (typeof value === "string") {
        parsedDate = new Date(value);
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
        .list("excels");
      if (error) throw error;

      const validFiles = data.filter((file) => !file.name.startsWith("."));

      const fileList = await Promise.all(
        validFiles.map(async (file) => {
          const fullPath = `excels/${file.name}`;
          const fileUrl = supabase.storage
            .from("uploads")
            .getPublicUrl(fullPath).data.publicUrl;

          let month = "—";
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
            console.warn(`Could not parse ${file.name}:`, err.message);
          }

          return {
            name: file.name,
            date: new Date().toLocaleDateString(),
            month,
            url: fileUrl,
          };
        })
      );

      setFiles(fileList);
    } catch (err) {
      console.error("Error loading files:", err.message);
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
    if (selectedFiles.length === 0) return;
  
    setUploading(true);
    setUploadProgress(0);
  
    let uploadedCount = 0;
  
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
  
      try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  
        if (rows.length === 0) continue;
  
        const headers = rows[0];
        const openedIndex = headers.indexOf("Opened");
        if (openedIndex === -1) {
          throw new Error("No 'Opened' column found in the Excel file.");
        }
  
        // Group by year-month (Philippine Time)
        const monthGroups = {};
  
        for (const row of rows.slice(1)) {
          const openedRaw = row[openedIndex];
          let openedDate;
  
          if (typeof openedRaw === "number") {
            const parsed = XLSX.SSF.parse_date_code(openedRaw);
            openedDate = new Date(parsed.y, parsed.m - 1, parsed.d, parsed.H, parsed.M, parsed.S);
          } else {
            openedDate = new Date(openedRaw);
          }
  
          if (!isNaN(openedDate)) {
            const datePH = new Date(openedDate.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
            const year = datePH.getFullYear();
            const month = String(datePH.getMonth() + 1).padStart(2, "0");
            const groupKey = `${year}-${month}`;
  
            // Replace 'Opened' column with formatted PH date string
            row[openedIndex] = formatDatePH(datePH); // "MM/DD/YYYY HH:mm:ss"
  
            if (!monthGroups[groupKey]) {
              monthGroups[groupKey] = [];
            }
            monthGroups[groupKey].push(row);
          }
        }
  
        // Upload one file per PH month
        const keys = Object.keys(monthGroups);
        for (const monthKey of keys) {
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
          const newFileName = `${fileNameWithoutExt}_${monthKey}.xlsx`;
  
          // Upload to Supabase
          const { error } = await supabase.storage
            .from("uploads")
            .upload(`excels/${newFileName}`, blob, {
              cacheControl: "3600",
              upsert: true,
            });
  
          if (error) throw error;
  
          uploadedCount++;
          setUploadProgress(Math.round((uploadedCount / keys.length) * 100));
  
          setFiles((prev) => [
            ...prev,
            {
              name: newFileName,
              date: new Date().toLocaleDateString("en-PH"),
              month: monthKey,
              url: supabase.storage
                .from("uploads")
                .getPublicUrl(`excels/${newFileName}`).data.publicUrl,
            },
          ]);
        }
      } catch (error) {
        console.error("Upload failed:", error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }
  
    toast.success("Upload completed");
    setUploading(false);
    setShowUploadModal(false);
  };
  
  // Format as "MM/DD/YYYY HH:mm:ss" in PH time
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
  

  // Helper function to format the date (MM/DD/YYYY HH:mm:ss)
  function formatDate(date) {
    const options = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "Asia/Manila", // Set to Philippine Time (PHT)
    };
    return new Intl.DateTimeFormat("en-US", options)
      .format(date)
      .replace(",", "");
  }
  

  const confirmDelete = (fileName) => {
    setFileToDelete(`excels/${fileName}`);
    setShowDeleteModal(true);
  };

  const handleDeleteFile = async () => {
    if (!fileToDelete) return;
    try {
      const { error } = await supabase.storage
        .from("uploads")
        .remove([fileToDelete]);
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

  const toggleSelectFile = (fileName) => {
    setSelectedFilesToDelete((prevSelected) =>
      prevSelected.includes(fileName)
        ? prevSelected.filter((name) => name !== fileName)
        : [...prevSelected, fileName]
    );
  };

  const isSelected = (fileName) => selectedFilesToDelete.includes(fileName);

  const toggleSelectAll = () => {
    if (selectedFilesToDelete.length === files.length) {
      setSelectedFilesToDelete([]);
    } else {
      setSelectedFilesToDelete(files.map((file) => file.name));
    }
  };

  const handleDeleteSelectedFiles = async () => {
    if (selectedFilesToDelete.length === 0) return;

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

        <div className="flex-1 border border-gray-200 rounded-xl bg-white p-6 shadow-sm">
          <div className="grid grid-cols-12 gap-4 pb-3 border-b border-gray-300 text-gray-700 font-bold text-sm px-4">
            <div className="col-span-5">File</div>
            <div className="col-span-5">Month</div>
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
                  <div className="col-span-5 flex gap-2 truncate justify-start items-center">
                    <input
                      type="checkbox"
                      checked={isSelected(file.name)}
                      onChange={() => toggleSelectFile(file.name)}
                      className="w-4 h-4 text-indigo-600"
                    />
                    <FaFileExcel className="text-green-600 w-5 h-5" />
                    <span className="truncate">{file.name}</span>
                  </div>
                  <div className="col-span-5">{file.month || "—"}</div>
                  <div className="col-span-2 text-right">
                    <button
                      onClick={() => confirmDelete(file.name)}
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
              <ul className="text-sm text-gray-700 mb-3 space-y-1 max-h-24 overflow-y-auto">
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
              <strong>{fileToDelete?.split("/")[1]}</strong>?
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