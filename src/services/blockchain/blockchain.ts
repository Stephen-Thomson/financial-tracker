import { getUserByPublicKey, addUser, addTeamMember, getTeamMembers } from '../db';

// Allowed roles
const allowedRoles = ['Manager', 'Accountant', 'Staff'] as const;
type AllowedRoles = typeof allowedRoles[number];

// Function to fetch the role of the current user based on their public key
export const fetchUserRoleFromBlockchain = async (publicKey: string): Promise<string | null> => {
  try {
    const user = await getUserByPublicKey(publicKey);
    
    if (user) {
      return user.role; // Return the user's role
    } else {
      // Return null if no user data exists yet, indicating a new user
      return null;
    }
  } catch (error) {
    console.error('Error fetching user role from blockchain (MySQL):', error);
    return null;
  }
};

// Function to store team members on the blockchain (database in this case)
export const storeTeamMemberOnBlockchain = async (publicKey: string, email: string, role: string) => {
    try {
      // Check if the role is valid
      if (!allowedRoles.includes(role as AllowedRoles)) {
        throw new Error(`Invalid role: ${role}. Role must be one of ${allowedRoles.join(', ')}`);
      }
  
      const user = await getUserByPublicKey(publicKey);
      
      if (user) {
        await addTeamMember(user.id, email, role as AllowedRoles); // Add team member to the database
        console.log(`Team member ${email} with role ${role} stored in database.`);
      } else {
        console.error('User not found');
      }
    } catch (error) {
      console.error('Failed to store team member in the database:', error);
    }
  };

// Function to check if the user already exists in the database
export const checkUserExistsOnBlockchain = async (publicKey: string): Promise<boolean> => {
  try {
    const user = await getUserByPublicKey(publicKey);
    return !!user; // Return true if the user exists, otherwise false
  } catch (error) {
    console.error('Error checking user existence in database:', error);
    return false;
  }
};

// Function to create a new user entry in the database (for key user during onboarding)
export const createBlockchainFileForUser = async (publicKey: string, email: string) => {
  try {
    const userExists = await checkUserExistsOnBlockchain(publicKey);

    if (!userExists) {
      // Store the key user information in the database
      await addUser(publicKey, 'keyPerson'); // 'keyPerson' role for the key user
      console.log('New user created in the database for key user.');
    } else {
      console.log('User already exists in the database.');
    }
  } catch (error) {
    console.error('Error creating user in database:', error);
  }
};

// Function to fetch team members of the key user
export const fetchTeamMembersFromBlockchain = async (publicKey: string) => {
  try {
    const user = await getUserByPublicKey(publicKey);
    
    if (user) {
      const teamMembers = await getTeamMembers(user.id); // Fetch team members
      return teamMembers;
    } else {
      console.error(`User with publicKey ${publicKey} not found.`);
      return [];
    }
  } catch (error) {
    console.error('Error fetching team members from database:', error);
    return [];
  }
};

