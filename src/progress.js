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
