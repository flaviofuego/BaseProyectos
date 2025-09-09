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
          className="block text-sm font-medium text-gray-700 dark:text-dark-text-primary"
        >
          {label} {required && <span className="text-danger-500">*</span>}
        </label>
      )}
      
      <select
        ref={ref}
        id={selectId}
        className={clsx(
          'block w-full px-3 py-2 border rounded-md shadow-sm transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
          error 
            ? 'border-danger-500 text-danger-900 focus:ring-danger-500' 
            : 'border-gray-300 dark:border-dark-border-primary focus:ring-primary-500',
          'bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary',
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
        <p id={`${selectId}-error`} className="text-sm text-danger-600 dark:text-danger-400">
          {error}
        </p>
      )}
      
      {helpText && !error && (
        <p id={`${selectId}-help`} className="text-sm text-gray-500 dark:text-dark-text-muted">
          {helpText}
        </p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
