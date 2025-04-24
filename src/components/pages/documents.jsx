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
        const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        let month = "Unknown";
        if (json.length > 0) {
          month = parseExcelMonths(json);
        }

        const blob = new Blob([file], { type: file.type });
        const { error } = await supabase.storage.from("uploads").upload(`excels/${file.name}`, blob, {
          cacheControl: "3600",
          upsert: true,
        });

        if (error) throw error;

        uploadedCount++;
        setUploadProgress(
          Math.round((uploadedCount / selectedFiles.length) * 100)
        );

        setFiles((prev) => [
          ...prev,
          {
            name: file.name,
            date: new Date().toLocaleDateString(),
            month,
            url: supabase.storage
              .from("uploads")
              .getPublicUrl(`excels/${file.name}`).data.publicUrl,
          },
        ]);
      } catch (error) {
        console.error("Upload failed:", error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    toast.success("Upload completed");
    setUploading(false);
    setShowUploadModal(false);
  };

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

  return (
    <>
      <Toaster position="bottom-right" />
      <div className="p-6 h-[calc(100vh-100px)] flex flex-col bg-gray-50">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-3xl font-semibold text-indigo-700">
            Excel Files
          </h2>
          <button
            onClick={handleUploadClick}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition"
          >
            <FaUpload className="w-4 h-4" />
            Upload File
          </button>
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
                  <div className="col-span-5 flex gap-2 truncate">
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
    </>
  );
};

export default ExcelUploader;