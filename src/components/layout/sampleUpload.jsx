import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import supabase from './../../backend/supabase/supabase'; // your Supabase client

const ExcelUploader = () => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [tableName, setTableName] = useState("RSCMIN_Table"); // Default table name

  const CHUNK_SIZE = 100; // You can adjust this depending on your limits

  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;
  
    setFile(uploadedFile);
    setIsUploading(true);
  
    try {
      const rows = await parseExcelFile(uploadedFile);
  
      if (rows.length === 0) {
        alert('No data found in the Excel file.');
        return;
      }
  
      await createTableFromExcel(rows);
  
      // Step 1: Extract Numbers from Excel
      const numbersInExcel = rows.map(row => row.Number).filter(Boolean);
      
      // Step 2: Fetch existing numbers in chunks
      const existingNumbersSet = new Set();
      for (let i = 0; i < numbersInExcel.length; i += CHUNK_SIZE) {
        const chunk = numbersInExcel.slice(i, i + CHUNK_SIZE);
        const { data, error } = await supabase
          .from(tableName)
          .select('Number')
          .in('Number', chunk);
  
        if (error) throw error;
  
        data.forEach(row => existingNumbersSet.add(row.Number));
      }
  
      // Step 3: Filter new rows
      const newRows = rows.filter(row => !existingNumbersSet.has(row.Number));
  
      if (newRows.length === 0) {
        setUploadResult('All rows already exist based on the "Number" field. Nothing to insert.');
        return;
      }
  
      // Step 4: Insert new rows in chunks
      for (let i = 0; i < newRows.length; i += CHUNK_SIZE) {
        const chunk = newRows.slice(i, i + CHUNK_SIZE);
        const { error } = await supabase.from(tableName).insert(chunk);
        if (error) throw error;
      }
  
      setUploadResult(`Inserted ${newRows.length} new rows to table "${tableName}"!`);
    } catch (error) {
      alert('Error uploading file: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };
  
  

  // Function to parse Excel file into JSON rows
  const parseExcelFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: null });
          resolve(jsonData);
        } catch (error) {
          reject('Failed to parse Excel file: ' + error.message);
        }
      };

      reader.readAsArrayBuffer(file); // 📄 use ArrayBuffer (more reliable)
    });
  };

  // Function to dynamically create a table in Supabase with "database_id" as primary key
  const createTableFromExcel = async (rows) => {
    try {
      const tableName = 'RSCMIN_Table'; // Define your table name
      const headers = Object.keys(rows[0]); // Get headers (keys of the first row)
  
      // Step 1: Get existing columns (if the table exists)
      const { data: existingColumns, error: fetchError } = await supabase.rpc('get_table_columns', {
        table_name_input: tableName
      });
  
      if (fetchError) throw fetchError;
  
      // Step 2: Create table if it doesn't exist
      if (existingColumns.length === 0) {
        const columns = [`database_id UUID PRIMARY KEY DEFAULT gen_random_uuid()`]
          .concat(headers.map(header => `"${header}" TEXT`))
          .join(', ');
  
        const { error: createError } = await supabase.rpc('create_table_function', {
          table_name: tableName,
          columns: columns
        });
  
        if (createError) throw createError;
        console.log(`Table "${tableName}" created successfully with primary key "database_id"!`);
  
        // Step 3: Grant permissions after creation
        const grantSQL = `GRANT ALL PRIVILEGES ON TABLE public."${tableName}" TO service_role;`;
        const { error: grantError } = await supabase.rpc('run_dynamic_sql', { sql: grantSQL });
        if (grantError) throw grantError;
        console.log(`Granted all privileges to service_role on "${tableName}"`);
  
      } else {
        // Step 4: Table exists, check and add missing columns
        const existingColumnNames = existingColumns.map(col => col.column_name);
  
        for (const header of headers) {
          if (!existingColumnNames.includes(header)) {
            const alterSQL = `ALTER TABLE "${tableName}" ADD COLUMN "${header}" TEXT;`;
            const { error: alterError } = await supabase.rpc('run_dynamic_sql', { sql: alterSQL });
            if (alterError) throw alterError;
            console.log(`Added missing column "${header}" to table "${tableName}".`);
          }
        }
  
        // Step 5: Grant permissions after adding columns
        const grantSQL = `GRANT ALL PRIVILEGES ON TABLE public."${tableName}" TO service_role;`;
        const { error: grantError } = await supabase.rpc('run_dynamic_sql', { sql: grantSQL });
        if (grantError) throw grantError;
        console.log(`Granted all privileges to service_role on "${tableName}"`);
      }
    } catch (error) {
      console.error('Error creating or updating table:', error);
      throw new Error('Error creating or updating table: ' + error.message);
    }
  };
  

  return (
    <div>
      <input
        type="file"
        accept=".xlsx"
        onChange={handleFileUpload}
        disabled={isUploading}
      />
      {isUploading && <p>Uploading...</p>}
      {uploadResult && <p>{uploadResult}</p>}
    </div>
  );
};

export default ExcelUploader;


