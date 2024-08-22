import React from 'react';

const Loader: React.FC = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-80">
      <div className="relative flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-t-transparent border-cyan-300 rounded-full animate-spin"></div>
        <div className="absolute w-24 h-24 bg-gradient-to-r from-cyan-300 to-transparent rounded-full animate-ping"></div>
      </div>
    </div>
  );
};

export default Loader;
