import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from "recharts";
import * as XLSX from "xlsx";
import supabase from "../../../backend/supabase/supabase";

const TerritoryGraph = () => {
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    fetchAndProcessFiles();
  }, []);

  const fetchAndProcessFiles = async () => {
    try {
      const { data: files, error } = await supabase.storage.from("uploads").list("excels");
      if (error) throw error;

      let territoryCounts = {};

      for (const file of files) {
        const { data: fileUrl } = supabase.storage.from("uploads").getPublicUrl(`excels/${file.name}`);
        const response = await fetch(fileUrl.publicUrl);
        const blob = await response.arrayBuffer();
        const workbook = XLSX.read(blob, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

        if (sheet.length > 1) {
          console.log("Detected Headers:", sheet[0]);
          const headers = sheet[0];
          const territoryIndex = headers.indexOf("Territory");

          if (territoryIndex === -1) {
            console.warn("Territory column not found in the file.");
            continue;
          }

          sheet.slice(1).forEach(row => {
            const territory = String(row[territoryIndex] || "").trim();
            if (territory) {
              territoryCounts[territory] = (territoryCounts[territory] || 0) + 1;
            }
          });
          
        }
      }

      console.log("Territory Counts:", territoryCounts);

      const formattedData = Object.entries(territoryCounts).map(([category, count], index) => ({
        category,
        count,
        fill: colors[index % colors.length] // Assign different colors
      }));

      setChartData(formattedData);
    } catch (error) {
      console.error("Error fetching or processing files:", error);
    }
  };

  const colors = ["#ff6384", "#36a2eb", "#ffce56", "#4bc0c0", "#9966ff", "#ff9f40", "#8b0000", "#008000"];

  return (
    <div className="p-4 bg-white shadow-lg rounded-lg overflow-auto" style={{ maxHeight: "400px" }}>
      <h2 className="text-lg font-semibold mb-2">Territory Distribution</h2>
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} />
            <YAxis dataKey="category" type="category" width={150} />
            <Tooltip />
            <Legend wrapperStyle={{ position: "relative", marginTop: 20 }} />
            <Bar dataKey="count" fill="#8884d8" name="Territory Count" />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-gray-600">No territory data available</p>
      )}
    </div>
  );
};

export default TerritoryGraph;
