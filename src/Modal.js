import React, { useState } from 'react';
import './Modal.css';

function Modal({ visible, onClose, onSubmit }) {
  const [lessonName, setLessonName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(lessonName);
    setLessonName('');
  }

  return visible ? (
    <div className="modal-background" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>X</button>
        <form onSubmit={handleSubmit}>
          <label>
            Lesson name:
            <input type="text" value={lessonName} onChange={e => setLessonName(e.target.value)} />
          </label>
          <input type="submit" value="Add Lesson" disabled={!lessonName} />
        </form>
      </div>
    </div>
  ) : null;
}

export default Modal;