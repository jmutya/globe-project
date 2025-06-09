import React, { useState } from 'react';
import Papa from 'papaparse';
import supabase from './../../backend/supabase/supabase'; // Supabase client
// import TableRowCount from './fetchdatarow';

const FileUploader = () => {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [tableName, setTableName] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setMessage('');

    // Convert file name to a valid SQL table name
    const rawName = selectedFile.name.replace(/\.[^/.]+$/, ""); // remove .csv
    const timestamp = Date.now(); // avoid collisions
    const safeName = rawName.toLowerCase().replace(/[^a-z0-9_]/g, "_");
    setTableName(`csv_${safeName}_${timestamp}`);
  };

  const handleUpload = async () => {
    if (!file || !tableName) return alert('Please select a CSV file.');

    setLoading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const headers = results.meta.fields;
        const rows = results.data;

        try {
          // Step 1: Create table if not exists
          const createSQL = `
            CREATE TABLE IF NOT EXISTS "${tableName}" (
              ${headers.map(h => `"${h}" TEXT`).join(', ')}
            );
          `;
          await supabase.rpc('run_sql', { sql: createSQL });

          // Step 2: Attempt to add missing columns
          for (const header of headers) {
            const alterSQL = `ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "${header}" TEXT;`;
            await supabase.rpc('run_sql', { sql: alterSQL });
          }

          // Step 3: Insert rows in chunks
          const chunkSize = 500;
          for (let i = 0; i < rows.length; i += chunkSize) {
            const chunk = rows.slice(i + 0, i + chunkSize);
            const { error: insertError } = await supabase
              .from(tableName)
              .insert(chunk);
            if (insertError) throw insertError;
          }

          setMessage(`✅ Uploaded ${rows.length} rows to '${tableName}'.`);
        } catch (err) {
          console.error(err);
          setMessage('❌ Upload failed: ' + err.message);
        } finally {
          setLoading(false);
        }
      },
      error: (error) => {
        console.error('Parsing failed:', error);
        setMessage('Parsing failed: ' + error.message);
        setLoading(false);
      }
    });
  };

  return (
    <div style={{ maxWidth: 500, margin: 'auto', textAlign: 'center' }}>
      <h2>CSV to Supabase Uploader</h2>
      <input type="file" accept=".csv" onChange={handleFileChange} />
      {tableName && <p><strong>Target Table:</strong> {tableName}</p>}
      <br />
      <button onClick={handleUpload} disabled={loading || !file}>
        {loading ? 'Uploading...' : 'Upload to Supabase'}
      </button>
      {message && <p style={{ marginTop: 20 }}>{message}</p>}

      {/* <TableRowCount latestTableName={tableName} /> */}

    </div>
  );
};

export default FileUploader;
