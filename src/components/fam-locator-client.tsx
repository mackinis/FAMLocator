'use client';

import React, { useEffect, useState, useMemo, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { MapPin, LogOut, Settings, MessageSquare, Menu, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FamilyList } from './family-list';
import { FamilyChat } from './family-chat';
import type { FamilyMember, SiteSettings } from '@/lib/types';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Skeleton } from './ui/skeleton';
import { AdminPanel } from './admin-panel';
import { getFamilyMembers, getSiteSettings, updateMyLocation } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { ProfileDialog } from './profile-dialog';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Sidebar, SidebarProvider, SidebarTrigger, useSidebar } from './ui/sidebar';
import { motion, useDragControls } from "framer-motion";

const MapView = dynamic(() => import('./map-view'), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

// This new wrapper component handles the client-side auth flow.
function FamLocatorWrapper() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [userData, setUserData] = useState<{ userId: string; isAdmin: boolean } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Only run auth check if userData is not already set.
    if (userData) {
      return;
    }

    const userIdFromParams = searchParams.get('userId');
    const isAdminFromParams = searchParams.get('isAdmin') === 'true';

    if (userIdFromParams) {
      // If params are present, this is a valid login redirect.
      // Set the user data, clear the URL, and proceed.
      setUserData({ userId: userIdFromParams, isAdmin: isAdminFromParams });
      setIsLoading(false);
      // Use router.replace to clean the URL without adding to history
      router.replace('/', { scroll: false });
    } else {
      // If no params and no existing user data, it's a direct access or refresh.
      // A full app would check a session/cookie here. For now, redirect to login.
       setIsLoading(false); // Stop loading
       router.push('/login');
    }
    // By not including userData in the dependency array, we prevent this from re-running
    // after we've successfully set the user and cleared the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, searchParams]);

  if (isLoading || !userData) {
    // Show a loading state while we verify the auth status.
    return (
       <div className="h-screen w-full flex flex-col items-center justify-center bg-background text-foreground">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p>Verificando sesión... Serás redirigido si es necesario.</p>
      </div>
    )
  }

  // Once user data is confirmed, render the main application.
  return <FamLocatorContent loggedInUserId={userData.userId} isAdmin={userData.isAdmin} />
}


type FamLocatorContentProps = {
  loggedInUserId: string;
  isAdmin: boolean;
}

