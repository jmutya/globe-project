import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from "recharts";
import * as XLSX from "xlsx";
import supabase from "../../../backend/supabase/supabase";

const TerritoryGraph = () => {
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    fetchAndProcessFiles();
  }, []);

  const fetchAndProcessFiles = async () => {
    try {
      const { data: files, error } = await supabase.storage
        .from("uploads")
        .list("excels");
      if (error) throw error;

      let territoryCounts = {};

      for (const file of files) {
        const { data: fileUrl } = supabase.storage
          .from("uploads")
          .getPublicUrl(`excels/${file.name}`);
        const response = await fetch(fileUrl.publicUrl);
        const blob = await response.arrayBuffer();
        const workbook = XLSX.read(blob, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
          header: 1,
        });

        if (sheet.length > 1) {
          const headers = sheet[0];
          const territoryIndex = headers.indexOf("Territory");

          if (territoryIndex === -1) {
            continue;
          }

          sheet.slice(1).forEach((row) => {
            const territory = String(row[territoryIndex] || "").trim();
            if (territory) {
              territoryCounts[territory] =
                (territoryCounts[territory] || 0) + 1;
            }
          });
        }
      }

      const formattedData = Object.entries(territoryCounts).map(
        ([category, count], index) => ({
          category,
          count,
          fill: colors[index % colors.length], // Assign different colors
        })
      );

      setChartData(formattedData);
    } catch (error) {
      console.error("Error fetching or processing files:", error);
    }
  };

  const colors = [
    "#ff6384",
    "#36a2eb",
    "#ffce56",
    "#4bc0c0",
    "#9966ff",
    "#ff9f40",
    "#8b0000",
    "#008000",
  ];

  return (
    <div
      className="p-4 bg-white shadow-lg rounded-lg"
      style={{ maxHeight: "400px" }}
    >
      <h2 className="text-lg font-semibold mb-2">Territory Distribution</h2>
      {chartData.length > 0 ? (
        <ResponsiveContainer width="50%" height={300}>
          <BarChart data={chartData} layout="horizontal" barSize={50}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" type="category" />
            <YAxis type="number" allowDecimals={false} />
            <Tooltip />
            <Legend
              payload={chartData.map((entry) => ({
                value: "Territory - " + entry.category,
                type: "square",
                color: entry.fill,
              }))}
            />
            <Bar dataKey="count">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-gray-600">Waiting for data to load</p>
      )}
    </div>
  );
};

export default TerritoryGraph;
