import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import supabase from "../../backend/supabase/supabase";
import { FaFileExcel, FaUpload, FaSpinner, FaEye } from "react-icons/fa";

const ExcelUploader = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [files, setFiles] = useState([]);
  const [parsedData, setParsedData] = useState([]);

  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return alert("No file selected!");

    setUploading(true);
    setUploadProgress(10);

    try {
      const { data: uploadData, error } = await supabase.storage
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

  const fetchUploadedFiles = async () => {
    try {
      const { data, error } = await supabase.storage.from("uploads").list("excels", { limit: 100 });
      if (error) throw error;
      setFiles(data.map(file => ({
        name: file.name,
        url: supabase.storage.from("uploads").getPublicUrl(`excels/${file.name}`).data.publicUrl,
      })));
    } catch (error) {
      console.error("Error fetching files:", error);
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
    }
  };

  return (
    <div className="flex p-4 gap-8">
      {/* Left - File Upload */}
      <div className="w-1/3 p-4 border rounded-lg shadow-lg text-center">
        <h2 className="text-lg font-semibold mb-4">Upload Excel File</h2>
        <input 
          type="file" 
          accept=".xlsx, .xls" 
          onChange={handleFileUpload} 
          className="mb-4 border p-2 w-full cursor-pointer" 
        />
        {uploading && (
          <div className="w-full bg-gray-200 rounded-full h-4 mt-2">
            <div 
              className="bg-blue-500 h-4 rounded-full text-white text-xs flex items-center justify-center"
              style={{ width: `${uploadProgress}%` }}
            >
              {uploadProgress}%
            </div>
          </div>
        )}

        {/* Uploaded Files List (Vertically Listed) */}
        {files.length > 0 && (
          <div className="mt-4 overflow-y-auto max-h-70">
            <h3 className="text-md font-semibold mb-2">Uploaded Files</h3>
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
          </div>
        )}
      </div>

      {/* Right - Table */}
      <div className="w-2/3 p-4 border rounded-lg shadow-lg overflow-hidden">
        {parsedData.length > 0 ? (
          <>
            {/* <h3 className="text-md font-semibold mb-2">Excel Data</h3> */}
            <div className="max-h-[750px] overflow-auto border border-gray-300 rounded-lg">
              <table className="table-auto w-full border-collapse border border-gray-300">
                <thead>
                  <tr>
                    {Object.keys(parsedData[0]).map((key) => (
                      <th key={key} className="border border-gray-300 px-3 py-2 bg-gray-100">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedData.map((row, index) => (
                    <tr key={index}>
                      {Object.entries(row).map(([key, value], idx) => (
                        <td key={idx} className={`border border-gray-300 px-3 py-1 ${key === "Severity" ? (value === "Critical" ? "bg-red-700 text-white" : value === "Major" ? "bg-orange-500" : value === "Minor" ? "bg-yellow-300" : "") : ""}`}>{value}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-center text-gray-500 text-lg font-semibold">No file selected. Please upload or select a file.</p>
        )}
      </div>
      
      
    </div>
    
  );
};
export default ExcelUploader;