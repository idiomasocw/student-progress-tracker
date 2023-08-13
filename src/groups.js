import { getGroups, getEnrolledStudents } from './moodleAPI';
import { getFirestore, collection, doc, setDoc } from "firebase/firestore";

const db = getFirestore();

export const createGroupWithStudents = async (courseIdFromMoodle, levelId) => {
  const groups = await getGroups(courseIdFromMoodle);

  for (const group of groups) {
    const groupRef = doc(collection(db, "groups"), group.id);
    await setDoc(groupRef, { name: group.name, levelId: levelId });

    const studentsFromMoodle = await getEnrolledStudents(courseIdFromMoodle);
    for (const student of studentsFromMoodle) {
      const studentRef = doc(collection(groupRef, "students"), student.id);
      await setDoc(studentRef, { name: student.fullname, groupId: group.id, levelId: levelId });
    }
  }

  console.log(`Created groups with students in course ${courseIdFromMoodle} for level ${levelId}.`);
};