function FamLocatorContent({ loggedInUserId, isAdmin }: FamLocatorContentProps) {
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const { toast } = useToast();
  const dragConstraintRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const sidebarContext = useSidebar();
  const isSidebarOpen = sidebarContext.state === 'expanded';

  const currentUser = useMemo(() => {
    return familyMembers.find(m => m.id === loggedInUserId) || null;
  }, [familyMembers, loggedInUserId]);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!loggedInUserId) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const [siteSettings, members] = await Promise.all([
          getSiteSettings(),
          getFamilyMembers(),
        ]);
        
        setSettings(siteSettings);
        setFamilyMembers(members);
        
        const foundCurrentUser = members.find(m => m.id === loggedInUserId);
        setSelectedMember(foundCurrentUser || members[0] || null);

      } catch (error) {
        console.error("Error fetching initial data:", error);
        toast({
          variant: 'destructive',
          title: 'Error al cargar datos',
          description: 'No se pudieron obtener los datos de la familia. Por favor, recarga la página.'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInitialData();
    
    // This interval is crucial for seeing other members' location updates.
    const interval = setInterval(async () => {
        if (!loggedInUserId) return;
        try {
            const members = await getFamilyMembers();
            
            // Preserve the currently selected member if they still exist in the new list
            setFamilyMembers(currentMembers => {
                const updatedMembers = members;
                if (selectedMember) {
                    const reselected = updatedMembers.find(m => m.id === selectedMember.id);
                    if (reselected) {
                       setSelectedMember(reselected);
                    }
                }
                return updatedMembers;
            });
            
        } catch(e) {
            console.error("Error refreshing members", e)
        }
    }, 15000); // Refresh every 15 seconds

    return () => clearInterval(interval);

  }, [toast, loggedInUserId]);


  useEffect(() => {
    if (isLoading || typeof window === 'undefined' || !navigator.geolocation || !currentUser) {
      return;
    }

    if (!currentUser.isSharingLocation) {
        return;
    }

    // This just updates the DB. It does NOT trigger a full state re-render.
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        // Update DB in the background
        updateMyLocation(currentUser.id, latitude, longitude, 'Ubicación actual').catch(e => console.log("Failed to update location in DB", e));
      },
      (error) => {
        console.warn("Error obteniendo ubicación:", error.message);
        if (error.code === error.PERMISSION_DENIED) {
             toast({
                variant: 'destructive',
                title: 'Ubicación denegada',
                description: 'Por favor, habilita los permisos de ubicación en tu navegador para usar esta función.',
             });
        }
      },
      { 
        enableHighAccuracy: true, 
        timeout: 20000, 
        maximumAge: 0 
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isLoading, currentUser, toast]);
  
  const visibleFamilyMembers = useMemo(() => {
    if (!currentUser) return [];
    return familyMembers.filter(member => member.isSharingLocation || member.id === currentUser.id);
  }, [familyMembers, currentUser]);


  const handleSelectMember = (member: FamilyMember) => {
    setSelectedMember(member);
  };
  
  const handleProfileUpdate = (updatedUser: FamilyMember) => {
    setFamilyMembers(prevMembers => prevMembers.map(m => m.id === updatedUser.id ? updatedUser : m));
    if (selectedMember?.id === updatedUser.id) {
        setSelectedMember(updatedUser);
    }
  }

  const handleSettingsUpdate = (updatedSettings: SiteSettings) => {
    setSettings(updatedSettings);
  }

  if (isLoading) {
    return (
       <div className="h-screen w-full flex flex-col items-center justify-center bg-background text-foreground">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p>Cargando datos de la aplicación...</p>
      </div>
    )
  }
  
  if (!currentUser) {
     return (
       <div className="h-screen w-full flex flex-col items-center justify-center bg-background text-foreground">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p>Error al cargar el perfil de usuario. Intentando de nuevo...</p>
      </div>
    )
  }

  return (
      <div ref={dragConstraintRef} className="h-screen w-full bg-background text-foreground font-body overflow-hidden">
        <header className="fixed top-0 left-0 right-0 h-16 flex items-center justify-between border-b bg-card px-4 md:px-6 z-30">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="md:hidden" />
            <MapPin className="h-7 w-7 text-primary drop-shadow-[0_0_5px_hsl(var(--primary))]" />
            <h1 className="text-xl font-bold tracking-wider" style={{ textShadow: '0 0 8px hsl(var(--primary))' }}>{settings?.siteName || 'FAMLocator'}</h1>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            {settings?.isChatEnabled && (
                <Button variant="ghost" size="icon" onClick={() => setIsChatOpen(prev => !prev)} disabled={!currentUser}>
                    <MessageSquare className="h-5 w-5" />
                </Button>
            )}
            {isAdmin && 
              <Button variant="ghost" size="icon" onClick={() => setIsAdminPanelOpen(true)}>
                  <Settings className="h-5 w-5" />
              </Button>
            }
              {currentUser && (
                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" onClick={() => setIsProfileDialogOpen(true)}>
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                    <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                </Button>
              )}
            <Button variant="ghost" size="icon" asChild>
              <Link href="/login">
                <LogOut className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </header>
        
        <main className="h-full flex flex-row pt-16">
            <Sidebar collapsible="icon">
              <FamilyList onSelectMember={handleSelectMember} selectedMember={selectedMember} familyMembers={visibleFamilyMembers} />
            </Sidebar>
            <div className="flex-1 flex flex-col relative h-full">
              <div className="flex-1 w-full relative">
                    <MapView members={visibleFamilyMembers} selectedMember={selectedMember} onSelectMember={handleSelectMember} currentUser={currentUser} isSidebarOpen={isSidebarOpen} />
              </div>
              <footer className="px-4 py-2 border-t bg-card text-xs text-muted-foreground text-center shrink-0">
                {settings?.copyright}
                {settings?.developerName && settings.developerUrl && (
                  <span> | {settings.developerCreditText || 'Desarrollado por'} <a href={settings.developerUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{settings.developerName}</a></span>
                )}
              </footer>
            </div>
        </main>

        {settings?.isChatEnabled && currentUser && isChatOpen && (
          <div className="absolute top-20 right-10 z-50 pointer-events-none" style={{ width: '400px', height: '600px' }}>
            <motion.div
                drag
                dragConstraints={dragConstraintRef}
                dragControls={dragControls}
                dragMomentum={false}
                className="h-full w-full pointer-events-auto"
                whileDrag={{ scale: 1.02, shadow: '0 0 20px rgba(0,0,0,0.2)' }}
            >
                <FamilyChat currentUser={currentUser} dragControls={dragControls} onClose={() => setIsChatOpen(false)} />
            </motion.div>
          </div>
         )}

        {isAdmin && <AdminPanel isOpen={isAdminPanelOpen} onOpenChange={setIsAdminPanelOpen} onSettingsUpdate={handleSettingsUpdate} />}
        {currentUser && <ProfileDialog isOpen={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen} user={currentUser} onProfileUpdate={handleProfileUpdate} />}
      </div>
  );
}


export default function FamLocatorClient() {
  // `Suspense` is key for `useSearchParams` to work correctly.
  // We wrap the component that handles the auth flow in Suspense.
  return (
    <Suspense fallback={
       <div className="h-screen w-full flex flex-col items-center justify-center bg-background text-foreground">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p>Iniciando aplicación...</p>
      </div>
    }>
      <SidebarProvider>
        <FamLocatorWrapper />
      </SidebarProvider>
    </Suspense>
  )
}

    