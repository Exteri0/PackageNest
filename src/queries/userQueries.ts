import { getDbPool } from "../service/databaseConnection.js";

// Retrieve a user by ID
export const getUserById = async (userId: number) => {
  const query = "SELECT * FROM users WHERE id = $1";
  try {
    const res = await getDbPool().query(query, [userId]);
    return res.rows[0];
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    throw error;
  }
};

// Retrieve a user by username
export const getUserByUsername = async (username: string) => {
  const query = "SELECT * FROM users WHERE name = $1";
  try {
    const res = await getDbPool().query(query, [username]);
    return res.rows[0];
  } catch (error) {
    console.error("Error fetching user by username:", error);
    throw error;
  }
};

// Create a new user
export const createUser = async (
  username: string,
  hashed_password: string,
  isAdmin: boolean,
  isBackend: boolean
) => {
  const query = `
    INSERT INTO users (name, password_hash, isAdmin, isBackend) 
    VALUES ($1, $2, $3, $4) 
    RETURNING *`;
  try {
    const res = await getDbPool().query(query, [
      username,
      hashed_password,
      isAdmin,
      isBackend,
    ]);
    return res.rows[0];
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

// Update user information
export const updateUser = async (
  userId: number,
  username: string,
  email: string
) => {
  const query = `
    UPDATE users 
    SET username = $1, email = $2 
    WHERE id = $3 
    RETURNING *`;
  try {
    const res = await getDbPool().query(query, [username, email, userId]);
    return res.rows[0];
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
};

// Delete a user by ID
export const deleteUserById = async (userId: number) => {
  const query = "DELETE FROM users WHERE id = $1 RETURNING *";
  try {
    const res = await getDbPool().query(query, [userId]);
    return res.rowCount !== null && res.rowCount > 0;
  } catch (error) {
    console.error("Error deleting user by ID:", error);
    throw error;
  }
};

// Get all users
export const getAllUsers = async () => {
  const query = "SELECT * FROM users";
  try {
    const res = await getDbPool().query(query);
    return res.rows;
  } catch (error) {
    console.error("Error fetching all users:", error);
    throw error;
  }
};

// Set user admin status
export const setUserAdminStatus = async (userId: number, isAdmin: boolean) => {
  const query = "UPDATE users SET is_admin = $1 WHERE id = $2 RETURNING *";
  try {
    const res = await getDbPool().query(query, [isAdmin, userId]);
    return res.rows[0];
  } catch (error) {
    console.error("Error setting user admin status:", error);
    throw error;
  }
};
