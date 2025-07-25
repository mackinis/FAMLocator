'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Share2 } from 'lucide-react';
import { updateMyLocation } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';

type ShareLocationDialogProps = {
  currentCoords: { lat: number, lng: number } | null;
}

// NOTE: This component is currently not being used in the app.
// The location is now fetched automatically in fam-locator-client.tsx.
// It is kept here for potential future use, e.g., sharing a specific one-time location.
export function ShareLocationDialog({ currentCoords }: ShareLocationDialogProps) {
  const [open, setOpen] = useState(false);
  const [activity, setActivity] = useState('');
  const [label, setLabel] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    if (open && currentCoords) {
      // Fallback label since AI suggestion is removed
      setLabel('Ubicación actual');
    }
  }, [currentCoords, open]);
  
  const handleShare = async () => {
    if (!currentCoords) {
         toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No hay coordenadas de ubicación para compartir.',
         });
        return;
    }
    setIsSharing(true);
    try {
        await updateMyLocation('admin_user', currentCoords.lat, currentCoords.lng, label || 'Ubicación actual');
        toast({
            title: 'Ubicación Compartida',
            description: `Tu ubicación ha sido actualizada a "${label}".`,
        });
        setOpen(false);
        setActivity('');
        setLabel('');
    } catch(error) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No se pudo compartir tu ubicación.',
        });
        console.error("Error sharing location:", error);
    } finally {
        setIsSharing(false);
    }
  };
  
   const handleOpenChange = (newOpenState: boolean) => {
    setOpen(newOpenState);
    if (!newOpenState) {
        setActivity('');
        setLabel('');
    }
  }


  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Share2 className="mr-2 h-4 w-4" />
          Compartir Ubicación
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Comparte tu Ubicación</DialogTitle>
          <DialogDescription>
            Deja que tu familia sepa dónde estás. Agrega una actividad opcional para una etiqueta.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="activity" className="text-right">
              Actividad
            </Label>
            <Textarea
              id="activity"
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              placeholder="(Opcional) ej: Tomando un café"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="label" className="text-right">
              Etiqueta
            </Label>
            <div className="col-span-3 relative">
                <Input
                  id="label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  disabled={!currentCoords}
                  placeholder={!currentCoords ? 'Obteniendo ubicación...' : 'ej: Casa, Trabajo'}
                />
                {!currentCoords && <Loader2 className="absolute right-2 top-2 h-5 w-5 animate-spin text-muted-foreground" />}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSharing}>Cancelar</Button>
          <Button onClick={handleShare} disabled={isSharing || !currentCoords}>
            {isSharing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Compartir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
