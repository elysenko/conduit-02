export type Role = 'ADMIN' | 'MANAGER' | 'USER';

export interface Profile {
  username: string;
  bio: string | null;
  image: string | null;
  following: boolean;
}

export interface User {
  email: string;
  token: string;
  username: string;
  bio: string | null;
  image: string | null;
  role: Role;
}

export interface Article {
  slug: string;
  title: string;
  description: string;
  body: string;
  tagList: string[];
  createdAt: string;
  updatedAt: string;
  favorited: boolean;
  favoritesCount: number;
  author: Profile;
}

export interface Comment {
  id: number;
  createdAt: string;
  updatedAt: string;
  body: string;
  author: Profile;
}

export interface AdminSettingKey {
  key: string;
  value: string;
  configured: boolean;
}

export interface AdminServiceSettings {
  service: string;
  label: string;
  description: string;
  configured: boolean;
  keys: AdminSettingKey[];
}
