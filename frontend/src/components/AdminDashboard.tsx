import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

interface Profile {
    id: string;
    full_name: string;
    role: string;
    updated_at: string;
}

export const AdminDashboard: React.FC = () => {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);

    const roles = ['admin', 'resident', 'manager', 'inspector', 'client'];

    useEffect(() => {
        fetchProfiles();
    }, []);

    const fetchProfiles = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Error fetching profiles:', error);
        } else {
            setProfiles(data || []);
        }
        setLoading(false);
    };

    const handleRoleChange = async (userId: string, newRole: string) => {
        const { error } = await supabase
            .from('user_profiles')
            .update({ role: newRole })
            .eq('id', userId);

        if (error) {
            alert('Error updating role: ' + error.message);
        } else {
            fetchProfiles();
        }
    };

    if (loading) return <div className="loading">Cargando perfiles...</div>;

    return (
        <div className="admin-dashboard glassmorphism">
            <h2>Gestión de Usuarios (Admin)</h2>
            <table className="admin-table">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>ID</th>
                        <th>Rol Actual</th>
                        <th>Acción</th>
                    </tr>
                </thead>
                <tbody>
                    {profiles.map((profile) => (
                        <tr key={profile.id}>
                            <td>{profile.full_name || 'Sin nombre'}</td>
                            <td className="small-text">{profile.id.substring(0, 8)}...</td>
                            <td><span className={`badge-role ${profile.role}`}>{profile.role}</span></td>
                            <td>
                                <select 
                                    value={profile.role} 
                                    onChange={(e) => handleRoleChange(profile.id, e.target.value)}
                                    className="role-selector"
                                >
                                    {roles.map(r => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
