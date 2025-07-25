'use client';

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MemberManagement } from "./member-management";
import { SiteSettings as SiteSettingsForm } from "./site-settings";
import { ChatManagement } from "./chat-management";
import type { SiteSettings } from "@/lib/types";
import { getSiteSettings, saveSiteSettings } from "@/lib/actions";
import { Button } from "./ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type AdminPanelProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSettingsUpdate: (settings: SiteSettings) => void;
}

export function AdminPanel({ isOpen, onOpenChange, onSettingsUpdate }: AdminPanelProps) {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      getSiteSettings()
        .then(setSettings)
        .catch(() => {
          toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudieron cargar los ajustes del sitio."
          });
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, toast]);

  const handleSettingsChange = (newSettings: Partial<SiteSettings>) => {
    setSettings(prev => prev ? { ...prev, ...newSettings } : null);
  }

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      await saveSiteSettings(settings);
      onSettingsUpdate(settings);
      toast({
        title: 'Éxito',
        description: 'La configuración del sitio ha sido guardada.',
      });
      onOpenChange(false); // Close panel on successful save
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo guardar la configuración del sitio.'
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:w-[640px] sm:max-w-none flex flex-col p-0">
        <SheetHeader className="p-6">
          <SheetTitle>Panel de Administrador</SheetTitle>
          <SheetDescription>
            Gestiona los miembros de tu familia, la configuración del sitio y más.
          </SheetDescription>
        </SheetHeader>
        
        <Tabs defaultValue="members" className="w-full flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6">
            <TabsTrigger value="members">Miembros</TabsTrigger>
            <TabsTrigger value="settings">Ajustes</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
          </TabsList>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <>
                <TabsContent value="members" className="m-0 p-6">
                  <MemberManagement />
                </TabsContent>
                <TabsContent value="settings" className="m-0 p-6">
                  {settings && <SiteSettingsForm settings={settings} onSettingChange={handleSettingsChange} />}
                </TabsContent>
                <TabsContent value="chat" className="m-0 p-6">
                   {settings && <ChatManagement settings={settings} onSettingChange={handleSettingsChange} />}
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>
        
        <SheetFooter className="p-6 bg-card border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving || isLoading}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
        </SheetFooter>

      </SheetContent>
    </Sheet>
  )
}
