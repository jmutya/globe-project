import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/react";

const LogOut = ({ user, handleLogout }) => {
  return (
    <div className="flex items-center space-x-4">
      
       
          <MenuItem>
            {({ active }) => (
              <button
                onClick={handleLogout}
                className={`block w-full px-4 py-2 text-sm text-left text-gray-700 ${active ? "bg-gray-100" : ""}`}
              >
                Logout
              </button>
            )}
          </MenuItem>
       
      
    </div>
  );
};

export default LogOut; // Exporting the component
