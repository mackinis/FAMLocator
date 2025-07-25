'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast';
import { clearChatHistory } from '@/lib/actions';
import { Switch } from './ui/switch';
import type { SiteSettings } from '@/lib/types';

type ChatManagementProps = {
  settings: SiteSettings;
  onSettingChange: (changedSettings: Partial<SiteSettings>) => void;
}

export function ChatManagement({ settings, onSettingChange }: ChatManagementProps) {
  const [isClearing, setIsClearing] = useState(false);
  const { toast } = useToast();

  const handleClearChat = async () => {
    setIsClearing(true);
    try {
      await clearChatHistory();
      toast({
        title: 'Éxito',
        description: 'El historial del chat ha sido vaciado.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo vaciar el historial del chat.',
      });
       console.error("Error clearing chat history:", error);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestión del Chat</CardTitle>
        <CardDescription>
          Modera y gestiona las funcionalidades del chat familiar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <h3 className="font-semibold">Habilitar Chat</h3>
            <p className="text-sm text-muted-foreground">
              Activa o desactiva la función de chat para todos los miembros.
            </p>
          </div>
          <Switch
              checked={settings.isChatEnabled}
              onCheckedChange={(isChecked) => onSettingChange({ isChatEnabled: isChecked })}
              aria-label="Toggle Chat"
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <h3 className="font-semibold">Vaciar Historial del Chat</h3>
            <p className="text-sm text-muted-foreground">
              Esto eliminará permanentemente todos los mensajes para todos los miembros.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isClearing}>
                {isClearing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                )}
                Vaciar Chat
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. Esto eliminará permanentemente
                  todo el historial de chat de nuestros servidores.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearChat}>
                  Sí, vaciar historial
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
