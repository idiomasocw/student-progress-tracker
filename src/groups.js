import { getFirestore, doc, setDoc, Timestamp } from "firebase/firestore";

const db = getFirestore();

const determineLessonCount = (level) => {
  switch (level) {
    case "A1":
    case "A2":
      return 36;
    case "B1":
    case "B2":
    case "C1":
      return 72;
    default:
      console.error("Invalid level provided:", level);
      return 0;
  }
};

export const createOrUpdateGroup = async (groupId, level) => {
  const groupRef = doc(db, "groups", groupId.toString());
  const lessonCount = determineLessonCount(level);
  
  const groupLessonsProgress = {};
  const currentTime = Timestamp.now();  // Get the current timestamp
  
  for (let i = 1; i <= lessonCount; i++) {
    groupLessonsProgress["lesson" + i] = {
      checked: false,
      timestamp: currentTime  // Assign the current timestamp to each lesson
    };
  }
  
  await setDoc(groupRef, {
    groupCompletedLessons: 0,
    groupLessonsProgress,
    updatedAt: currentTime  // Set the updatedAt field for the group
  }, { merge: true });  // This ensures that existing data isn't overwritten
};

export const createOrUpdateStudent = async (groupId, studentId, fullname) => {
  const studentRef = doc(db, "groups", groupId.toString(), "students", studentId.toString());
  
  await setDoc(studentRef, {
    completedLessons: 0,
    fullname,
    lessonsProgress: {}  // Initially empty, will be populated as students progress
  }, { merge: true });
};
