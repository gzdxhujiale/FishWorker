import React from 'react';

export const EmptyState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="text-gray-400 mb-4">
        <svg
          width="120"
          height="120"
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="mx-auto"
        >
          <path
            d="M30 45C30 36.7157 36.7157 30 45 30H75C83.2843 30 90 36.7157 90 45V75C90 83.2843 83.2843 90 75 90H45C36.7157 90 30 83.2843 30 75V45Z"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="8 8"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-700 mb-2">你这一天没有习惯</h3>
    </div>
  );
};
