import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const SearchBar = () => {
  const [query, setQuery] = useState(""); // State to manage the search query
  const navigate = useNavigate(); // Hook to navigate between pages

  // Handle search input change
  const handleSearchChange = (e) => {
    setQuery(e.target.value);
  };

  // Handle search form submission (redirecting based on query)
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (query) {
      // Navigate to the search results page with the query as a parameter
      navigate(`/search?query=${query}`);
    }
  };

  return (
    <form onSubmit={handleSearchSubmit} className="w-full">
      <input
        type="search"
        placeholder="Search"
        value={query} // Controlled input
        onChange={handleSearchChange} // Handle input change
        className="px-4 py-2 border border-gray-300 rounded-md shadow-md w-1/3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </form>
  );
};

export default SearchBar;
