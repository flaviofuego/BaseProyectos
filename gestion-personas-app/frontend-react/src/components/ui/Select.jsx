import { forwardRef } from 'react';
import { clsx } from 'clsx';

const Select = forwardRef(({
  label,
  error,
  helpText,
  options = [],
  placeholder,
  className,
  required,
  children,
  ...props
}, ref) => {
  const selectId = props.id || `select-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="space-y-1">
      {label && (
        <label 
          htmlFor={selectId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label} {required && <span className="text-red-500" aria-label="campo requerido">*</span>}
        </label>
      )}
      
      <select
        ref={ref}
        id={selectId}
        className={clsx(
          'block w-full px-3 py-2 border rounded-md shadow-sm transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent',
          error 
            ? 'border-red-500 text-red-900 dark:text-red-100 focus:ring-red-500 bg-red-50 dark:bg-red-900/20' 
            : 'border-gray-300 dark:border-gray-700 focus:ring-primary-500',
          'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100',
          'hover:border-gray-400 dark:hover:border-gray-600',
          className
        )}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${selectId}-error` : helpText ? `${selectId}-help` : undefined}
        required={required}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        
        {children || options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {error && (
        <p id={`${selectId}-error`} className="text-sm text-red-600 dark:text-red-400 flex items-center" role="alert">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      
      {helpText && !error && (
        <p id={`${selectId}-help`} className="text-sm text-gray-600 dark:text-gray-400">
          {helpText}
        </p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
