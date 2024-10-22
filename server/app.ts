import express from 'express';
import cors from 'cors';
import { getTeamMembers, addTeamMember, removeTeamMember, getUserRole, getUserCount, addUser, checkUserExists } from './db'; // Assume getUserRole is implemented in your db

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Add a new team member
app.post('/api/team-members', async (req, res) => {
  const { publicKey, email, role } = req.body;
  try {
    const newMember = await addTeamMember(publicKey, email, role);
    res.json(newMember);
  } catch (error) {
    res.status(500).json({ message: 'Error adding team member' });
  }
});

// Get Role of a user
app.get('/api/users/role/:publicKey', async (req, res) => {
  const { publicKey } = req.params;
  try {
    const role = await getUserRole(publicKey); // Fetch the role based on the publicKey

    if (role) {
      res.json({ role }); // If role exists, return it
    } else {
      res.status(404).json({ message: 'User not found. Assigning role.' });
    }
  } catch (error) {
    console.error('Error fetching user role:', error);
    res.status(500).json({ message: 'Error fetching user role' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
