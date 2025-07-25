'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { verifyTokenAndActivateUser, resendVerificationToken } from '@/lib/actions';
import { Loader2 } from 'lucide-react';

export function VerifyTokenForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleVerifyToken = async () => {
    if (token.length !== 24) {
       toast({
        variant: 'destructive',
        title: 'Error',
        description: 'El token debe tener 24 caracteres.',
      });
      return;
    }
    setIsLoading(true);
    try {
      const result = await verifyTokenAndActivateUser({ token }, 'es');
      if (result.success) {
        toast({
          title: 'Éxito',
          description: result.message,
        });
        router.push('/login');
      } else {
        toast({
          variant: 'destructive',
          title: 'Error de verificación',
          description: result.message,
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Ocurrió un error inesperado al verificar el token.',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleResendToken = async () => {
    if (!email) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Por favor, introduce tu correo electrónico.',
      });
      return;
    }
    setIsResending(true);
    try {
        const result = await resendVerificationToken({ email }, 'es');
        if (result.success) {
            toast({
                title: 'Correo enviado',
                description: result.message
            });
        } else {
             toast({
                variant: 'destructive',
                title: 'Error',
                description: result.message
            });
        }
    } catch (error) {
         toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Ocurrió un error inesperado al reenviar el token.',
        });
    } finally {
        setIsResending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardDescription>
          Hemos enviado un token de verificación a tu correo electrónico. Por favor, introdúcelo a continuación para activar tu cuenta.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="space-y-2">
          <Label htmlFor="token">Token de Verificación (24 caracteres)</Label>
          <Input 
            id="token" 
            type="text" 
            placeholder="Introduce tu token..." 
            value={token} 
            onChange={(e) => setToken(e.target.value)} 
            disabled={isLoading}
            maxLength={24}
          />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <Button className="w-full" onClick={handleVerifyToken} disabled={isLoading || isResending}>
           {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Verificar y Activar Cuenta
        </Button>
        <div className="w-full text-center text-sm text-muted-foreground">
            <p>¿No recibiste el token?</p>
        </div>
        <div className='w-full flex flex-col sm:flex-row gap-2 items-center'>
            <Input 
                id="emailForResend"
                type="email"
                placeholder="Introduce tu email para reenviar"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isResending || isLoading}
            />
            <Button variant="secondary" className="w-full sm:w-auto" onClick={handleResendToken} disabled={isResending || isLoading}>
                {isResending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reenviar
            </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
