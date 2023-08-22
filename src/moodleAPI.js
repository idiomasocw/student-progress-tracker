const MOODLE_URL = 'https://idiomas.onecultureworld.com/webservice/rest/server.php';
const TOKEN = '1aacb7dff134ed1dc86d0c06f4f956c8';

const fetchFromMoodle = async (functionName, params = {}) => {
  params.wstoken = TOKEN;
  params.wsfunction = functionName;
  params.moodlewsrestformat = 'json';

  const queryString = Object.keys(params)
    .map((key) => Array.isArray(params[key]) ? params[key].map((value, index) => `${key}[${index}]=${value}`).join('&') : `${key}=${params[key]}`)
    .join('&');
    
/*     console.log("Query String:", queryString); // Keep this line */

    const response = await fetch(`${MOODLE_URL}?${queryString}`);
    return response.json();
};

export const getCourses = () => fetchFromMoodle('core_course_search_courses', { criterianame: 'search', criteriavalue: '' });
export const getGroups = (courseId) => fetchFromMoodle('core_group_get_course_groups', { courseid: courseId });
export const getEnrolledStudents = (courseId) => fetchFromMoodle('core_enrol_get_enrolled_users', { courseid: courseId });
export const getStudentsInGroup = (groupIds) => {
  console.log("Group IDs sent to Moodle:", groupIds); // Add this line
  return fetchFromMoodle('core_group_get_group_members', { groupids: groupIds });
};



