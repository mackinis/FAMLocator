import type { FamilyMember, Message } from './types';

// This file is no longer in active use for family members or messages,
// as data is now being fetched from and sent to Firestore.
// It is kept for reference or potential future use (e.g., testing).

export const FAMILY_MEMBERS: FamilyMember[] = [
  {
    id: 'user1',
    name: 'Tú',
    avatar: 'https://i.pravatar.cc/150?u=user1',
    location: {
      name: 'Casa',
      lat: 34.0522,
      lng: -118.2437,
      timestamp: 'Ahora mismo',
    },
    isOnline: true,
  },
  {
    id: 'user2',
    name: 'Elena',
    avatar: 'https://i.pravatar.cc/150?u=user2',
    location: {
      name: 'Trabajo',
      lat: 34.055,
      lng: -118.255,
      timestamp: 'Hace 5m',
    },
    isOnline: true,
  },
];

export const MESSAGES: Message[] = [
    {
        id: 'msg1',
        memberId: 'user2',
        memberName: 'Elena',
        memberAvatar: 'https://i.pravatar.cc/150?u=user2',
        text: '¡Hola a todos, acabo de llegar al trabajo!',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
    },
    {
        id: 'msg2',
        memberId: 'user3',
        memberName: 'Miguel',
        memberAvatar: 'https://i.pravatar.cc/150?u=user3',
        text: '¡Buenos días! ¡Que tengas un gran día!',
        timestamp: new Date(Date.now() - 4 * 60 * 1000),
    },
];
