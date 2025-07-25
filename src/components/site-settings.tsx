'use client';

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, Link, Mail } from "lucide-react";
import type { SiteSettings } from "@/lib/types";
import { Separator } from "./ui/separator";
import { Textarea } from "./ui/textarea";

type SiteSettingsProps = {
    settings: SiteSettings;
    onSettingChange: (changedSettings: Partial<SiteSettings> | { colors: SiteSettings['colors'] } | { emailTemplates: SiteSettings['emailTemplates'] }) => void;
}

export function SiteSettings({ settings, onSettingChange }: SiteSettingsProps) {

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        onSettingChange({ [id]: value });
    }
    
    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        const colorType = id as keyof SiteSettings['colors'];
        onSettingChange({
            colors: {
                ...settings.colors,
                [colorType]: value
            }
        });
    }

    const handleEmailTemplateChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        const [template, field] = id.split('.');
        onSettingChange({
            emailTemplates: {
                ...settings.emailTemplates,
                [template]: {
                    ...settings.emailTemplates?.[template as keyof SiteSettings['emailTemplates']],
                    [field]: value
                }
            }
        });
    }

    const triggerColorPicker = (e: React.MouseEvent<HTMLDivElement>) => {
        const input = e.currentTarget.nextElementSibling as HTMLInputElement | null;
        input?.click();
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Ajustes del Sitio</CardTitle>
                <CardDescription>
                    Personaliza la apariencia y la información de tu aplicación FAMLocator.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="siteName">Nombre del Sitio</Label>
                    <Input id="siteName" value={settings.siteName} onChange={handleInputChange} />
                </div>
                
                <div className="space-y-4">
                    <Label>Colores de la App</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="primary">Primario</Label>
                            <div className="relative flex items-center">
                                <div onClick={triggerColorPicker} className="cursor-pointer p-3 rounded-l-md border border-r-0 border-input shadow-sm shadow-primary/50" style={{ backgroundColor: settings.colors?.primary }}></div>
                                <input id="primary" type="color" value={settings.colors?.primary} onChange={handleColorChange} className="absolute w-0 h-0 opacity-0" />
                                <Input id="primary" type="text" value={settings.colors?.primary} onChange={handleColorChange} className="rounded-l-none font-mono text-sm" />
                            </div>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="accent">Acento</Label>
                             <div className="relative flex items-center">
                                <div onClick={triggerColorPicker} className="cursor-pointer p-3 rounded-l-md border border-r-0 border-input" style={{ backgroundColor: settings.colors?.accent }}></div>
                                <input id="accent" type="color" value={settings.colors?.accent} onChange={handleColorChange} className="absolute w-0 h-0 opacity-0" />
                                <Input id="accent" type="text" value={settings.colors?.accent} onChange={handleColorChange} className="rounded-l-none font-mono text-sm" />
                            </div>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="background">Fondo</Label>
                             <div className="relative flex items-center">
                                <div onClick={triggerColorPicker} className="cursor-pointer p-3 rounded-l-md border border-r-0 border-input" style={{ backgroundColor: settings.colors?.background }}></div>
                                <input id="background" type="color" value={settings.colors?.background} onChange={handleColorChange} className="absolute w-0 h-0 opacity-0" />
                                <Input id="background" type="text" value={settings.colors?.background} onChange={handleColorChange} className="rounded-l-none font-mono text-sm" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <Label>Icono de la App</Label>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-glow">
                           {settings.iconUrl ? <img src={settings.iconUrl} alt="Icono del sitio" className="rounded-full h-full w-full object-cover" /> : <span className="text-primary-foreground font-bold text-xl">F</span>}
                        </div>
                        <div className="flex flex-col gap-2">
                             <Button variant="outline">
                                <Upload className="mr-2 h-4 w-4" />
                                Subir Icono
                            </Button>
                            <div className="relative">
                                <Input id="iconUrl" placeholder="O pega una URL de imagen" className="pl-8" value={settings.iconUrl} onChange={handleInputChange} />
                                <Link className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            </div>
                        </div>
                    </div>
                </div>
                 
                <Separator />

                 <div className="space-y-4">
                    <div className="flex items-center gap-2">
                         <Mail className="h-5 w-5" />
                         <Label>Plantillas de Email</Label>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="verification.subject" className="text-sm text-muted-foreground">Asunto del Email de Verificación</Label>
                        <Input id="verification.subject" value={settings.emailTemplates?.verification?.subject} onChange={handleEmailTemplateChange} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="verification.body" className="text-sm text-muted-foreground">Cuerpo del Email de Verificación</Label>
                        <Textarea id="verification.body" value={settings.emailTemplates?.verification?.body} onChange={handleEmailTemplateChange} rows={5}/>
                        <p className="text-xs text-muted-foreground">Usa {'{{token}}'} para insertar el token de verificación.</p>
                    </div>
                </div>

                <Separator />
                 
                <div className="space-y-4">
                    <Label>Información del Desarrollador</Label>
                    <div className="space-y-2">
                        <Label htmlFor="developerCreditText" className="text-xs text-muted-foreground">Texto de Crédito</Label>
                        <Input id="developerCreditText" placeholder="Desarrollado por" value={settings.developerCreditText} onChange={handleInputChange} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="developerName" className="text-xs text-muted-foreground">Nombre del Desarrollador</Label>
                        <Input id="developerName" placeholder="RchBytec Srl" value={settings.developerName} onChange={handleInputChange} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="developerUrl" className="text-xs text-muted-foreground">URL del Desarrollador</Label>
                        <Input id="developerUrl" placeholder="https://rchbytec.com.ar" value={settings.developerUrl} onChange={handleInputChange} />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="copyright">Texto de Copyright</Label>
                    <Input id="copyright" value={settings.copyright} onChange={handleInputChange} />
                </div>
            </CardContent>
        </Card>
    )
}
