import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle, faToggleOn, faToggleOff, faPenSquare, faCheckSquare } from '@fortawesome/free-solid-svg-icons';
import Modal from './Modal';
import './App.css';
import { getCourses, getGroups, getStudentsInGroup, getEnrolledStudents } from './moodleAPI';
import { initializeApp } from "firebase/app";
import firebaseConfig from './firebaseConfig';
import { testFirebaseConnection } from './firebaseTest';
import SphereComponent from './Sphere';
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, getDocs, writeBatch } from "firebase/firestore";
import { createOrUpdateGroup, createOrUpdateStudent } from './groups'; // Import the helper functions

function App() {
  const [editMode, setEditMode] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [lessons, setLessons] = useState([]);
  const [completedLessons, setCompletedLessons] = useState(0);
  const [editingValue, setEditingValue] = useState("");
  const [levels, setLevels] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [students, setStudents] = useState([]);

  const levelMapping = {
    "6": "A1",
    "7": "A2",
    "9": "B1",
    "14": "B2",
    "15": "C1"
  };
  const createOrUpdateFirebaseStructure = async () => {
    // Loop over all levels
    for (const level of levels) {
        const moodleGroups = await getGroups(level.id); // Get groups for the current level from Moodle
    
        for (const group of moodleGroups) {
            await createOrUpdateGroup(group.id, group.name);
    
            const moodleStudents = await getEnrolledStudents(level.id);
            for (const student of moodleStudents) {
                if (student.roles.some((role) => role.shortname === 'student')) { // Making sure it's a student
                    await createOrUpdateStudent(group.id, student.id, student.fullname);
                }
            }
        }
    }
};

  useEffect(() => {
    loadLevels();
    testFirebaseConnection();
  }, []);

// This function will mark a lesson as completed for the entire group.
const markLessonForGroup = async (groupId, lessonId, isChecked) => {
  const groupRef = doc(db, "groups", groupId);
  const studentsCollectionRef = collection(groupRef, "students");
  const studentsSnap = await getDocs(studentsCollectionRef);

  // 1. Create a new batch
  const batch = writeBatch(db);

  for (const studentDoc of studentsSnap.docs) {
    const studentData = studentDoc.data();
    const lessonsProgress = studentData.lessonsProgress || {};

    // If the document doesn't exist, create it
    if (!studentDoc.exists()) {
      batch.set(doc(studentsCollectionRef, studentDoc.id), {
        fullname: studentData.fullname,
        completedLessons: 0,
        lessonsProgress: {}
      });
    }

    // Update if the lesson state is different than the desired state
    if (lessonsProgress[lessonId]?.checked !== isChecked) {
      lessonsProgress[lessonId] = { checked: isChecked, timestamp: new Date().toISOString() };
      
      // 2. Batch the updates instead of updating one by one
      batch.update(doc(studentsCollectionRef, studentDoc.id), { lessonsProgress });

      // Update student's progress percentage here
      const completedLessonsCount = Object.values(lessonsProgress).filter(progress => progress.checked).length;
      batch.update(doc(studentsCollectionRef, studentDoc.id), { completedLessons: completedLessonsCount });
    }
  }

  // 3. Commit the batch
  await batch.commit();
};

  const fetchLessonsForLevel = async (levelId) => {
    const mappedLevelId = levelMapping[levelId];
    if (!mappedLevelId) {
      console.error("Invalid level ID:", levelId);
      return;
    }

    const levelRef = doc(db, "levels", `level${mappedLevelId}`);
    const levelSnap = await getDoc(levelRef);

    if (levelSnap.exists()) {
      const lessonsData = levelSnap.data().lessons || [];
      setLessons(lessonsData.map(lesson => ({ name: lesson.name, editing: false })));
    } else {
      console.error("The level document does not exist.");
    }
  }

  const loadLevels = async () => {
    const courses = await getCourses();
    // Filter the courses based on the shortname
    const validCourseIdentifiers = ["A1", "A2", "B1", "B2", "C1"];
    const filteredCourses = courses.courses.filter(course => {
      return validCourseIdentifiers.some(identifier => course.shortname.includes(identifier));
    });

    setLevels(filteredCourses);
  };
  

  const loadGroups = async (courseId) => {
    const groups = await getGroups(courseId);
    setGroups(groups);
  };

  const loadStudents = async (groupId) => {
    console.log("Group ID:", groupId);
    const groupResponse = await getStudentsInGroup([groupId]);
    const userIds = groupResponse[0].userids;

    // Get all enrolled students in the course (level)
    const allEnrolledUsers = await getEnrolledStudents(selectedLevel);

    // Check if allEnrolledUsers is an array before proceeding
    if (Array.isArray(allEnrolledUsers)) {
      // Filter users who have the student role
      const allEnrolledStudents = allEnrolledUsers.filter((user) => {
        return user.roles.some((role) => role.shortname === 'student'); // Adjust based on your role setup
      });

      // Filter the students that are part of the selected group
      const studentsInGroup = allEnrolledStudents.filter(student => userIds.includes(student.id));
      setStudents(studentsInGroup);
    } else {
      console.error("Expected allEnrolledUsers to be an array, but received:", allEnrolledUsers);
    }
  };

  const updateGroupProgress = async (groupId) => {
    const groupRef = doc(db, "groups", groupId);
    const groupSnap = await getDoc(groupRef);
    let groupData = {};
  
    if (groupSnap.exists()) {
      groupData = groupSnap.data();
    } else {
      console.error("Group data not found for group:", groupId);
    }
  
    // Get students' collection reference within the group
    const studentsCollectionRef = collection(groupRef, "students");
    const studentsSnap = await getDocs(studentsCollectionRef);
    
    let totalCompletedLessons = 0;
    let totalLessons = lessons.length * studentsSnap.size;
  
    studentsSnap.docs.forEach(studentDoc => {
      totalCompletedLessons += studentDoc.data().completedLessons || 0;
    });
    let maxCompletedLessons = 0;
    let maxLessonStudent = null;
    
    studentsSnap.docs.forEach(studentDoc => {
      const completed = studentDoc.data().completedLessons || 0;
      if (completed >= maxCompletedLessons) {
        maxCompletedLessons = completed;
        maxLessonStudent = studentDoc.data();
      }
    });

    const groupCompletedLessons = totalCompletedLessons;
    const groupLessonsProgress = maxLessonStudent.lessonsProgress;
  
// Inside the updateGroupProgress function, replace the section that builds groupLessonsProgress
lessons.forEach((_, index) => {
  const lessonId = `lesson${index + 1}`;
  let allStudentsChecked = true;
  let anyStudentChecked = false;

  studentsSnap.docs.forEach(studentDoc => {
    const studentLessonProgress = studentDoc.data().lessonsProgress || {};
    if (studentLessonProgress[lessonId]?.checked) {
      anyStudentChecked = true;
    } else {
      allStudentsChecked = false;
    }
  });

  if (allStudentsChecked) {
    groupLessonsProgress[lessonId] = { checked: true };
  } else if (anyStudentChecked) {
    groupLessonsProgress[lessonId] = maxLessonStudent.lessonsProgress[lessonId];
  } else {
    groupLessonsProgress[lessonId] = { checked: false };
  }
});
  
    await updateDoc(groupRef, {
      groupCompletedLessons,
      groupLessonsProgress
    });
    
  };
  
  const handleLevelChange = async (e) => {
    const courseId = e.target.value;
    setSelectedLevel(courseId);
    await fetchLessonsForLevel(courseId);
    if (courseId === "Select Level") { // If the value is "Select Level", reset groups and students
      setGroups([]);
      setStudents([]);
      setSelectedGroup(null);
    } else {
      await loadGroups(courseId);
      setSelectedGroup(null);
      setStudents([]);
    }
  };

  const handleGroupChange = async (e) => {
    const groupId = e.target.value;
    setSelectedGroup(groupId);
    if (groupId === "Select Group") {
      setStudents([]);
    } else {
      await loadStudents(groupId);
      
      // Fetch group's lesson progress and apply it
      const groupRef = doc(db, "groups", groupId);
      const groupSnap = await getDoc(groupRef);
      if (groupSnap.exists()) {
        const groupData = groupSnap.data();
        const groupLessonsProgress = groupData.groupLessonsProgress || {};
        const checkboxes = document.querySelectorAll("#lessons input[type='checkbox']");
        checkboxes.forEach((checkbox) => {
          checkbox.checked = groupLessonsProgress[checkbox.id]?.checked || false;
        });
        const checkedLessonsCount = Array.from(checkboxes).filter(checkbox => checkbox.checked).length;
        setCompletedLessons(checkedLessonsCount);
      }
    }
};

  const handleStudentChange = async (e) => {
    const studentId = e.target.value;
    const selectedStudent = students.find(student => student.id == studentId);
    if (selectedStudent) {
      const h1 = document.getElementById('student-name');
      h1.innerText = selectedStudent.fullname;
      h1.dataset.id = selectedStudent.id;

      // Reference to the student's document
      const studentRef = doc(db, "groups", selectedGroup, "students", studentId);

      // Fetch the document
      const studentSnap = await getDoc(studentRef);

      let completedLessons = 0;
      let lessonsProgress = {}; // Define lessonsProgress variable here

      // Create the document if it doesn't exist
      if (!studentSnap.exists()) {
        await setDoc(studentRef, { fullname: selectedStudent.fullname, completedLessons, lessonsProgress });
      } else {
        completedLessons = studentSnap.data().completedLessons || 0;
        lessonsProgress = studentSnap.data().lessonsProgress || {};
      }

      setCompletedLessons(completedLessons);

      const checkboxes = document.querySelectorAll("#lessons input[type='checkbox']");

      checkboxes.forEach((checkbox, index) => {
        const lessonId = `lesson${index + 1}`;
        const timestampSpan = document.getElementById(`timestamp-lesson${index + 1}`);
        const progress = lessonsProgress[lessonId] || { checked: false };

        checkbox.checked = progress.checked;

        // Update the displayed timestamp
        if (timestampSpan) {
          if (progress.checked && progress.timestamp) {
            const date = new Date(progress.timestamp);
            const formattedTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')} (${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}) -`;
            timestampSpan.textContent = formattedTime;
            timestampSpan.classList.add('timestamp');
          } else {
            timestampSpan.textContent = '';
          }
        }
      });
    }
  };

  const handleCheckboxChange = async (event) => {
    const targetCheckbox = event.target;
    const lessonId = targetCheckbox.id;
  
    // Check if you are in 'group view' with no students FIRST
    if (selectedGroup && !students.length) { 
      alert("There are no students in this group");
      event.preventDefault(); // Prevent the checkbox from being checked
      return;
    }
  
    const lessonIndex = parseInt(lessonId.replace('lesson', '')) - 1; // Extract index from id
    const timestampSpan = document.getElementById(`timestamp-lesson${lessonIndex + 1}`);
  
    // Then handle the timestamp update
    if (!timestampSpan.dataset.checked || timestampSpan.dataset.checked !== targetCheckbox.checked.toString()) {
      if (targetCheckbox.checked) {
        const timestamp = new Date();
        const formattedTime = `${String(timestamp.getHours()).padStart(2, '0')}:${String(timestamp.getMinutes()).padStart(2, '0')} (${timestamp.getMonth() + 1}/${timestamp.getDate()}/${timestamp.getFullYear()}) `;
        timestampSpan.dataset.timestamp = timestamp.toISOString();
        timestampSpan.textContent = formattedTime;
        timestampSpan.classList.add('timestamp');
      } else {
        timestampSpan.textContent = '';
        timestampSpan.classList.remove('timestamp');
      }
      timestampSpan.dataset.checked = targetCheckbox.checked;
    }

    const checkboxes = document.querySelectorAll("#lessons input[type='checkbox']");
    const checkedLessons = Array.from(checkboxes).filter(checkbox => checkbox.checked).length;
    setCompletedLessons(checkedLessons);

    const studentId = document.getElementById('student-name').dataset.id;

    if (studentId) {
      const studentRef = doc(db, "groups", selectedGroup, "students", studentId);
      const lessonProgress = {};

      checkboxes.forEach((checkbox, index) => {
        const lessonId = `lesson${index + 1}`;
        const timestampSpan = document.getElementById(`timestamp-${lessonId}`);
        lessonProgress[lessonId] = { checked: checkbox.checked };
        if (timestampSpan && timestampSpan.dataset.timestamp) {
          lessonProgress[lessonId].timestamp = timestampSpan.dataset.timestamp;
        }
      });

      console.log("Updating Firestore with data:", { studentRef, checkedLessons, lessonsProgress: { completedLessons: checkedLessons, lessonsProgress: lessonProgress } });
      // Update student progress in Firestore
      await updateDoc(studentRef, { completedLessons: checkedLessons, lessonsProgress: lessonProgress });
      await updateGroupProgress(selectedGroup);
      
    } else if (selectedGroup && !students.length) { 
      if (!students.length) {
        alert("There are no students in this group");
        event.preventDefault(); // Prevent the checkbox from being checked
        return;
      }
      
      await markLessonForGroup(selectedGroup, lessonId); 
      await updateGroupProgress(selectedGroup);
      const checkboxes = document.querySelectorAll("#lessons input[type='checkbox']");
      const checkedLessonsCount = Array.from(checkboxes).filter(checkbox => checkbox.checked).length;
      setCompletedLessons(checkedLessonsCount);
    }
    
     else if (selectedGroup) { // It's the group view and no student is selected
    // Mark/unmark lesson for the entire group
    await markLessonForGroup(selectedGroup, lessonId, event.target.checked); 
    await updateGroupProgress(selectedGroup);
    }
};

  const startEditing = (i) => {
    setEditingValue(lessons[i].name);
    setLessons(lessons.map((lesson, j) => j === i ? { ...lesson, editing: true } : lesson));
  }

  const endEditing = async (i) => {
    const updatedLessons = lessons.map((lesson, j) => j === i ? { ...lesson, editing: false, name: editingValue } : lesson);
    setLessons(updatedLessons);

    // Update lesson names in Firestore if a level is selected
    if (selectedLevel) {
      const mappedLevelId = levelMapping[selectedLevel];
      const levelRef = doc(db, "levels", `level${mappedLevelId}`);
      await updateDoc(levelRef, { lessons: updatedLessons });
    }
  }

  const addLesson = (lesson) => {
    setLessons([...lessons, { name: lesson, editing: false }]);
    setModalVisible(false);
  }

  const lessonCheckboxes = lessons.map((lesson, i) => (
    <div key={i}>
      {selectedGroup || students.length > 0 ? (
        <>
          <span className={lesson.checked ? 'timestamp' : ''} id={`timestamp-lesson${i + 1}`}></span>
          <input type="checkbox" id={`lesson${i + 1}`} onChange={handleCheckboxChange} />
        </>
      ) : null}
      {lesson.editing ? (
        <input
          type="text"
          value={editingValue}
          onChange={(e) => setEditingValue(e.target.value)}
          onBlur={() => endEditing(i)}
          onKeyPress={(event) => event.key === 'Enter' ? endEditing(i) : null}
          autoFocus
        />
      ) : (
        <label htmlFor={`lesson${i + 1}`}>{lesson.name}</label>
      )}
      {editMode && (
        <FontAwesomeIcon
          icon={lesson.editing ? faCheckSquare : faPenSquare}
          onClick={() => lesson.editing ? endEditing(i, document.querySelector(`#lesson${i}`).nextElementSibling.value) : startEditing(i)}
          style={{ color: "#4827ec", marginLeft: "10px" }}
        />
      )}
    </div>
  ));

  const midpoint = Math.ceil(lessons.length / 2);

  const leftLessons = lessonCheckboxes.slice(0, midpoint);
  const rightLessons = lessonCheckboxes.slice(midpoint);
  return (
    <div className="App">
      <div className="header">
        <h1 id="student-name">
          {!selectedLevel ? "Select a Level" :
            !selectedGroup ? "Select a Group" :
              students.length === 0 ? "Select a Student" :
                document.getElementById('student-name')?.innerText}
        </h1>

        <div className="selectors">
          <select onChange={handleLevelChange}>
            <option value="Select Level">Select Level</option>
            {levels && levels.map((level, index) => (
              <option key={index} value={level.id}>{level.fullname}</option>
            ))}
          </select>

          {selectedLevel && (
            <select onChange={handleGroupChange}>
              <option>Select Group</option>
              {groups && groups.map((group, index) => (
                <option key={index} value={group.id}>{group.name}</option>
              ))}
            </select>
          )}
          {selectedGroup && (
            <select onChange={handleStudentChange}>
              <option>Select Student</option>
              {students && students.map((student, index) => (
                <option key={index} value={student.id}>{student.fullname}</option>
              ))}
            </select>
          )}
        </div>
        {editMode && (
        <button onClick={createOrUpdateFirebaseStructure}>Update Firebase Structure</button>
        )}
        <div className="edit-mode-toggle" onClick={() => setEditMode(!editMode)}>
          <span className="toggle-label">Edit mode</span>
          <FontAwesomeIcon icon={editMode ? faToggleOn : faToggleOff} />
        </div>
      </div>
      {selectedLevel ? (
        <>
          {(selectedGroup || students.length > 0) && (
            <div className="progress">
              <svg id="progress-circle" viewBox="0 0 36 36">
                <path className="circle-bg" d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path id="circle" className="circle" strokeDasharray={`${(completedLessons / lessons.length) * 100}, 100`} d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <h2 id="progress-percent">{parseFloat(((completedLessons / lessons.length) * 100).toFixed(1))}%</h2>
            </div>)}
          {editMode && (
            <div className="add-lesson" onClick={() => setModalVisible(true)}>
              <FontAwesomeIcon icon={faPlusCircle} />
            </div>
          )}
          <Modal visible={modalVisible} onClose={() => setModalVisible(false)} onSubmit={addLesson} />
          <div id="lessons" className="lesson-columns">
            <div className="lesson-container">
              <div className="lesson-column">
                {leftLessons}
              </div>
              <div className="lesson-column">
                {rightLessons}
              </div>
            </div>
          </div>

        </>
      ) : (
        <SphereComponent />
      )}
    </div>
  );

}
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
export default App;