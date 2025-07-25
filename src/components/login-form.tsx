'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { loginUser } from '@/lib/actions';
import { Loader2, Eye, EyeOff } from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const result = await loginUser({ email, password }, 'es');
      if (result.success) {
        if (result.firstLogin) {
          router.push('/setup'); 
        } else {
          // Pass the user data to the main page via query params.
          // This is the most reliable way without a full session system.
          const queryParams = new URLSearchParams({
            userId: result.userId!,
            isAdmin: result.isAdmin!.toString(),
          }).toString();
          router.push(`/?${queryParams}`);
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Error de inicio de sesión',
          description: result.message,
        });
        if (result.needsVerification) {
            router.push('/verify-token');
        }
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Ocurrió un error inesperado.',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // TODO: Add forgot password functionality
  // const handleForgotPassword = async () => {
  //   //...
  // };

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-2">
          <Label htmlFor="email">Correo Electrónico</Label>
          <Input id="email" type="email" placeholder="nombre@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading}/>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <div className="relative">
            <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} onKeyDown={(e) => e.key === 'Enter' && handleLogin()}/>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <Button className="w-full shadow-glow" onClick={handleLogin} disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Iniciar Sesión
        </Button>
      </CardFooter>
    </Card>
  );
}
