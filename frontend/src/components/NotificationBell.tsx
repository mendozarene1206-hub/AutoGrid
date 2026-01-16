import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Bell } from 'lucide-react';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

interface Notification {
    id: string;
    message: string;
    created_at: string;
    is_read: boolean;
}

export const NotificationBell: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showList, setShowList] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        fetchNotifications();

        // Subscribe to real-time notifications
        const channel = supabase
            .channel('public:notifications')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' },
                (payload) => {
                    setNotifications(prev => [payload.new as Notification, ...prev]);
                    setUnreadCount(prev => prev + 1);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchNotifications = async () => {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (!error && data) {
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.is_read).length);
        }
    };

    const markAsRead = async () => {
        if (unreadCount === 0) return;

        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('is_read', false);

        if (!error) {
            setUnreadCount(0);
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        }
    };

    return (
        <div className="notification-container">
            <div className="bell-icon" onClick={() => { setShowList(!showList); markAsRead(); }}>
                <Bell size={24} />
                {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
            </div>

            {showList && (
                <div className="notification-list glassmorphism">
                    <h3>Notificaciones</h3>
                    {notifications.length === 0 ? (
                        <p className="empty-text">No hay notificaciones</p>
                    ) : (
                        notifications.map(n => (
                            <div key={n.id} className={`notification-item ${!n.is_read ? 'unread' : ''}`}>
                                <p>{n.message}</p>
                                <span className="time">{new Date(n.created_at).toLocaleTimeString()}</span>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};
