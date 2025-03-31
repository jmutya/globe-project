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
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-lg rounded-lg border border-gray-200">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <FaUpload /> Upload Excel File
      </h2>
      <label className="cursor-pointer flex flex-col items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-100">
        <FaFileExcel className="text-green-500 text-4xl" />
        <span className="mt-2 text-sm text-gray-600">Click to Upload</span>
        <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="hidden" />
      </label>
      {uploading && (
        <div className="w-full bg-gray-200 rounded-full h-3 mt-3 overflow-hidden">
          <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${uploadProgress}%` }}></div>
        </div>
      )}
      
      {files.length > 0 && (
        <div className="mt-4">
          <h3 className="text-md font-semibold mb-2">Uploaded Files</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {files.map((file, index) => (
              <button 
                key={index} 
                onClick={() => viewExcelFile(file.url)}
                className="flex items-center px-3 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition">
                <FaEye className="mr-2" /> {file.name}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {parsedData.length > 0 && (
        <div className="mt-4 overflow-x-auto border border-gray-300 rounded-lg">
          <table className="table-auto w-full text-sm">
            <thead className="bg-gray-200">
              <tr>
                {Object.keys(parsedData[0]).map((key) => (
                  <th key={key} className="px-4 py-2 border">{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parsedData.map((row, index) => (
                <tr key={index} className="odd:bg-white even:bg-gray-100">
                  {Object.values(row).map((value, idx) => (
                    <td key={idx} className="px-4 py-2 border">{value}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ExcelUploader;