import { VerifyTokenForm } from '@/components/verify-token-form';
import { MapPin } from 'lucide-react';

export default function VerifyTokenPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-8">
            <div className="bg-primary rounded-full p-3 mb-4">
                <MapPin className="text-primary-foreground h-8 w-8" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Verificar Cuenta</h1>
        </div>
        <VerifyTokenForm />
      </div>
    </main>
  );
}
