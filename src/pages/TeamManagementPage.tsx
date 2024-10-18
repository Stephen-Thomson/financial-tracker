import React, { useState, useEffect } from 'react';
import { getTeamMembers, addTeamMember, removeTeamMember } from '../services/blockchain/blockchain'; // Placeholder functions
import { useNavigate } from 'react-router-dom';

const TeamManagementPage: React.FC = () => {
  const [teamMembers, setTeamMembers] = useState<{ email: string; role: string }[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState<string>('');
  const [newMemberRole, setNewMemberRole] = useState<string>('Manager');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  // Fetch the team members when the page loads
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const members = await getTeamMembers(); // Fetch team members from blockchain
        setTeamMembers(members);
      } catch (error) {
        console.error('Error fetching team members:', error);
        setErrorMessage('Failed to fetch team members.');
      }
    };
    fetchMembers();
  }, []);

  // Add a new team member
  const handleAddMember = async () => {
    try {
      if (!newMemberEmail) {
        setErrorMessage('Please provide an email address.');
        return;
      }
      await addTeamMember(newMemberEmail, newMemberRole);
      setTeamMembers([...teamMembers, { email: newMemberEmail, role: newMemberRole }]);
      setNewMemberEmail('');
      setNewMemberRole('Manager');
    } catch (error) {
      console.error('Error adding team member:', error);
      setErrorMessage('Failed to add team member.');
    }
  };

  // Remove a team member
  const handleRemoveMember = async (index: number) => {
    try {
      const memberToRemove = teamMembers[index];
      await removeTeamMember(memberToRemove.email); // Remove the team member from the blockchain
      const updatedMembers = [...teamMembers];
      updatedMembers.splice(index, 1);
      setTeamMembers(updatedMembers);
    } catch (error) {
      console.error('Error removing team member:', error);
      setErrorMessage('Failed to remove team member.');
    }
  };

  return (
    <div className="team-management-page">
      <h1>Team Management</h1>
      <p>Manage your team's access and roles here.</p>

      {/* Display team members */}
      <h2>Current Team Members</h2>
      {teamMembers.length > 0 ? (
        <ul>
          {teamMembers.map((member, index) => (
            <li key={index}>
              {member.email} - {member.role}{' '}
              <button onClick={() => handleRemoveMember(index)}>Remove</button>
            </li>
          ))}
        </ul>
      ) : (
        <p>No team members found.</p>
      )}

      {/* Form to add a new team member */}
      <h2>Add New Team Member</h2>
      <input
        type="email"
        value={newMemberEmail}
        onChange={(e) => setNewMemberEmail(e.target.value)}
        placeholder="Enter email"
      />
      <select value={newMemberRole} onChange={(e) => setNewMemberRole(e.target.value)}>
        <option value="Manager">Manager</option>
        <option value="Accountant">Accountant</option>
        <option value="Staff">Staff</option>
      </select>
      <button onClick={handleAddMember}>Add Member</button>

      {errorMessage && <p className="error-message">{errorMessage}</p>}

      <button onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
    </div>
  );
};

export default TeamManagementPage;
