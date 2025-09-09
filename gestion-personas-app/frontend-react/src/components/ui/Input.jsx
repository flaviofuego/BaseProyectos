import { forwardRef } from 'react';
import { clsx } from 'clsx';

const Input = forwardRef(({
  type = 'text',
  label,
  error,
  helpText,
  className,
  required,
  ...props
}, ref) => {
  const inputId = props.id || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="space-y-1">
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 dark:text-dark-text-primary"
        >
          {label} {required && <span className="text-danger-500">*</span>}
        </label>
      )}
      
      <input
        ref={ref}
        type={type}
        id={inputId}
        className={clsx(
          'block w-full px-3 py-2 border rounded-md shadow-sm transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
          error 
            ? 'border-danger-500 text-danger-900 placeholder-danger-300 focus:ring-danger-500' 
            : 'border-gray-300 dark:border-dark-border-primary focus:ring-primary-500',
          'bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary',
          'placeholder:text-gray-500 dark:placeholder:text-dark-text-muted',
          className
        )}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${inputId}-error` : helpText ? `${inputId}-help` : undefined}
        required={required}
        {...props}
      />
      
      {error && (
        <p id={`${inputId}-error`} className="text-sm text-danger-600 dark:text-danger-400">
          {error}
        </p>
      )}
      
      {helpText && !error && (
        <p id={`${inputId}-help`} className="text-sm text-gray-500 dark:text-dark-text-muted">
          {helpText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
