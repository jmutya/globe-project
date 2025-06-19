import React, { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react'; // Optional: icon library
import supabase from '../../backend/supabase/supabase';

const Count = () => {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [count, setCount] = useState(null);
  const [lastProcessed, setLastProcessed] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch tables on mount
  useEffect(() => {
    const fetchTables = async () => {
      const { data, error } = await supabase.rpc('get_user_tables');
      if (!error) {
        setTables(data.map((t) => t.table_name));
        if (data.length > 0) {
          fetchCount(data[data.length - 1].table_name); // Auto-select most recent
        }
      }
    };
    fetchTables();
  }, []);

  // Fetch count of selected table
  const fetchCount = async (table) => {
    setLoading(true);
    setSelectedTable(table);
    const { data, error } = await supabase.rpc('get_table_count', { tbl: table });
    if (!error) {
      setCount(data);
      setLastProcessed(new Date().toLocaleTimeString());
    }
    setLoading(false);
  };

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl shadow-md p-6 w-full max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-500 text-white rounded-full p-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none"
                viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="font-semibold text-lg">TICKET COUNT</h2>
          </div>

          <button
            onClick={() => fetchCount(selectedTable)}
            className="text-gray-500 hover:text-gray-700"
            disabled={loading}
          >
            <RotateCcw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Dropdown */}
        <select
          className="w-full mb-4 border border-gray-300 p-2 rounded"
          value={selectedTable}
          onChange={(e) => fetchCount(e.target.value)}
        >
          <option value="" disabled>Select a table</option>
          {tables.map((table) => (
            <option key={table} value={table}>{table}</option>
          ))}
        </select>

        {/* Count Display */}
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-1">
            (Most Recent File: {selectedTable}.xlsx)
          </p>
          <h1 className="text-4xl font-bold text-blue-700 mb-2">
            {count !== null ? count.toLocaleString() : '...'}
          </h1>
          <p className="text-sm text-gray-500">
            Last processed: {lastProcessed || '--:--:--'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Count;
