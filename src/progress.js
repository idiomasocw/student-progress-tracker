import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

const db = getFirestore();

export const setStudentLessonProgress = async (groupId, studentId, lessonId, checkboxStatus) => {
  const progressRef = doc(db, "groups", groupId, "students", studentId, "lessonsProgress", lessonId);
  await setDoc(progressRef, {
    lessonId: lessonId,
    checkboxStatus: checkboxStatus,
    lastUpdated: new Date().toISOString()
  });
  console.log(`Updated progress for student ${studentId} in group ${groupId} for lesson ${lessonId}.`);
};

export const getStudentLessonProgress = async (groupId, studentId) => {
  const progressRef = doc(db, "groups", groupId, "students", studentId, "lessonsProgress");
  const progressSnap = await getDoc(progressRef);

  if (progressSnap.exists()) {
    return progressSnap.data();
  } else {
    console.log("No progress found");
    return null;
  }
};

// Sets lesson progress for all students in a group
export const setGroupLessonProgress = async (groupId, lessonId, checkboxStatus) => {
    // First, fetch all students in the group
    const groupRef = doc(db, "groups", groupId);
    const groupSnap = await getDoc(groupRef);
    const students = groupSnap.data().students;
  
    // Loop through each student and set the lesson progress
    for (const studentId in students) {
      const progressRef = doc(db, "groups", groupId, "students", studentId, "lessonsProgress", lessonId);
      
      // We only update if the lesson is not already checked for the student
      const progressSnap = await getDoc(progressRef);
      if (!progressSnap.exists() || !progressSnap.data().checkboxStatus) {
        await setDoc(progressRef, {
          lessonId: lessonId,
          checkboxStatus: checkboxStatus,
          lastUpdated: new Date().toISOString()
        });
      }
    }
    console.log(`Updated progress for all students in group ${groupId} for lesson ${lessonId}.`);
  };