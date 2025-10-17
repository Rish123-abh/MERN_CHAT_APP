{/* Loader Component */}
const Loader = () => {
  return (
    <div className="flex flex-col justify-center items-center h-full">
      <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin">
      </div>
      <p className="text-black">Loading Messages...</p>
    </div>
  );
};

export default Loader;
