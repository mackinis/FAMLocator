'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { Separator } from './ui/separator';
import { registerUser } from '@/lib/actions';


export function RegisterForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    if (data.password !== data.confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Las contraseñas no coinciden.',
      });
      return;
    }
    if (typeof data.password === 'string' && data.password.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Contraseña insegura',
        description: 'La contraseña debe tener al menos 6 caracteres.',
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await registerUser(data, 'es');
      if (result.success) {
        toast({
          title: 'Registro casi completo',
          description: result.message,
        });
        router.push('/verify-token');
      } else {
        toast({
          variant: 'destructive',
          title: 'Error de registro',
          description: result.message,
        });
      }
    } catch (error) {
       toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Ocurrió un error inesperado al registrar la cuenta.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label htmlFor="firstName">Nombre y Apellido</Label>
            <Input id="name" name="name" required disabled={isLoading} />
          </div>

          <div className="space-y-2 mt-4">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" name="phone" type="tel" disabled={isLoading} />
          </div>

           <div className="space-y-2 mt-4">
            <Label htmlFor="email">Correo Electrónico</Label>
            <Input id="email" name="email" type="email" required disabled={isLoading} />
          </div>

          <Separator className="my-6" />

           <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Input id="password" name="password" type={showPassword ? "text" : "password"} required disabled={isLoading} />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="space-y-2 mt-4">
            <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
            <div className="relative">
              <Input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} required disabled={isLoading}/>
               <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrarse
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
