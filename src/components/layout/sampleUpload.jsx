import React, { useState } from 'react';
import supabase from './../../backend/supabase/supabase'; // your Supabase client

const FileUploader = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [csvContent, setCsvContent] = useState(null);

  const bucketName = 'uploads'; // your bucket name

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setUploadResult(null);
    setFileUrl(null);
    setCsvContent(null);
    if (selectedFile) {
      console.log('Selected file:', selectedFile.name, selectedFile.type);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file first!');
      return;
    }

    setUploading(true);

    // Unique file path with timestamp prefix to avoid collisions
    const filePath = `uploads/${Date.now()}_${file.name}`;

    try {
      // Upload the file to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Upload error:', error);
        alert('Upload error: ' + error.message);
        setUploading(false);
        return;
      }

      setUploadResult(`File uploaded successfully! Path: ${data.path}`);

      // Create a signed URL valid for 1 hour (3600 seconds)
      const { signedURL, error: signError } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(data.path, 3600);

      if (signError) {
        console.error('Signed URL error:', signError);
        alert('Error creating signed URL: ' + signError.message);
      } else {
        setFileUrl(signedURL);
      }

    } catch (error) {
      console.error('Unexpected error during upload:', error);
      alert('Unexpected error: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const fetchCSVContent = async () => {
    console.log('Fetching CSV from URL:', fileUrl);
    if (!fileUrl) {
      alert('No file URL to fetch!');
      return;
    }
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error('Network response was not ok');
      const text = await response.text();
      setCsvContent(text);
      console.log('CSV content:', text);
      alert('CSV content fetched! Check the console or textarea below.');
    } catch (error) {
      alert('Failed to fetch CSV: ' + error.message);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '20px auto', textAlign: 'center' }}>
      <input
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFileChange}
        disabled={uploading}
        style={{ marginBottom: 12 }}
      />
      <br />
      <button onClick={handleUpload} disabled={uploading || !file}>
        {uploading ? 'Uploading...' : 'Upload'}
      </button>

      {uploadResult && <p style={{ marginTop: 20 }}>{uploadResult}</p>}

      {fileUrl && (
        <>
          <p>
            File URL: <br />
            <a href={fileUrl} target="_blank" rel="noopener noreferrer">{fileUrl}</a>
          </p>
          <button onClick={fetchCSVContent}>Fetch CSV Content</button>
        </>
      )}

      {csvContent && (
        <textarea
          readOnly
          value={csvContent}
          rows={10}
          style={{ width: '100%', marginTop: 20 }}
        />
      )}
    </div>
  );
};

export default FileUploader;
