import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { storeUserOnBlockchain } from '../services/blockchain/blockchain';

interface ManagerPageProps {
  onboarding: boolean;
}

const ManagerPage: React.FC<ManagerPageProps> = ({ onboarding }) => {
  const [members, setMembers] = useState<{ publicKey: string; email: string; role: string }[]>([]);
  const [newMemberPublicKey, setNewMemberPublicKey] = useState<string>('');
  const [newMemberEmail, setNewMemberEmail] = useState<string>(''); // Added email state
  const [newMemberRole, setNewMemberRole] = useState<string>('Staff'); // Updated default role
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  // Fetch current members when the page loads
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/users');
        setMembers(response.data.members);
      } catch (error) {
        console.error('Error fetching members:', error);
        setErrorMessage('Failed to fetch members.');
      }
    };

    fetchMembers();
  }, []);

  // Add a new member with a specified public key, email, and role
const handleAddMember = async () => {
  try {
    if (!newMemberPublicKey || !newMemberEmail) {
      setErrorMessage('Please provide both a public key and email.');
      return;
    }

    // Call the blockchain function to store the user
    await storeUserOnBlockchain(newMemberPublicKey, newMemberEmail, newMemberRole);

    // Add the new member to the local state
    setMembers([
      ...members,
      {
        publicKey: newMemberPublicKey,
        email: newMemberEmail,
        role: newMemberRole,
      },
    ]);

    // Reset input fields
    setNewMemberPublicKey('');
    setNewMemberEmail('');
    setNewMemberRole('Staff'); // Reset to default role
    setErrorMessage(null); // Clear any previous error messages
  } catch (error) {
    console.error('Error adding member:', error);
    setErrorMessage('Failed to add member.');
  }
};

  // Remove a member and update the list
  const handleRemoveMember = async (index: number) => {
    try {
      const memberToRemove = members[index];

      await axios.delete(`http://localhost:5000/api/users/${memberToRemove.publicKey}`);

      const updatedMembers = [...members];
      updatedMembers.splice(index, 1);
      setMembers(updatedMembers);
    } catch (error) {
      console.error('Error removing member:', error);
      setErrorMessage('Failed to remove member.');
    }
  };

  // Handle completion of team management
  const handleComplete = () => {
    if (onboarding) {
      navigate('/onboarding'); // Go back to Onboarding if still onboarding
    } else {
      navigate('/dashboard'); // Otherwise go to Dashboard
    }
  };

  return (
    <div className="manager-page">
      <h1>Manage Access</h1>
      <p>Control access to financial data by managing members and their permissions.</p>

      {/* Display current members */}
      <h2>Current Members</h2>
      {members.length > 0 ? (
        <ul>
          {members.map((member, index) => (
            <li key={index}>
              {member.publicKey} - {member.email} - {member.role}{' '}
              <button onClick={() => handleRemoveMember(index)}>Remove</button>
            </li>
          ))}
        </ul>
      ) : (
        <p>No members found.</p>
      )}

      {/* Form to add a new member */}
      <h2>Add New Member</h2>
      <input
        type="text"
        value={newMemberPublicKey}
        onChange={(e) => setNewMemberPublicKey(e.target.value)}
        placeholder="Enter public key"
      />
      <input
        type="email"
        value={newMemberEmail}
        onChange={(e) => setNewMemberEmail(e.target.value)}
        placeholder="Enter email address"
      />
      <select value={newMemberRole} onChange={(e) => setNewMemberRole(e.target.value)}>
        <option value="keyPerson">Key Person</option>
        <option value="Manager">Manager</option>
        <option value="Accountant">Accountant</option>
        <option value="Staff">Staff</option>
        <option value="Deleted">Deleted</option>
      </select>
      <button onClick={handleAddMember}>Add Member</button>

      {errorMessage && <p className="error-message">{errorMessage}</p>}

      {/* Button to complete management process */}
      <button onClick={handleComplete}>Done</button>
    </div>
  );
};

export default ManagerPage;
