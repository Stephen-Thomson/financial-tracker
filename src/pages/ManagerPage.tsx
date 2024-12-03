/**
 * File: ManagerPage.tsx
 * Author: Stephen Thomson
 * Date Created: 11/30/2024
 * Description:
 * The ManagerPage component allows managers to control access to financial data by managing
 * team members. It provides functionalities for adding, removing, and viewing members,
 * including their public keys, email addresses, and roles. This component integrates with
 * both the backend API and blockchain for user management.
 *
 * Functionalities:
 * - Fetch and display the list of current members from the backend.
 * - Add new members with specified roles, public keys, and email addresses.
 * - Remove existing members from the backend.
 * - Navigate to the onboarding page or dashboard upon completion of team management.
 */

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { storeUserOnBlockchain } from '../services/blockchain/blockchain';

interface ManagerPageProps {
  onboarding: boolean; // Determines if the page is accessed during the onboarding process
}

/**
 * Component: ManagerPage
 * Props:
 * - onboarding: Boolean to indicate if the user is in the onboarding process.
 * Description:
 * This component provides an interface for managers to manage team members, including
 * adding new members, removing existing members, and viewing their details.
 */
const ManagerPage: React.FC<ManagerPageProps> = ({ onboarding }) => {
  const [members, setMembers] = useState<{ publicKey: string; email: string; role: string }[]>([]);
  const [newMemberPublicKey, setNewMemberPublicKey] = useState<string>(''); // Input for new member's public key
  const [newMemberEmail, setNewMemberEmail] = useState<string>(''); // Input for new member's email
  const [newMemberRole, setNewMemberRole] = useState<string>('Staff'); // Input for new member's role, default is "Staff"
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // To display error messages
  const navigate = useNavigate();

  /**
   * Effect: Fetch Members
   * Fetches the list of current members from the backend when the page loads.
   */
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

  /**
   * Function: handleAddMember
   * Adds a new member to the team. Integrates with the blockchain and backend to store
   * the member's details and updates the UI with the new member.
   */
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

      // Reset input fields and clear errors
      setNewMemberPublicKey('');
      setNewMemberEmail('');
      setNewMemberRole('Staff'); // Reset to default role
      setErrorMessage(null);
    } catch (error) {
      console.error('Error adding member:', error);
      setErrorMessage('Failed to add member.');
    }
  };

  /**
   * Function: handleRemoveMember
   * Removes a member from the backend and updates the UI to reflect the changes.
   * @param index The index of the member in the `members` array to be removed.
   */
  const handleRemoveMember = async (index: number) => {
    try {
      const memberToRemove = members[index];

      await axios.delete(`http://localhost:5000/api/users/${memberToRemove.publicKey}`);

      // Update the members list in the UI
      const updatedMembers = [...members];
      updatedMembers.splice(index, 1);
      setMembers(updatedMembers);
    } catch (error) {
      console.error('Error removing member:', error);
      setErrorMessage('Failed to remove member.');
    }
  };

  /**
   * Function: handleComplete
   * Navigates the user to the next page based on whether they are onboarding or managing members normally.
   */
  const handleComplete = () => {
    if (onboarding) {
      navigate('/onboarding'); // Go back to Onboarding if in onboarding
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
