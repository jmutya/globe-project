import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import supabase from "../../backend/supabase/supabase";
import { FaFileExcel, FaUpload, FaSpinner, FaEye, FaTrash } from "react-icons/fa";

const ExcelUploader = () => {
  // State management
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [files, setFiles] = useState([]);
  const [parsedData, setParsedData] = useState([]);
  const [loadingFilesUploaded, setLoadingFilesUploaded] = useState(false);

  // Fetch uploaded files on component mount
  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return alert("No file selected!");

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
    } catch (error) {
      alert("Upload failed!");
    } finally {
      setUploading(false);
    }
  };

  // Fetch list of uploaded files
  const fetchUploadedFiles = async () => {
    setLoadingFilesUploaded(true);
    try {
      const { data, error } = await supabase.storage.from("uploads").list("excels", { limit: 100 });
      if (error) throw error;
  
      // Filter out starts with "."
      const validFiles = data.filter(file => !file.name.startsWith("."));
  
      setFiles(validFiles.map(file => ({
        name: file.name,
        url: supabase.storage.from("uploads").getPublicUrl(`excels/${file.name}`).data.publicUrl,
      })));
    } catch (error) {
      console.error("Error fetching files:", error);
    } finally {
      setLoadingFilesUploaded(false);
    }
  };  

  // View an uploaded Excel file
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
    }
  };

  // Delete an uploaded Excel file
  const handleDeleteFile = async (fileName) => {
    if (!window.confirm(`Are you sure you want to delete "${fileName}"?`)) return;
  
    try {
      const { error } = await supabase.storage.from("uploads").remove([`excels/${fileName}`]);
      if (error) throw error;
      alert("File deleted successfully.");
      fetchUploadedFiles(); // Refresh the file list
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("Failed to delete the file.");
    }
  };

  return (
    <div className="flex p-4 gap-8">
      {/* File Upload Section */}
      <div className="flex flex-wrap gap-8 p-6 bg-white rounded-xl shadow-lg">
        <label 
          className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100 transition">
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              onChange={handleFileUpload} 
              className="hidden" 
            />
          <FaUpload className="text-gray-400 text-3xl mb-2" />
          <span className="text-gray-600">Drag & Drop or <span className="text-blue-600 font-semibold">Click to Upload</span></span>
        </label>

        {/* Upload Progress Bar */}
        {uploading && (
          <div className="relative w-full bg-gray-200 rounded-full h-4 mt-2">
            <div className="absolute top-0 left-0 bg-blue-500 h-4 rounded-full text-white text-xs flex items-center justify-center" style={{ width: `${uploadProgress}%` }}>
              {uploadProgress}%
            </div>
          </div>
        )}

        {/* Uploaded Files List */}
        <div className="mt-4 overflow-y-auto max-h-70 px-2" >
          <h3 className="text-md font-semibold mb-2">Uploaded Files</h3>
          {loadingFilesUploaded ? (
            <div className="flex justify-center items-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
              <p className="ml-3 text-gray-600">Loading files...</p>
            </div>
          ) : files.length > 0 ? (
            <div className="flex flex-col gap-2">
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
      onClick={() => handleDeleteFile(file.name)}
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

      {/* File Preview Section */}
      <div className="w-2/3 p-4 border rounded-lg shadow-lg overflow-hidden">
        {parsedData.length > 0 ? (
          <div className="max-h-[750px] overflow-auto border border-gray-300 rounded-lg">
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
                <tr 
                  key={index} 
                  className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                  {Object.entries(row).map(([key, value], idx) => (
                  <td 
                    key={idx} 
                    className={`border border-gray-300 px-3 py-2 text-sm text-left ${key === "Severity" ? getSeverityClass(value) : ""}`}>
                    {key === "Severity" ? getSeverityIcon(value) : value}
                  </td>
              ))}
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-500 text-lg font-semibold">
            {parsedData.length === 0 && (
              <div className="flex flex-col items-center justify-center text-gray-500 p-8">
                <FaEye className="text-4xl text-gray-400" />
                  <p className="text-lg font-semibold mt-2">No file selected.</p>
                  <p className="text-sm text-gray-400">Upload or select a file to display data.</p>
              </div>
)}
          </p>
        )}
      </div>
    </div>
  );
};

export default ExcelUploader;
