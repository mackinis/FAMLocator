import { LoginForm } from '@/components/login-form';
import { getSiteSettings } from '@/lib/actions';
import { MapPin } from 'lucide-react';
import Link from 'next/link';

export default async function LoginPage() {
  const settings = await getSiteSettings();

  return (
    <div className="flex min-h-screen flex-col bg-background p-4">
      <main className="flex-1 flex flex-col items-center justify-center">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center text-center mb-8">
              <div className="bg-primary rounded-full p-3 mb-4 shadow-glow">
                  <MapPin className="text-primary-foreground h-8 w-8" />
              </div>
              <h1 className="text-3xl font-bold text-foreground tracking-wider" style={{ textShadow: '0 0 10px hsl(var(--primary))' }}>
                  {settings.siteName || 'FAMLocator'}
              </h1>
          </div>
          <LoginForm />
           <p className="mt-4 text-center text-sm text-muted-foreground">
            ¿No tienes una cuenta?{' '}
            <Link href="/register" className="font-semibold text-primary hover:underline">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </main>
      <footer className="py-4 text-center text-xs text-muted-foreground">
        <p>{settings.copyright}</p>
        {settings.developerName && settings.developerUrl && (
            <p>
              {settings.developerCreditText || 'Desarrollado por'}{' '}
              <a href={settings.developerUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                {settings.developerName}
              </a>
            </p>
        )}
      </footer>
    </div>
  );
}
