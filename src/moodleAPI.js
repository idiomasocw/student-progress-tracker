const MOODLE_URL = 'https://idiomas.onecultureworld.com/webservice/rest/server.php';
const TOKEN = '1aacb7dff134ed1dc86d0c06f4f956c8';

const fetchFromMoodle = async (functionName, params = {}) => {
  params.wstoken = TOKEN;
  params.wsfunction = functionName;
  params.moodlewsrestformat = 'json';

  const queryString = Object.keys(params)
      .map((key) => Array.isArray(params[key]) 
          ? params[key].map((value, index) => `${key}[${index}]=${value}`).join('&') 
          : `${key}=${params[key]}`)
      .join('&');

  const response = await fetch(`${MOODLE_URL}?${queryString}`);

  // Capture and log the raw response for debugging
  const rawResponse = await response.text();
  console.log("Raw response from Moodle for function:", functionName, rawResponse);

  if (response.headers.get('Content-Type').includes('application/json')) {
      return JSON.parse(rawResponse);
  } else {
      console.error("Moodle API returned a non-JSON response:", rawResponse);
      throw new Error("Moodle API returned a non-JSON response");
  }
};

export const getCourses = () => fetchFromMoodle('core_course_search_courses', { criterianame: 'search', criteriavalue: '' });
export const getGroups = (courseId) => fetchFromMoodle('core_group_get_course_groups', { courseid: courseId });
export const getEnrolledStudents = (courseId) => fetchFromMoodle('core_enrol_get_enrolled_users', { courseid: courseId });
export const getStudentsInGroup = (groupIds) => {
  console.log("Group IDs sent to Moodle:", groupIds);
  return fetchFromMoodle('core_group_get_group_members', { groupids: groupIds });
};

export const getUserToken = async (username, password) => {
  const response = await fetch(`${MOODLE_URL}`, {
      method: 'POST',
      headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `username=${username}&password=${password}&service=moodle_mobile_app`
  });

  const rawResponse = await response.text();
  console.log("Raw response for getToken:", rawResponse);

  if (response.headers.get('Content-Type').includes('application/json')) {
      return JSON.parse(rawResponse);
  } else {
      console.error("Failed to get user token. Moodle returned a non-JSON response:", rawResponse);
      throw new Error("Failed to get user token. Moodle returned a non-JSON response");
  }
};