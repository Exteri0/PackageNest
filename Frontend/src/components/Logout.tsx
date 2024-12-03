import { clearToken } from '../utils';

export default function Logout() {
  const handleSubmit = () => {
    console.log('Logging out');
    clearToken();
    window.location.reload();
  };

  return (
    <div>
      <h2>Do you want to log out?</h2>
      <button onClick={handleSubmit}>Yes</button>
      <button>No</button>
    </div>
  );
}
