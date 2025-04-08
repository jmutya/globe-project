import React, { useState, useEffect, useRef } from "react"; // Importing React hooks for managing state, effects, and references
import * as XLSX from "xlsx"; // Importing XLSX library to read and parse Excel files
import supabase from "../../backend/supabase/supabase"; // Importing supabase instance for file storage handling
import { FaFileExcel, FaUpload, FaSpinner, FaEye, FaTrash } from "react-icons/fa"; // Importing React Icons for UI elements
import toast, { Toaster } from "react-hot-toast"; // Importing the toast notifications library

const ExcelUploader = () => {
  // State variables to manage different functionalities in the app
  const [uploading, setUploading] = useState(false); // Track upload progress
  const [uploadProgress, setUploadProgress] = useState(0); // Track the percentage of upload completion
  const [files, setFiles] = useState([]); // List of files uploaded to the server
  const [parsedData, setParsedData] = useState([]); // Data parsed from the Excel file
  const [loadingFilesUploaded, setLoadingFilesUploaded] = useState(false); // Loading state for fetching files
  const fileInputRef = useRef(null); // Ref for the file input
  const [dragOver, setDragOver] = useState(false); // Track drag-over state for file drop area
  const [fileToDelete, setFileToDelete] = useState(null); // Track the file selected for deletion
  const [showDeleteModal, setShowDeleteModal] = useState(false); // Track the visibility of the delete confirmation modal

  // Fetch uploaded files when the component is mounted
  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  // Event handler when a file is dragged over the drop area
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true); // Change the state to show drag-over effect
  };

  // Event handler when a file is dragged out of the drop area
  const handleDragLeave = () => {
    setDragOver(false); // Reset drag-over state
  };

  // Event handler when a file is dropped into the drop area
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false); // Reset drag-over state
    const file = e.dataTransfer.files[0]; // Get the file from the drop event
    if (file) {
      handleFileUpload({ target: { files: [file] } }); // Proceed to upload the dropped file
    }
  };

  // Event handler to upload a selected file
  const handleFileUpload = async (event) => {
    const file = event.target.files[0]; // Get the file from the input field
    if (!file) {
      toast.error("No file selected!"); // Show error if no file is selected
      return;
    }

    setUploading(true); // Set uploading state to true
    setUploadProgress(10); // Set initial upload progress to 10%

    try {
      // Upload the file to Supabase storage
      const { error } = await supabase.storage
        .from("uploads")
        .upload(`excels/${file.name}`, file, { cacheControl: "3600", upsert: true });

      if (error) throw error; // Handle any errors during upload
      setUploadProgress(50); // Update upload progress to 50% after successful upload
      fetchUploadedFiles(); // Fetch the list of uploaded files
      setUploadProgress(100); // Set progress to 100% once upload is complete
      toast.success("File uploaded successfully!"); // Show success notification
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Upload failed!"); // Show error notification if upload fails
    } finally {
      setUploading(false); // Reset the uploading state
    }
  };

  // Fetch the list of files that have been uploaded to Supabase storage
  const fetchUploadedFiles = async () => {
    setLoadingFilesUploaded(true); // Set loading state to true while fetching files
    try {
      // Fetch the files list from Supabase
      const { data, error } = await supabase.storage.from("uploads").list("excels", { limit: 100 });
      if (error) throw error; // Handle any errors during fetching

      const validFiles = data.filter(file => !file.name.startsWith(".")); // Filter out any hidden files
      setFiles(validFiles.map(file => ({
        name: file.name,
        url: supabase.storage.from("uploads").getPublicUrl(`excels/${file.name}`).data.publicUrl,
      }))); // Update the files state with the valid files
    } catch (error) {
      console.error("Error fetching files:", error);
      toast.error("Failed to load files."); // Show error if fetching files fails
    } finally {
      setLoadingFilesUploaded(false); // Reset loading state once fetching is complete
    }
  };

  // View an uploaded Excel file and parse its content
  const viewExcelFile = async (fileUrl) => {
    try {
      const response = await fetch(fileUrl); // Fetch the file
      const blob = await response.blob(); // Convert the response to a blob
      const reader = new FileReader(); // Create a FileReader to read the file content
      reader.onload = (e) => {
        const workbook = XLSX.read(e.target.result, { type: "binary" }); // Parse the Excel file
        const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]); // Convert the first sheet to JSON
        setParsedData(sheet); // Store the parsed data in the state
      };
      reader.readAsBinaryString(blob); // Start reading the file as binary string
    } catch (error) {
      console.error("Error reading Excel file:", error);
      toast.error("Failed to read file."); // Show error notification if reading fails
    }
  };

  // Confirm file deletion
  const confirmDelete = (fileName) => {
    setFileToDelete(fileName); // Set the file to delete in state
    setShowDeleteModal(true); // Show the delete confirmation modal
  };

  // Handle the file deletion
  const handleDeleteFile = async () => {
    if (!fileToDelete) return; // Exit if no file is selected to delete
    try {
      // Delete the file from Supabase storage
      const { error } = await supabase.storage.from("uploads").remove([`excels/${fileToDelete}`]);
      if (error) throw error; // Handle any errors during deletion
      toast.success("File deleted successfully."); // Show success notification
      fetchUploadedFiles(); // Fetch updated list of files
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Failed to delete the file."); // Show error notification if deletion fails
    } finally {
      setShowDeleteModal(false); // Hide the delete confirmation modal
      setFileToDelete(null); // Reset the file to delete state
    }
  };

  return (
    <>
      {/* Toast notifications */}
      <Toaster position="bottom-right" />
      <div className="flex flex-col md:flex-row p-4 gap-4 h-[calc(100vh-100px)]">
        {/* File upload section */}
        <div className="w-full md:w-1/3 bg-white rounded-xl shadow-lg p-4 flex flex-col">
          {/* Drag & drop area with file input */}
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

          {/* Upload progress bar */}
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

          {/* Display list of uploaded files */}
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

                    {/* Delete button */}
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

        {/* Display parsed data from the Excel file */}
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

        {/* Delete confirmation modal */}
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
