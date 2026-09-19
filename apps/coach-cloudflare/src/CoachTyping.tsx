import React, {useEffect, useState} from 'react';

export function CoachTyping({onStop}: {onStop: () => void}) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 12000);
    return () => clearTimeout(timer);
  }, []);
  return <div className="chat-message assistant coach-typing">
    <small>Coach</small>
    <div className="typing-line">
      <span className="typing-dots" aria-hidden="true"><i/><i/><i/></span>
      <span role="status" aria-live="polite" aria-atomic="true">
        {slow ? 'Still working on your reply…' : 'Typing…'}
      </span>
    </div>
    <button type="button" className="text-button" onClick={onStop}>Stop waiting</button>
  </div>;
}
