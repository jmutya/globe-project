import React, { useState, useEffect } from "react";
import {
  FaUpload,
  FaFileExcel,
  FaTrash,
  FaSpinner,
} from "react-icons/fa";
import toast, { Toaster } from "react-hot-toast";
import supabase from "../../backend/supabase/supabase";

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

  const fetchUploadedFiles = async () => {
    setLoadingFiles(true);
    try {
      const { data, error } = await supabase.storage
        .from("uploads")
        .list("excels", { limit: 100 });

      if (error) throw error;

      const validFiles = data.filter((file) => !file.name.startsWith("."));
      setFiles(
        validFiles.map((file) => ({
          name: file.name,
          date: new Date().toLocaleDateString(), // Placeholder date
          url: supabase.storage
            .from("uploads")
            .getPublicUrl(`excels/${file.name}`).data.publicUrl,
        }))
      );
    } catch (error) {
      console.error("Failed to fetch files:", error);
      toast.error("Error fetching files");
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
        const { error } = await supabase.storage
          .from("uploads")
          .upload(`excels/${file.name}`, file, {
            cacheControl: "3600",
            upsert: true,
          });

        if (error) throw error;
        uploadedCount++;
        setUploadProgress(Math.round((uploadedCount / selectedFiles.length) * 100));
      } catch (error) {
        console.error("Upload failed:", error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    toast.success("Upload completed");
    setUploading(false);
    setShowUploadModal(false);
    fetchUploadedFiles();
  };

  const confirmDelete = (fileName) => {
    setFileToDelete(fileName);
    setShowDeleteModal(true);
  };

  const handleDeleteFile = async () => {
    if (!fileToDelete) return;
    try {
      const { error } = await supabase.storage
        .from("uploads")
        .remove([`excels/${fileToDelete}`]);

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
      <div className="flex flex-col p-4 h-[calc(100vh-100px)] max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Files</h2>
          <button
            onClick={handleUploadClick}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow"
          >
            <FaUpload />
            Upload File
          </button>
        </div>

        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          {loadingFiles ? (
            <div className="flex items-center justify-center py-10 text-gray-500">
              <FaSpinner className="animate-spin text-xl mr-2" />
              Loading files...
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100 text-gray-700 text-sm">
                <tr>
                  <th className="px-6 py-3 text-left font-medium">File</th>
                  <th className="px-6 py-3 text-left font-medium">Date</th>
                  <th className="px-6 py-3 text-center font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="text-gray-800 text-sm divide-y divide-gray-100">
                {files.length > 0 ? (
                  files.map((file, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-3 flex items-center gap-2">
                        <FaFileExcel className="text-green-600" />
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {file.name}
                        </a>
                      </td>
                      <td className="px-6 py-3">{file.date}</td>
                      <td className="px-6 py-3 text-center">
                        <button
                          onClick={() => confirmDelete(file.name)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="text-center py-10 text-gray-500">
                      No files uploaded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
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
              Are you sure you want to delete <strong>{fileToDelete}</strong>?
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