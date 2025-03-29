import React, { useState } from "react";
import * as XLSX from "xlsx";
import { storage, db } from "../../backend/firebase/firebaseconfig"; // Import Firebase config
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc } from "firebase/firestore";

const ExcelUploader = () => {
  const [data, setData] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      alert("No file selected!");
      return;
    }

    console.log("Selected file:", file); // ✅ Debugging: Check if file is detected

    setUploading(true);

    try {
      // Upload file to Firebase Storage
      const storageRef = ref(storage, `uploads/${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      console.log("File uploaded. Download URL:", downloadURL); // ✅ Debugging

      // Read and parse the file
      const reader = new FileReader();
      reader.onload = async (e) => {
        console.log("FileReader triggered"); // ✅ Debugging
        const binaryData = e.target.result;
        const workbook = XLSX.read(binaryData, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const parsedData = XLSX.utils.sheet_to_json(sheet);
        console.log("Parsed Data:", parsedData); // ✅ Debugging: Check if Excel data is read

        setData(parsedData);

        // Upload parsed data to Firestore
        const collectionRef = collection(db, "excelData");
        for (const row of parsedData) {
          await addDoc(collectionRef, row);
        }

        alert("File uploaded and data saved successfully!");
      };

      reader.readAsBinaryString(file);
    } catch (error) {
      console.error("Error uploading file: ", error);
      alert("Upload failed!");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg shadow-lg w-full max-w-md mx-auto">
      <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="mb-4" />
      {uploading && <p>Uploading...</p>}
      {data.length > 0 && (
        <table className="table-auto w-full border-collapse border border-gray-300">
          <thead>
            <tr>
              {Object.keys(data[0]).map((key) => (
                <th key={key} className="border border-gray-300 px-2 py-1">{key}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index}>
                {Object.values(row).map((value, idx) => (
                  <td key={idx} className="border border-gray-300 px-2 py-1">{value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ExcelUploader;
