import { clsx } from 'clsx';

const Card = ({ children, className, hover = false, ...props }) => {
  return (
    <div
      className={clsx(
        'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg transition-all duration-300',
        'overflow-hidden backdrop-blur-sm',
        hover && 'hover:shadow-xl hover:shadow-gray-200/20 dark:hover:shadow-gray-900/30 hover:-translate-y-1 hover:border-gray-300 dark:hover:border-gray-600',
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
    <header
      className={clsx(
        'px-6 py-4 border-b border-gray-200 dark:border-gray-700',
        'bg-gray-50/80 dark:bg-gray-800/50 backdrop-blur-sm',
        'rounded-t-xl',
        className
      )}
      {...props}
    >
      {children}
    </header>
  );
};

const CardBody = ({ children, className, ...props }) => {
  return (
    <div
      className={clsx(
        'px-6 py-4',
        'text-gray-700 dark:text-gray-300',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

const CardFooter = ({ children, className, ...props }) => {
  return (
    <footer
      className={clsx(
        'px-6 py-4 border-t border-gray-200 dark:border-gray-700',
        'bg-gray-50/80 dark:bg-gray-800/50 backdrop-blur-sm',
        'rounded-b-xl',
        className
      )}
      {...props}
    >
      {children}
    </footer>
  );
};

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;
