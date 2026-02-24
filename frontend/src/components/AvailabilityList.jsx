const dayMap = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

const AvailabilityList = ({ data, onDelete }) => {
  if (!data || data.length === 0) {
    return <p>No availability slots added yet.</p>;
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th align="left">Day</th>
          <th align="left">Start Time</th>
          <th align="left">End Time</th>
          {onDelete && <th></th>}
        </tr>
      </thead>
      <tbody>
        {data.map((slot) => (
          <tr key={slot._id}>
            <td>{dayMap[slot.dayOfWeek]}</td>
            <td>{slot.startTime}</td>
            <td>{slot.endTime}</td>
            {onDelete && (
              <td>
                <button onClick={() => onDelete(slot._id)}>
                  Delete
                </button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default AvailabilityList;
