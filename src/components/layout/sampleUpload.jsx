import React, { useState } from "react";
import supabase from "./../../backend/supabase/supabase";  // Import the Supabase client

const SampleTextUploaderToSQL = () => {
  const [textInput, setTextInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleInputChange = (e) => {
    setTextInput(e.target.value);
  };

  // Step 1: Create the table manually in Supabase UI or Supabase CLI
  // For example, you can create a table with the following structure:
  // CREATE TABLE text_uploads (
  //    id SERIAL PRIMARY KEY,
  //    text_content TEXT
  // );

  // Step 2: Insert text data into the table
  const insertDataIntoTable = async (tableName, text) => {
    try {
      const { data, error } = await supabase.from(tableName).insert([{ text_content: text }]);

      if (error) {
        throw error; // Throw the error to catch it in the calling function
      }

      console.log("Data inserted successfully", data);
      return data;  // Return the inserted data if successful
    } catch (error) {
      console.error("Error inserting data into Supabase:", error);
      throw new Error(error.message || "Unknown error while inserting data");
    }
  };

  const handleUpload = async () => {
    if (!textInput.trim()) {
      alert("Please enter some text.");
      return;
    }

    setLoading(true);
    setMessage("Uploading text...");

    try {
      // Step 3: Insert the text into the table
      const tableName = "text_uploads"; // Use the manually created table name
      const insertedData = await insertDataIntoTable(tableName, textInput);

      if (insertedData) {
        setMessage("Text uploaded and inserted into the database successfully!");
      } else {
        setMessage("Something went wrong while inserting the data.");
      }
    } catch (error) {
      console.error("Error uploading text or inserting data:", error);
      setMessage(`Error uploading text or inserting data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center bg-gray-100 p-6 rounded-lg shadow-lg max-w-lg mx-auto">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">Upload Text</h2>
      <div className="w-full flex flex-col items-center mb-4">
        <textarea
          value={textInput}
          onChange={handleInputChange}
          placeholder="Enter your text here..."
          rows="5"
          className="mb-2 p-2 border border-gray-300 rounded-lg w-full"
        />
      </div>
      <button
        onClick={handleUpload}
        className={`py-2 px-4 bg-blue-500 text-white rounded-lg focus:outline-none ${loading ? 'bg-blue-300' : 'hover:bg-blue-600'}`}
        disabled={loading}
      >
        {loading ? "Uploading..." : "Upload"}
      </button>
      {message && <p className="mt-4 text-center text-xl text-gray-800">{message}</p>}
    </div>
  );
};

export default SampleTextUploaderToSQL;
