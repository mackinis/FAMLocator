import type { FamilyMember } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin } from 'lucide-react';
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarContent,
  SidebarTrigger,
} from './ui/sidebar';
import { Separator } from './ui/separator';

type FamilyListProps = {
  onSelectMember: (member: FamilyMember) => void;
  selectedMember: FamilyMember | null;
  familyMembers: FamilyMember[];
};

export function FamilyList({ onSelectMember, selectedMember, familyMembers }: FamilyListProps) {
  
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
              <SidebarMenuButton
                onClick={() => onSelectMember(member)}
                isActive={selectedMember?.id === member.id}
                className="h-auto p-2 justify-start group-data-[collapsible=icon]:w-12 group-data-[collapsible=icon]:h-12 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center"
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
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </div>
  );
}
