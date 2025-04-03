import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import supabase from "../../backend/supabase/supabase";
import { FaFileExcel, FaUpload, FaSpinner, FaEye } from "react-icons/fa";

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
      setFiles(data.map(file => ({
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

  return (
    <div className="flex p-4 gap-8">
      {/* File Upload Section */}
      <div className="w-1/3 p-4 border rounded-lg shadow-lg text-center">
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
        <div className="mt-4 overflow-y-auto max-h-70">
          <h3 className="text-md font-semibold mb-2">Uploaded Files</h3>
          {loadingFilesUploaded ? (
            <div className="flex justify-center items-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
              <p className="ml-3 text-gray-600">Loading files...</p>
            </div>
          ) : files.length > 0 ? (
            <div className="flex flex-col gap-2">
              {files.map((file, index) => (
                <button 
                  key={index} 
                  onClick={() => viewExcelFile(file.url)}
                  className="px-3 py-2 bg-gray-100 border rounded-lg text-blue-600 hover:bg-blue-200 transition"
                >
                  {file.name}
                </button>
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
            <table className="table-auto w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-indigo-600 text-white">
                {Object.keys(parsedData[0]).map((key) => (
                  <th key={key} className="border border-gray-300 px-3 py-2">{key}</th>
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
                    className={`border border-gray-300 px-3 py-1 text-center ${key === "Severity" ? getSeverityClass(value) : ""}`}>
                    {key === "Severity" ? getSeverityIcon(value) : value}
                  </td>
              ))}
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-500 text-lg font-semibold">No file selected. Please upload or select a file.</p>
        )}
      </div>
    </div>
  );
};

export default ExcelUploader;
