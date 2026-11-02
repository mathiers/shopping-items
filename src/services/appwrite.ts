
import 'react-native-url-polyfill/auto';

import { Client, Account, Databases, ID } from 'react-native-appwrite';

export const APPWRITE_PROJECT_ID = '6ae7457c001f20a0d5b8';

export const APPWRITE_ENDPOINT =
  'https://fra.cloud.appwrite.io/v1';

export const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setPlatform('com.mathiers.shoppingitems');

export const account = new Account(client);
export const databases = new Databases(client);



export async function registerUser(
  name: string,
  email: string,
  password: string
) {
  await account.create({
    userId: ID.unique(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password,
  });

  return loginUser(email, password);
}

export async function loginUser(
  email: string,
  password: string
) {
  await account.createEmailPasswordSession({
    email: email.trim().toLowerCase(),
    password,
  });

  return account.get();
}

export async function getCurrentUser() {
  try {
    return await account.get();
  } catch (error: any) {
    if (error?.code === 401) {
      return null;
    }

    throw error;
  }
}

export async function logoutUser() {
  await account.deleteSession({
    sessionId: 'current',
  });
}
