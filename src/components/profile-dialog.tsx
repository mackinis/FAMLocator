'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, User, Upload, Link as LinkIcon, Share2, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { FamilyMember } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { updateMyProfile } from '@/lib/actions';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';

type ProfileDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  user: FamilyMember;
  onProfileUpdate: (updatedUser: FamilyMember) => void;
  isAdminView?: boolean;
};

export function ProfileDialog({ isOpen, onOpenChange, user, onProfileUpdate, isAdminView = false }: ProfileDialogProps) {
  const [name, setName] = useState(user.name);
  const [avatarUrl, setAvatarUrl] = useState(user.avatar);
  const [isSharingLocation, setIsSharingLocation] = useState(user.isSharingLocation ?? true);
  const [isChatEnabled, setIsChatEnabled] = useState(user.isChatEnabled ?? true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(user.name);
    setAvatarUrl(user.avatar);
    setIsSharingLocation(user.isSharingLocation ?? true);
    setIsChatEnabled(user.isChatEnabled ?? true);
  }, [user]);
  
  const handleSave = async () => {
    setIsSaving(true);
    try {
        const result = await updateMyProfile(user.id, {
          name, 
          avatar: avatarUrl, 
          isSharingLocation,
          isChatEnabled,
        });

        if (result.success && result.updatedUser) {
            toast({
                title: 'Éxito',
                description: 'El perfil ha sido actualizado.',
            });
            onProfileUpdate(result.updatedUser);
            onOpenChange(false);
        } else {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: result.message || 'No se pudo actualizar el perfil.',
            });
        }
    } catch (error) {
         toast({
            variant: 'destructive',
            title: 'Error Inesperado',
            description: 'Ocurrió un error al guardar el perfil.',
        });
    } finally {
        setIsSaving(false);
    }
  };
  
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isAdminView ? `Perfil de ${user.name}` : 'Mi Perfil'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 ring-4 ring-primary/50 shadow-glow">
                    <AvatarImage src={avatarUrl} alt={name} />
                    <AvatarFallback>
                        <User className="h-10 w-10" />
                    </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-2 w-full">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      accept="image/*"
                    />
                    <Button variant="outline" onClick={handleUploadClick}>
                        <Upload className="mr-2 h-4 w-4" />
                        Subir Foto
                    </Button>
                    <div className="relative">
                        <Input id="avatarUrl" placeholder="O pega una URL de imagen" className="pl-8" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
                        <LinkIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={user.email || ''} disabled />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label htmlFor="location-sharing" className="font-semibold flex items-center gap-2">
                      <Share2 className='h-4 w-4' />
                      Compartir Ubicación
                  </Label>
                  <Switch
                      id="location-sharing"
                      checked={isSharingLocation}
                      onCheckedChange={setIsSharingLocation}
                      disabled={isSaving || (user.isAdmin && !isAdminView)}
                  />
              </div>
              {user.isAdmin && (
                  <p className='text-xs text-muted-foreground text-center -mt-3'>
                      La ubicación del administrador siempre es visible.
                  </p>
              )}

              {isAdminView && !user.isAdmin && (
                <div className="flex items-center justify-between rounded-lg border p-3">
                    <Label htmlFor="chat-enabled" className="font-semibold flex items-center gap-2">
                        <MessageSquare className='h-4 w-4' />
                        Habilitar Chat
                    </Label>
                    <Switch
                        id="chat-enabled"
                        checked={isChatEnabled}
                        onCheckedChange={setIsChatEnabled}
                        disabled={isSaving}
                    />
                </div>
              )}
            </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isSaving}>
             {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
