export type FamilyMember = {
  id: string;
  name: string;
  email?: string;
  avatar: string;
  location: {
    name: string;
    lat: number;
    lng: number;
    timestamp: string;
  };
  isOnline: boolean;
  status?: 'active' | 'pending' | 'suspended';
  isSharingLocation?: boolean;
  isChatEnabled?: boolean;
  isAdmin?: boolean;
};

export type Message = {
  id: string;
  memberId: string;
  memberName: string;
  memberAvatar: string;
  text: string;
  timestamp: any; // Use 'any' to accommodate Firebase ServerTimestamp
};

export type SiteSettings = {
  siteName: string;
  copyright: string;
  iconUrl?: string;
  colors: {
    primary: string;
    accent: string;
    background: string;
  };
  developerCreditText?: string;
  developerName?: string;
  developerUrl?: string;
  isChatEnabled?: boolean;
  emailTemplates?: {
    verification?: {
      subject?: string;
      body?: string;
    }
  }
};

export type LoginResult = {
    success: boolean;
    firstLogin?: boolean;
    needsVerification?: boolean;
    message?: string;
    userId?: string;
    isAdmin?: boolean;
}

export type Chat = {
  id: string;
  name: string; // e.g., "General" or "John Doe"
  memberIds: string[];
  isGroup: boolean;
  createdAt?: string;
};
