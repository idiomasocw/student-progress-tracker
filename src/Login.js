import React, { useState } from 'react';
import axios from 'axios';
import './App.css';
import { useNavigate } from 'react-router-dom';

function Login({ onLoginSuccess }) {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const MOODLE_URL = "https://idiomas.onecultureworld.com";
    const STATIC_TOKEN = '1aacb7dff134ed1dc86d0c06f4f956c8'; // our static token

    const verifyUserCredentials = async () => {
        console.log("verifyUserCredentials function has been called.");
        const criteria = [];

        // Identify whether the input is a username or an email
        if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(username)) {
            criteria.push({ key: 'email', value: username });
        } else {
            criteria.push({ key: 'username', value: username });
        }

        try {
            const response = await axios.get(`${MOODLE_URL}/webservice/rest/server.php`, {
                params: {
                    wstoken: STATIC_TOKEN,
                    wsfunction: 'core_user_get_users',
                    moodlewsrestformat: 'json',
                    criteria: criteria
                }
            });

            console.log("Verification response:", response.data);

            if (response.data && response.data.users && response.data.users.length > 0) {
                const user = response.data.users[0];
                // List of desired course IDs
                const desiredCourseIDs = [6, 7, 9, 14, 15];
                // List of desired roles
                const desiredRoles = ['manager', 'editingteacher', 'teacher'];

                for (let courseId of desiredCourseIDs) {
                    const enrolledUsersResponse = await axios.get(`${MOODLE_URL}/webservice/rest/server.php`, {
                        params: {
                            wstoken: STATIC_TOKEN,
                            wsfunction: 'core_enrol_get_enrolled_users',
                            courseid: courseId,
                            moodlewsrestformat: 'json'
                        }
                    });
                    const userInCourse = enrolledUsersResponse.data.find(u => u.id === user.id);
                    if (userInCourse) {
                        console.log("Roles found for user in course:", courseId, userInCourse.roles.map(r => r.shortname).join(", "));
                        console.log(`User found in course ${courseId}`, userInCourse);
                        if (userInCourse.roles.some(role => desiredRoles.includes(role.shortname))) {
                            user.roles = userInCourse.roles;
                            return user;
                        } else {
                            console.log(`User doesn't have any of the desired roles in course ${courseId}`);
                        }
                    } else {
                        console.log(`User not found in course ${courseId}`);
                    }
                }
            }
            console.log("Exiting verifyUserCredentials without finding a valid user-role-course match.");
            return null;

        } catch (error) {
            console.error("Error verifying user credentials:", error);
            return null;
        }
    };


    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const user = await verifyUserCredentials();

            if (user) {
                console.log("User verified:", user);
                console.log("About to invoke onLoginSuccess");  // <-- Add this line
                onLoginSuccess(STATIC_TOKEN, user.roles, navigate); // send roles or other user info if needed
            } else {
                console.error("Invalid credentials or user not found");
                alert("Invalid user or password")
            }

        } catch (error) {
            console.error("Login error:", error);
        }
    };

    return (
        <div className='form-wrapper'>
            <div className='login-card'>
                <form onSubmit={handleSubmit}>
                    <input type="text" placeholder="Username or Email" value={username} onChange={e => setUsername(e.target.value)} />
                    <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
                    <button type="submit">Login</button>
                </form>
            </div>
        </div>
    );
}

export default Login;

