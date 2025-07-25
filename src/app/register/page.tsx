import { RegisterForm } from '@/components/register-form';
import { MapPin } from 'lucide-react';
import Link from 'next/link';

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 py-8">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-8">
            <div className="bg-primary rounded-full p-3 mb-4">
                <MapPin className="text-primary-foreground h-8 w-8" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Crear una Cuenta</h1>
            <p className="text-muted-foreground mt-2">
              ¿Ya tienes una cuenta?{' '}
              <Link href="/login" className="font-semibold text-primary hover:underline">
                Inicia sesión
              </Link>
            </p>
        </div>
        <RegisterForm />
      </div>
    </main>
  );
}
