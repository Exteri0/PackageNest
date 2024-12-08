import { MouseEvent, useEffect, useState } from 'react';
import { validateStoredToken } from '../utils';
import axios from 'axios';
import config from '../config';

type User = {
  id: string;
  name: string;
  isadmin: boolean;
  isbackend: boolean;
  hashed_password: string;
};

export default function DeleteUser() {
  const [isLoggedIn, setIsLoggedIn] = useState(0);
  const [error, setError] = useState([0, '']);
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const user = await validateStoredToken();
      if (user) {
        console.log('User is logged in');
        console.log(user);
        setName(user.name);
        if (user.isAdmin) setIsLoggedIn(1);
        else setIsLoggedIn(2);
      } else {
        console.log('User is not logged in');
        setIsLoggedIn(3);
      }
    })();
  }, []);

  const handleDelete = async () => {
    if (name === 'ece30861defaultadminuser') {
      setError([1, 'Cannot delete default admin user']);
      return;
    }
    await axios
      .delete(`${config.apiBaseUrl}/deleteSelf`, {
        headers: {
          'X-Authorization': localStorage.getItem('token'),
        },
      })
      .then((res) => {
        setError([2, 'User deleted successfully']);
        localStorage.removeItem('token');
        window.location.reload();
      })
      .catch((err) => {
        console.error(err);
        setError([1, 'Failed to delete user']);
      });
  };

  const handleGetUsers = async () => {
    await axios
      .get(`${config.apiBaseUrl}/getUsers`, {
        headers: {
          'X-Authorization': localStorage.getItem('token'),
        },
      })
      .then((res) => {
        setUsers(res.data);
        console.log(res.data);
      })
      .catch((err) => {
        console.error(err);
        setError([1, 'Failed to get users']);
      });
  };

  const handleDeleteUser = async (e: MouseEvent, user: User) => {
    e.preventDefault();
    if (user.name == 'ece30861defaultadminuser') {
      setError([1, 'Cannot delete default admin user']);
      return;
    }
    await axios
      .delete(`${config.apiBaseUrl}/user/${user.id}`, {
        headers: {
          'X-Authorization': localStorage.getItem('token'),
        },
      })
      .then((res) => {
        setError([2, 'User deleted successfully']);
        setUsers(users.filter((use) => use.id !== user.id));
      })
      .catch((err) => {
        console.error(err);
        setError([1, 'Failed to delete user']);
      });
  };

  return (
    <div>
      {isLoggedIn === 0 && <h1>Loading</h1>}
      {isLoggedIn === 2 && (
        <div>
          <h1>Do you want to delete your profile?</h1>
          <button onClick={handleDelete}>Delete Account</button>
        </div>
      )}
      {isLoggedIn === 1 && (
        <div>
          <h1>You are authorized to delete users</h1>
          <button onClick={handleGetUsers}>Get Users</button>
          {users.map((user) => (
            <div key={user.id}>
              <h2>{user.name}</h2>
              <p>{user.id}</p>
              <p>{user.isadmin ? 'Admin' : 'Not Admin'}</p>
              <p>{user.isbackend ? 'Backend' : 'Not Backend'}</p>
              <button onClick={(e) => handleDeleteUser(e, user)}>
                Delete User
              </button>
            </div>
          ))}
        </div>
      )}
      {isLoggedIn === 3 && <h1>Please Login First</h1>}
      {error[0] === 1 && <span style={{ color: 'red' }}>{error[1]}</span>}
      {error[0] === 2 && <span style={{ color: 'green' }}>{error[1]}</span>}
    </div>
  );
}
