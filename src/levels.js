import { getFirestore, collection, doc, setDoc } from "firebase/firestore";

const db = getFirestore();

export const createLevelWithLessons = async (levelIdFromMoodle, levelName, numberOfLessons) => {
  const levelsCollection = collection(db, "levels");
  const levelRef = doc(levelsCollection, levelIdFromMoodle);

  // Create or update the level document
  await setDoc(levelRef, { name: levelName });

  // Create the lessons sub-collection
  for (let i = 1; i <= numberOfLessons; i++) {
    const lessonRef = doc(collection(levelRef, "lessons"), `lesson${i}`);
    await setDoc(lessonRef, { name: `Lesson ${i}` });
  }

  console.log(`Created level ${levelName} with ${numberOfLessons} lessons.`);
};
