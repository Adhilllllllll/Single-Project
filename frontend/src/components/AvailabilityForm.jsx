import { useState } from "react";

const days = [
   
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const AvailabilityForm = ({ onSubmit, loading }) => {
  const [dayOfWeek, setDayOfWeek] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!dayOfWeek || !startTime || !endTime) return;

    onSubmit({
      dayOfWeek: Number(dayOfWeek),
      startTime,
      endTime,
    });

    setDayOfWeek("");
    setStartTime("");
    setEndTime("");
  };

  return (
    <form onSubmit={handleSubmit}>
      <select
        value={dayOfWeek}
        onChange={(e) => setDayOfWeek(e.target.value)}
      >
        <option value="">Select Day</option>
        {days.map((d) => (
          <option key={d.value} value={d.value}>
            {d.label}
          </option>
        ))}
      </select>

      <input
        type="time"
        value={startTime}
        onChange={(e) => setStartTime(e.target.value)}
      />

      <input
        type="time"
        value={endTime}
        onChange={(e) => setEndTime(e.target.value)}
      />

      <button type="submit" disabled={loading}>
        Add
      </button>
    </form>
  );
};

export default AvailabilityForm;
