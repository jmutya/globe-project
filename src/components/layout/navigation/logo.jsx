import logo from '/src/assets/globe-logo-name.png'; 

const Logo = () => (
  <div className="flex items-center mb-6 border-b border-indigo-400 pb-4">
    <img
      alt="Globe Logo"
      src={logo}
      className="h-16 w-auto filter brightness-0 invert"
    />
  </div>
);

export default Logo;
