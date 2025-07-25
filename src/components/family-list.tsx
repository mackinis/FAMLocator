import type { FamilyMember, Chat } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin, MessageSquare } from 'lucide-react';
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarContent,
  SidebarTrigger,
} from './ui/sidebar';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import { useMemo } from 'react';

type FamilyListProps = {
  onSelectMember: (member: FamilyMember) => void;
  selectedMember: FamilyMember | null;
  familyMembers: FamilyMember[];
  onStartChat: (member: FamilyMember) => void;
  unreadChats: Set<string>;
  chats: Chat[];
  currentUserId: string;
};

export function FamilyList({ onSelectMember, selectedMember, familyMembers, onStartChat, unreadChats, chats, currentUserId }: FamilyListProps) {
  
  const unreadPrivateChatters = useMemo(() => {
    const chatterIds = new Set<string>();
    chats.forEach(chat => {
      if (!chat.isGroup && unreadChats.has(chat.id)) {
        const otherMemberId = chat.memberIds.find(id => id !== currentUserId);
        if (otherMemberId) {
          chatterIds.add(otherMemberId);
        }
      }
    });
    return chatterIds;
  }, [unreadChats, chats, currentUserId]);
  
  return (
    <div className='flex flex-col h-full'>
      <SidebarHeader>
        <div className="flex items-center justify-between p-2">
          <h2 className="text-lg font-semibold tracking-tight group-data-[collapsible=icon]:hidden">Miembros</h2>
          <SidebarTrigger className="hidden md:flex" />
        </div>
        <Separator />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {familyMembers.map((member) => (
            <SidebarMenuItem key={member.id}>
              <div className="flex items-center w-full">
                <SidebarMenuButton
                  onClick={() => onSelectMember(member)}
                  isActive={selectedMember?.id === member.id}
                  className="h-auto p-2 justify-start flex-1 group-data-[collapsible=icon]:w-12 group-data-[collapsible=icon]:h-12 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center"
                  tooltip={{children: member.name, side: 'right'}}
                >
                    <div className="relative shrink-0 group-data-[collapsible=icon]:ml-1">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.avatar} alt={member.name} />
                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      {member.isOnline && (
                        <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-card" />
                      )}
                    </div>
                    <div className="flex flex-col items-start ml-3 group-data-[collapsible=icon]:hidden">
                      <span className="font-medium leading-none">{member.name}</span>
                      <div className="flex items-center text-xs text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3 mr-1" />
                          <span className="truncate max-w-[150px]">{member.location.name}</span>
                      </div>
                    </div>
                </SidebarMenuButton>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 ml-1 shrink-0 group-data-[collapsible=icon]:hidden relative" 
                    onClick={() => onStartChat(member)}
                    title={`Chatear con ${member.name}`}
                >
                    <MessageSquare className="h-4 w-4" />
                     {unreadPrivateChatters.has(member.id) && (
                        <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-green-500 ring-1 ring-card" />
                    )}
                </Button>
              </div>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </div>
  );
}
