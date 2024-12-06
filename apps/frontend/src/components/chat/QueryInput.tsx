import React from 'react';

interface QueryInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled: boolean;
}

export function QueryInput({ value, onChange, onSubmit, disabled }: QueryInputProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex flex-col space-y-2">
        <label htmlFor="query" className="text-sm font-medium text-gray-700">
          Ask about Audius
        </label>
        <input
          id="query"
          type="text"
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder="e.g., What are the trending tracks?"
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
      <button
        type="submit"
        disabled={disabled}
        className="w-full px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        {disabled ? 'Processing...' : 'Ask'}
      </button>
    </form>
  );
} 