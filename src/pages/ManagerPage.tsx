import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

interface ManagerPageProps {
  onboarding: boolean;
}

const ManagerPage: React.FC<ManagerPageProps> = ({ onboarding }) => {
  const [members, setMembers] = useState<{ publicKey: string; role: string }[]>([]);
  const [newMemberPublicKey, setNewMemberPublicKey] = useState<string>('');
  const [newMemberRole, setNewMemberRole] = useState<string>('Viewer');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch current members when the page loads
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await axios.get('/api/members'); // Fetch members
        setMembers(response.data.members);
      } catch (error) {
        console.error('Error fetching members:', error);
        setErrorMessage('Failed to fetch members.');
      }
    };

    fetchMembers();
  }, []);

  // Add a new member with a specified public key and role
  const handleAddMember = async () => {
    try {
      if (!newMemberPublicKey) {
        setErrorMessage('Please provide a public key.');
        return;
      }

      const response = await axios.post('/api/members', {
        publicKey: newMemberPublicKey,
        role: newMemberRole
      });

      setMembers([...members, response.data]);
      setNewMemberPublicKey('');
      setNewMemberRole('Staff');
    } catch (error) {
      console.error('Error adding member:', error);
      setErrorMessage('Failed to add member.');
    }
  };

  // Remove a member and update the list
  const handleRemoveMember = async (index: number) => {
    try {
      const memberToRemove = members[index];

      await axios.delete(`/api/members/${memberToRemove.publicKey}`);

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
              {member.publicKey} - {member.role}{' '}
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
      <select value={newMemberRole} onChange={(e) => setNewMemberRole(e.target.value)}>
        <option value="Viewer">Viewer</option>
        <option value="Editor">Editor</option>
      </select>
      <button onClick={handleAddMember}>Add Member</button>

      {errorMessage && <p className="error-message">{errorMessage}</p>}

      {/* Button to complete management process */}
      <button onClick={handleComplete}>Done</button>
    </div>
  );
};

export default ManagerPage;
