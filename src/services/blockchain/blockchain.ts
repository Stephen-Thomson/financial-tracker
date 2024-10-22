import axios, { AxiosError } from 'axios';

// Allowed roles
const allowedRoles = ['Manager', 'Accountant', 'Staff'] as const;
type AllowedRoles = typeof allowedRoles[number];

// Helper function to check if error is AxiosError
const isAxiosError = (error: unknown): error is AxiosError => {
  return (error as AxiosError).isAxiosError !== undefined;
};

// Function to fetch the role of the current user based on their public key
export const fetchUserRoleFromBlockchain = async (publicKey: string): Promise<string | null> => {
  try {
    const response = await axios.get(`http://localhost:5000/api/users/role/${publicKey}`);
    return response.data.role;
  } catch (error) {
    if (isAxiosError(error)) {
      console.error('Error fetching user role from blockchain:', error.response?.data || error.message);
    } else {
      console.error('Unknown error:', error);
    }
    return null;
  }
};

// Function to store team members on the blockchain
export const storeTeamMemberOnBlockchain = async (publicKey: string, email: string, role: string) => {
  try {
    if (!allowedRoles.includes(role as AllowedRoles)) {
      throw new Error(`Invalid role: ${role}. Role must be one of ${allowedRoles.join(', ')}`);
    }

    await axios.post('http://localhost:5000/api/team-members', { publicKey, email, role });
    console.log(`Team member ${email} with role ${role} stored on the blockchain.`);
  } catch (error) {
    if (isAxiosError(error)) {
      console.error('Failed to store team member on the blockchain:', error.response?.data || error.message);
    } else {
      console.error('Unknown error:', error);
    }
  }
};

// Function to fetch team members from the blockchain (simulated by database)
export const fetchTeamMembersFromBlockchain = async (): Promise<{ email: string; role: string }[]> => {
  try {
    const response = await axios.get(`http://localhost:5000/api/team-members`);
    return response.data.teamMembers;
  } catch (error) {
    if (isAxiosError(error)) {
      console.error('Error fetching team members from blockchain:', error.response?.data || error.message);
    } else {
      console.error('Unknown error:', error);
    }
    return [];
  }
};

// Function to remove a team member from the blockchain
export const removeTeamMemberFromBlockchain = async (email: string) => {
  try {
    await axios.delete(`http://localhost:5000/api/team-members/${email}`);
    console.log(`Team member with email ${email} removed from the blockchain.`);
  } catch (error) {
    if (isAxiosError(error)) {
      console.error('Error removing team member from blockchain:', error.response?.data || error.message);
    } else {
      console.error('Unknown error:', error);
    }
  }
};
