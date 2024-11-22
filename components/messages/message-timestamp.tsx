// components/messages/message-timestamp.tsx
import { useState } from "react";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";

interface MessageTimestampProps {
  date: Date;
}

export function MessageTimestamp({ date }: MessageTimestampProps) {
  const [showFullTimestamp, setShowFullTimestamp] = useState(false);
  
  const formatMessageTimestamp = (date: Date) => {
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Yesterday ' + format(date, 'HH:mm');
    } else if (date.getFullYear() === new Date().getFullYear()) {
      return format(date, 'MMM d HH:mm');
    }
    return format(date, 'MMM d, yyyy HH:mm');
  };

  return (
    <span
      onMouseEnter={() => setShowFullTimestamp(true)}
      onMouseLeave={() => setShowFullTimestamp(false)}
      className="text-xs text-white/50 transition-opacity duration-300 cursor-default"
    >
      {showFullTimestamp 
        ? formatMessageTimestamp(date)
        : formatDistanceToNow(date, { addSuffix: true })}
    </span>
  );
}