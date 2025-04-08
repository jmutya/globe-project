import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import supabase from "../../backend/supabase/supabase";
import { FaFileExcel, FaUpload, FaSpinner, FaEye, FaTrash } from "react-icons/fa";
import toast, { Toaster } from "react-hot-toast";

const ExcelUploader = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [files, setFiles] = useState([]);
  const [parsedData, setParsedData] = useState([]);
  const [loadingFilesUploaded, setLoadingFilesUploaded] = useState(false);
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload({ target: { files: [file] } });
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      toast.error("No file selected!");
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      const { error } = await supabase.storage
        .from("uploads")
        .upload(`excels/${file.name}`, file, { cacheControl: "3600", upsert: true });

      if (error) throw error;
      setUploadProgress(50);
      fetchUploadedFiles();
      setUploadProgress(100);
      toast.success("File uploaded successfully!");
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Upload failed!");
    } finally {
      setUploading(false);
    }
  };

  const fetchUploadedFiles = async () => {
    setLoadingFilesUploaded(true);
    try {
      const { data, error } = await supabase.storage.from("uploads").list("excels", { limit: 100 });
      if (error) throw error;
      const validFiles = data.filter(file => !file.name.startsWith("."));

      setFiles(validFiles.map(file => ({
        name: file.name,
        url: supabase.storage.from("uploads").getPublicUrl(`excels/${file.name}`).data.publicUrl,
      })));
    } catch (error) {
      console.error("Error fetching files:", error);
      toast.error("Failed to load files.");
    } finally {
      setLoadingFilesUploaded(false);
    }
  };

  const viewExcelFile = async (fileUrl) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onload = (e) => {
        const workbook = XLSX.read(e.target.result, { type: "binary" });
        const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        setParsedData(sheet);
      };
      reader.readAsBinaryString(blob);
    } catch (error) {
      console.error("Error reading Excel file:", error);
      toast.error("Failed to read file.");
    }
  };

  const confirmDelete = (fileName) => {
    setFileToDelete(fileName);
    setShowDeleteModal(true);
  };

  const handleDeleteFile = async () => {
    if (!fileToDelete) return;
    try {
      const { error } = await supabase.storage.from("uploads").remove([`excels/${fileToDelete}`]);
      if (error) throw error;
      toast.success("File deleted successfully.");
      fetchUploadedFiles();
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Failed to delete the file.");
    } finally {
      setShowDeleteModal(false);
      setFileToDelete(null);
    }
  };

  return (
    <>
    <Toaster position="top-center" />
    <div className="flex flex-col md:flex-row p-4 gap-4 h-[calc(100vh-100px)]">
      <div className="w-full md:w-1/3 bg-white rounded-xl shadow-lg p-4 flex flex-col">
        <label
          ref={fileInputRef}
          className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition ${
            dragOver ? "bg-blue-50 border-blue-400" : "border-gray-300 hover:bg-gray-100"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
            ref={fileInputRef}
            className="hidden"
          />
          <FaUpload className="text-gray-400 text-3xl mb-2" />
          <span className="text-gray-600">Drag & Drop or <span className="text-blue-600 font-semibold">Click to Upload</span></span>
        </label>

        {uploading && (
          <div className="relative w-full bg-gray-200 rounded-full h-4 mt-4">
            <div 
              className="absolute top-0 left-0 bg-blue-500 h-4 rounded-full text-white text-xs flex items-center justify-center"
              style={{ width: `${uploadProgress}%` }}
            >
              {uploadProgress}%
            </div>
          </div>
        )}

        <div className="mt-4 overflow-y-auto max-h-[calc(100vh-300px)]">
          <h3 className="text-md font-semibold mb-3">Uploaded Files</h3>
          {loadingFilesUploaded ? (
            <div className="flex justify-center items-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
              <p className="ml-3 text-gray-600">Loading files...</p>
            </div>
          ) : files.length > 0 ? (
            <div className="flex flex-col gap-3">
              {files.map((file, index) => (
                <div 
                  key={index} 
                  className="relative flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-indigo-50 transition duration-200"
                >
                  <div className="flex items-start gap-2 w-full pr-10">
                    <FaFileExcel className="text-green-600 mt-1" />
                    <button 
                      onClick={() => viewExcelFile(file.url)}
                      className="text-indigo-700 text-sm text-left break-words w-full"
                    >
                      {file.name}
                    </button>
                  </div>

                  <button 
                    onClick={() => confirmDelete(file.name)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-red-600 hover:text-red-800 text-2xl"
                    title="Delete file"
                  >
                    <FaTrash />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">No files uploaded.</p>
          )}
        </div>
      </div>

      <div className="flex-1 p-4 bg-white rounded-xl shadow-lg overflow-hidden">
        {parsedData.length > 0 ? (
          <div className="max-h-full overflow-auto border border-gray-300 rounded-lg">
            <table className="min-w-full table-fixed border-collapse border border-gray-300">
              <thead>
                <tr className="bg-indigo-600 text-white">
                  {Object.keys(parsedData[0]).map((key) => (
                    <th key={key} className="border border-gray-300 px-3 py-2 text-sm text-left bg-indigo-600 text-white">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsedData.map((row, index) => (
                  <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                    {Object.entries(row).map(([key, value], idx) => (
                      <td 
                        key={idx} 
                        className={`border border-gray-300 px-3 py-2 text-sm text-left`}
                      >
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-500 p-8 h-full">
            <FaEye className="text-4xl text-gray-400" />
            <p className="text-lg font-semibold mt-2">No file selected.</p>
            <p className="text-sm text-gray-400">Upload or select a file to display data.</p>
          </div>
        )}
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-xl p-6 shadow-lg w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Delete File</h2>
            <p className="text-sm text-gray-700 mb-6">Are you sure you want to delete <strong>{fileToDelete}</strong>?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300">Cancel</button>
              <button onClick={handleDeleteFile} className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default ExcelUploader;
