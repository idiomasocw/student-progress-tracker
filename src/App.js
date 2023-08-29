import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import Login from './Login';
import TeacherView from './TeacherView';
import AdminView from './AdminView';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSignOutAlt } from '@fortawesome/free-solid-svg-icons';

const LogoutButton = ({ onLogout }) => {
    const navigate = useNavigate();
    const handleLogout = () => {
        onLogout();
        navigate('/login');
    };
    return (
        <button className='signoutButton' onClick={handleLogout}>
            <FontAwesomeIcon className='logoutIcon' icon={faSignOutAlt}/>
        </button>
    );
};

function App() {
    const [role, setRole] = useState(localStorage.getItem('role') || null);
    const [teacherCourses] = useState([]);
    
    // Load role from localStorage on mount
    useEffect(() => {
        const storedRole = localStorage.getItem('role');
        console.log('Stored role from local storage:', storedRole);
        if (storedRole) {
            setRole(storedRole);
        }
    }, []);   

    const handleLoginSuccess = (token, roles, navigate) => {
        if (roles.some(r => r.shortname === 'manager')) {
            setRole('admin');
            localStorage.setItem('role', 'admin');
            navigate('/admin');
        } else if (roles.some(r => ['editingteacher', 'teacher'].includes(r.shortname))) {
            setRole('teacher');
            localStorage.setItem('role', 'teacher');
            navigate('/teacher');
        }
    };

    const handleLogout = () => {
        setRole(null);
        localStorage.removeItem('role');
    };

    return (
        <Router>
            <div>
                {role && (
                    <div className='logout-container'>
                        <LogoutButton onLogout={handleLogout} />
                    </div>
                )}
                <Routes>
                    <Route path="/" element={<Navigate to="/login" />} />
                    <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
                    <Route path="/teacher" element={role === 'teacher' ? <TeacherView courses={teacherCourses} /> : <Navigate to="/login" />} />
                    <Route path="/admin" element={role === 'admin' ? <AdminView /> : <Navigate to="/login" />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
