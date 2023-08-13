import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle, faToggleOn, faToggleOff, faPenSquare, faCheckSquare } from '@fortawesome/free-solid-svg-icons';
import Modal from './Modal';
import './App.css';
import { getCourses, getGroups, getEnrolledStudents } from './moodleAPI';
import { initializeApp } from "firebase/app";
import firebaseConfig from './firebaseConfig';
import { testFirebaseConnection } from './firebaseTest';
import SphereComponent from './Sphere';
import { getFirestore, doc, setDoc, getDoc,updateDoc } from "firebase/firestore";
import {createLevelWithLessons} from "./levels";
import {createGroupWithStudents} from "./groups"; 
import { setStudentLessonProgress, getStudentLessonProgress } from "./progress.js";

function App() {
  const [editMode, setEditMode] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [lessons, setLessons] = useState(Array.from({ length: 13 }, (_, i) => ({ name: `Lesson ${i + 1}`, editing: false })));
  const [completedLessons, setCompletedLessons] = useState(0);
  const [editingValue, setEditingValue] = useState("");
  const [levels, setLevels] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [students, setStudents] = useState([]);

  useEffect(() => {
    loadLevels();
    testFirebaseConnection();
  }, []);

  const loadLevels = async () => {
    const courses = await getCourses();
    console.log("All Courses:", courses.courses); // Print all courses
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

  const loadStudents = async (courseId) => {
    const students = await getEnrolledStudents(courseId);
    console.log("Students Response:", students); // Debug the returned data
    setStudents(students);
  };


  const handleLevelChange = async (e) => {
    const courseId = e.target.value;
    setSelectedLevel(courseId);

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
    await loadStudents(selectedLevel); // Pass selectedLevel instead of groupId
  };

  const handleStudentChange = async (e) => {
    const studentId = e.target.value;
    const selectedStudent = students.find(student => student.id == studentId);
  
    console.log("Selected Student:", selectedStudent);
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
        checkbox.checked = lessonsProgress[lessonId] || false; // Set checkbox status based on lesson progress
      });
    }
  };
  
  
  const handleCheckboxChange = async () => {
    const checkboxes = document.querySelectorAll("#lessons input[type='checkbox']");
    const checkedLessons = Array.from(checkboxes).filter(checkbox => checkbox.checked).length;
    setCompletedLessons(checkedLessons);
  
    const studentId = document.getElementById('student-name').dataset.id;
  
    if (studentId) {
      const studentRef = doc(db, "groups", selectedGroup, "students", studentId);
      const lessonProgress = {};
  
      checkboxes.forEach((checkbox, index) => {
        const lessonId = `lesson${index + 1}`;
        lessonProgress[lessonId] = checkbox.checked;
      });
  
      // Update student progress in Firestore
      await updateDoc(studentRef, { completedLessons: checkedLessons, lessonsProgress: lessonProgress });
      console.log("Firestore update complete");
      console.log("Updated Completed Lessons:", checkedLessons);
    }
  };
  
  

  const startEditing = (i) => {
    setEditingValue(lessons[i].name);
    setLessons(lessons.map((lesson, j) => j === i ? { ...lesson, editing: true } : lesson));
  }

  const endEditing = (i) => {
    setLessons(lessons.map((lesson, j) => j === i ? { ...lesson, editing: false, name: editingValue } : lesson));
  }

  const addLesson = (lesson) => {
    setLessons([...lessons, { name: lesson, editing: false }]);
    setModalVisible(false);
  }

  const lessonCheckboxes = lessons.map((lesson, i) => (
    <div key={i}>
      <input type="checkbox" id={`lesson${i}`} onChange={handleCheckboxChange} />
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
        <label htmlFor={`lesson${i}`}>{lesson.name}</label>
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

  return (
    <div className="App">
      <div className="header">
        <h1 id="student-name">Select a Student</h1>
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
        <div className="edit-mode-toggle" onClick={() => setEditMode(!editMode)}>
          <span className="toggle-label">Edit mode</span> 
          <FontAwesomeIcon icon={editMode ? faToggleOn : faToggleOff} />
        </div>
      </div>
      {selectedLevel && selectedLevel !== "Select Level" ? (
        <>
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
          </div>
          {editMode && (
            <div className="add-lesson" onClick={() => setModalVisible(true)}>
              <FontAwesomeIcon icon={faPlusCircle} />
            </div>
          )}
          <Modal visible={modalVisible} onClose={() => setModalVisible(false)} onSubmit={addLesson} />
          <div id="lessons">
            {lessonCheckboxes}
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
