import { clsx } from 'clsx';

const Card = ({ children, className, hover = false, ...props }) => {
  return (
    <div
      className={clsx(
        'bg-white dark:bg-dark-bg-card border border-gray-200 dark:border-dark-border-primary rounded-xl shadow-sm transition-all duration-200',
        hover && 'hover:shadow-md hover:-translate-y-1',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

const CardHeader = ({ children, className, ...props }) => {
  return (
    <div
      className={clsx(
        'px-6 py-4 border-b border-gray-200 dark:border-dark-border-primary bg-gray-50 dark:bg-dark-bg-secondary rounded-t-xl',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

const CardBody = ({ children, className, ...props }) => {
  return (
    <div
      className={clsx('px-6 py-4', className)}
      {...props}
    >
      {children}
    </div>
  );
};

const CardFooter = ({ children, className, ...props }) => {
  return (
    <div
      className={clsx(
        'px-6 py-4 border-t border-gray-200 dark:border-dark-border-primary bg-gray-50 dark:bg-dark-bg-secondary rounded-b-xl',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;
