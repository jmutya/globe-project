import React, { useState, useEffect, useRef } from "react";
import { FaUpload, FaFileExcel, FaTrash, FaSpinner } from "react-icons/fa";
import toast, { Toaster } from "react-hot-toast";
import supabase from "../../backend/supabase/supabase"; // Assuming this path is correct

// Define a cache key and expiration time (e.g., 30 minutes)
const CACHE_KEY = "uploadedExcelFiles";
const CACHE_EXPIRATION_MS = 30 * 60 * 1000; // 30 minutes in milliseconds <--- UPDATED HERE

const ExcelUploader = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedFilesToDelete, setSelectedFilesToDelete] = useState([]);
  const [showMultiDeleteModal, setShowMultiDeleteModal] = useState(false);

  // In-memory cache for the current session
  const inMemoryCache = useRef(null);

  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  const fetchUploadedFiles = async (forceRefresh = false) => {
    setLoadingFiles(true);

    // 1. Check In-Memory Cache
    if (!forceRefresh && inMemoryCache.current) {
      console.log("Using in-memory cache for files.");
      setFiles(inMemoryCache.current);
      setLoadingFiles(false);
      return;
    }

    // 2. Check Local Storage Cache
    if (!forceRefresh) {
      const cachedData = localStorage.getItem(CACHE_KEY);
      if (cachedData) {
        const { timestamp, data } = JSON.parse(cachedData);
        if (Date.now() - timestamp < CACHE_EXPIRATION_MS) {
          console.log("Using local storage cache for files.");
          setFiles(data);
          inMemoryCache.current = data; // Populate in-memory cache
          setLoadingFiles(false);
          return;
        } else {
          console.log("Local storage cache expired. Fetching fresh data.");
          localStorage.removeItem(CACHE_KEY); // Clear expired cache
        }
      }
    }

    // 3. Fetch from Supabase if no valid cache
    try {
      const { data, error } = await supabase.storage
        .from("uploads")
        .list("excels", { limit: 1000 });
      if (error) throw error;

      const validFiles = data.filter((file) => !file.name.startsWith("."));

      const fileList = validFiles.map((file) => {
        const fullPath = `excels/${file.name}`;
        const fileUrl = supabase.storage
          .from("uploads")
          .getPublicUrl(fullPath).data.publicUrl;
      const fileList = validFiles.map((file) => {
        const fullPath = `excels/${file.name}`;
        const fileUrl = supabase.storage
          .from("uploads")
          .getPublicUrl(fullPath).data.publicUrl;

        const month = "N/A"; // Month information is not parsed on upload now
        const month = "N/A"; // Month information is not parsed on upload now

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
      });
        return {
          name: file.name,
          date: uploadedDate,
          month,
          url: fileUrl,
        };
      });

      const sortedFiles = fileList.sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );
      setFiles(sortedFiles);
      inMemoryCache.current = sortedFiles; // Update in-memory cache

      // Store in local storage with timestamp
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ timestamp: Date.now(), data: sortedFiles })
      );
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

    let successfullyUploadedCount = 0;
    const totalFilesToUpload = selectedFiles.length;

    // Get current file names already in storage for quick lookup (from the current state, which should be up-to-date)
    const existingFileNames = new Set(files.map((f) => f.name));

    for (let i = 0; i < totalFilesToUpload; i++) {
    for (let i = 0; i < totalFilesToUpload; i++) {
      const file = selectedFiles[i];
      let currentFileStatusToast = toast.loading(`Uploading ${file.name}...`);

      // Check if file with the same name already exists
      if (existingFileNames.has(file.name)) {
        toast.dismiss(currentFileStatusToast);
        toast.error(`File with name '${file.name}' already exists. Skipping.`);
        // Update progress for the skipped file
        setUploadProgress(Math.round(((i + 1) / totalFilesToUpload) * 100));
        continue; // Skip to the next file
      }

      try {
        const { error } = await supabase.storage
          .from("uploads")
          .upload(`excels/${file.name}`, file, {
            cacheControl: "3600",
            upsert: false, // Set upsert to false to prevent overwriting
          });

        if (error) {
          console.error(`Supabase upload error for ${file.name}:`, error);
          throw error;
        }

        successfullyUploadedCount++;
        if (error) {
          console.error(`Supabase upload error for ${file.name}:`, error);
          throw error;
        }

        successfullyUploadedCount++;
        toast.dismiss(currentFileStatusToast);
        toast.success(`Successfully uploaded ${file.name}.`);

        // Update progress after each file upload
        setUploadProgress(Math.round(((i + 1) / totalFilesToUpload) * 100));
      } catch (error) {
        toast.dismiss(currentFileStatusToast);
        console.error("Upload failed for file:", file.name, error);
        toast.error(`Failed to upload ${file.name}: ${error.message}`);
        toast.error(`Failed to upload ${file.name}: ${error.message}`);
      }
    }

    if (successfullyUploadedCount > 0) {
      toast.success("All new files have been uploaded!");
    } else if (totalFilesToUpload > 0) {
      toast.error("No new files were uploaded (some might have been duplicates).");
    if (successfullyUploadedCount > 0) {
      toast.success("All new files have been uploaded!");
    } else if (totalFilesToUpload > 0) {
      toast.error("No new files were uploaded (some might have been duplicates).");
    } else {
      toast.error("No files were selected for upload.");
    }


    setUploading(false);
    setShowUploadModal(false);
    fetchUploadedFiles(true); // Force refresh after upload to get the latest list from Supabase
  };

  const confirmDelete = (fileName) => {
    setFileToDelete(fileName);
    setFileToDelete(fileName);
    setShowDeleteModal(true);
  };

  const handleDeleteFile = async () => {
    if (!fileToDelete) return;
    try {
      const filePath = `excels/${fileToDelete}`;
      const { error } = await supabase.storage.from("uploads").remove([filePath]);
      if (error) throw error;
      toast.success("File deleted");
      fetchUploadedFiles(true); // Force refresh after delete
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

    const filePaths = selectedFilesToDelete.map(
      (fileName) => `excels/${fileName}`
    );

    try {
      const { error } = await supabase.storage
        .from("uploads")
        .remove(filePaths);
      if (error) throw error;

      toast.success("Selected files deleted");
      fetchUploadedFiles(true); // Force refresh after multi-delete
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
                  <div className="col-span-4 text-sm">
                    {file.month || "—"}
                  </div>
                  <div className="col-span-2 text-sm">{file.date}</div>
                  <div className="col-span-2 text-right">
                    <button
                      onClick={() => confirmDelete(file.name)}
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