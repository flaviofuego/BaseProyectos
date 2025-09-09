import { useNotifications } from '@/context/NotificationContext';
import NotificationToast from './NotificationToast';

const NotificationManager = () => {
  const { notifications } = useNotifications();

  return (
    <div className="fixed top-5 right-5 z-50 max-w-sm w-full space-y-2">
      {notifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
        />
      ))}
    </div>
  );
};

export default NotificationManager;
