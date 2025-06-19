import React, { useState } from "react";
import Papa from "papaparse";
import supabase from "./../../backend/supabase/supabase"; // Supabase client

const FileUploader = () => {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [tableName, setTableName] = useState("");
  const chunkSize = 500;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setMessage("");

    const rawName = selectedFile.name.replace(/\.[^/.]+$/, "");
    const timestamp = Date.now();
    const safeName = rawName.toLowerCase().replace(/[^a-z0-9_]/g, "_");
    setTableName(`csv_${safeName}_${timestamp}`);
  };

  const handleUpload = async () => {
    if (!file || !tableName) return alert("Please select a CSV file.");

    setLoading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const headers = results.meta.fields;
        const rows = results.data;

        try {
          const createSQL = `
            CREATE TABLE IF NOT EXISTS "${tableName}" (
              ${headers.map((h) => `"${h}" TEXT`).join(", ")}
              );
            `;
          console.log("Generated SQL for creating table:", createSQL); // Added console.log
          await supabase.rpc("run_sql", { sql: createSQL });

          for (const header of headers) {
            const alterSQL = `ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "${header}" TEXT;`;
            console.log("Generated SQL for altering table:", alterSQL); // Added console.log
            await supabase.rpc("run_sql", { sql: alterSQL });
          }

          const total = rows.length;
          let uploadedCount = 0;

          for (let i = 0; i < total; i += chunkSize) {
            const chunk = rows.slice(i, i + chunkSize);
            const { error: insertError } = await supabase
              .from(tableName)
              .insert(chunk);

            if (insertError) {
              throw insertError;
            }

            uploadedCount += chunk.length;
            setMessage(`✅ Uploaded ${uploadedCount}/${total} rows...`);
          }

          setMessage(
            `✅ Finished: Uploaded ${rows.length} rows to '${tableName}'.`
          );
        } catch (err) {
          console.error("Upload Error:", err);
          setMessage(
            "❌ Upload failed: " + (err.message || JSON.stringify(err))
          );
        } finally {
          setLoading(false);
        }
      },
      error: (error) => {
        console.error("Parsing failed:", error);
        setMessage(
          "❌ Parsing failed: " + (error.message || JSON.stringify(error))
        );
        setLoading(false);
      },
    });
  };

  return (
    <div style={{ maxWidth: 500, margin: "auto", textAlign: "center" }}>
      <h2>CSV to Supabase Uploader</h2>
      <input type="file" accept=".csv" onChange={handleFileChange} />
      {tableName && (
        <p>
          <strong>Target Table:</strong> {tableName}
        </p>
      )}
      <br />
      <button onClick={handleUpload} disabled={loading || !file}>
        {loading ? "Uploading..." : "Upload to Supabase"}
      </button>
      {message && (
        <p style={{ marginTop: 20, whiteSpace: "pre-wrap" }}>
          {typeof message === "object"
            ? JSON.stringify(message, null, 2)
            : message}
        </p>
      )}
    </div>
  );
};

export default FileUploader;
