'use client';
import { useEffect, useState } from "react";
import { getFamilyMembers, authorizeUser } from "@/lib/actions";
import type { FamilyMember } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, UserPlus, CheckCircle, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "./ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ProfileDialog } from "./profile-dialog";


const statusVariant: { [key: string]: "default" | "secondary" | "destructive" } = {
  active: 'default',
  pending: 'secondary',
  suspended: 'destructive'
}

const statusText: { [key: string]: string } = {
    active: 'Activo',
    pending: 'Pendiente',
    suspended: 'Suspendido'
}

export function MemberManagement() {
    const [members, setMembers] = useState<FamilyMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthorizing, setIsAuthorizing] = useState<string | null>(null);
    const [viewingMember, setViewingMember] = useState<FamilyMember | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    const fetchMembers = async () => {
        try {
            setIsLoading(true);
            const fetchedMembers = await getFamilyMembers();
            setMembers(fetchedMembers);
            setError(null);
        } catch (err) {
            setError("No se pudieron cargar los miembros de la familia.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMembers();
    }, []);

    const handleAuthorize = async (memberId: string) => {
        setIsAuthorizing(memberId);
        try {
            const result = await authorizeUser(memberId);
            if (result.success) {
                toast({
                    title: "Usuario Autorizado",
                    description: "El miembro ha sido activado y ahora puede iniciar sesión."
                });
                await fetchMembers(); // Refresh the list
            } else {
                 toast({
                    variant: 'destructive',
                    title: "Error",
                    description: result.message || "No se pudo autorizar al usuario."
                });
            }
        } catch(e) {
            toast({
                variant: 'destructive',
                title: "Error Inesperado",
                description: "Ocurrió un error al procesar la autorización."
            });
        } finally {
            setIsAuthorizing(null);
        }
    }
    
    const handleProfileUpdate = (updatedUser: FamilyMember) => {
        setMembers(prevMembers => prevMembers.map(m => m.id === updatedUser.id ? updatedUser : m));
        // Also update viewing member to reflect changes immediately
        if (viewingMember?.id === updatedUser.id) {
            setViewingMember(updatedUser);
        }
    }


    if(error) {
        return <div className="text-destructive text-center">{error}</div>
    }

    return (
    <>
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Gestión de Miembros</CardTitle>
                        <CardDescription>Autoriza, suspende o elimina miembros de tu familia.</CardDescription>
                    </div>
                    <Button size="sm">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Añadir Miembro
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Última Ubicación</TableHead>
                            <TableHead><span className="sr-only">Acciones</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {members.map((member) => (
                            <TableRow key={member.id}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={member.avatar} alt={member.name} />
                                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                          <span>{member.name}</span>
                                          <span className="text-xs text-muted-foreground">{member.email || ''}</span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={statusVariant[member.status || 'pending'] || 'secondary'}>
                                        {statusText[member.status || 'pending']}
                                    </Badge>
                                </TableCell>
                                <TableCell>{member.location?.name || 'N/A'}</TableCell>
                                <TableCell>
                                     <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                        <Button aria-haspopup="true" size="icon" variant="ghost">
                                            {isAuthorizing === member.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <MoreHorizontal className="h-4 w-4" /> }
                                            <span className="sr-only">Toggle menu</span>
                                        </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                        {member.status === 'pending' && (
                                            <DropdownMenuItem onSelect={() => handleAuthorize(member.id)}>
                                                <CheckCircle className="mr-2 h-4 w-4" />
                                                Autorizar
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem onSelect={() => setViewingMember(member)}>
                                            Ver Perfil
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>Suspender</DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-destructive">Eliminar</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                )}
            </CardContent>
        </Card>
        {viewingMember && (
            <ProfileDialog
                isOpen={!!viewingMember}
                onOpenChange={(isOpen) => !isOpen && setViewingMember(null)}
                user={viewingMember}
                onProfileUpdate={handleProfileUpdate}
                isAdminView={true}
            />
        )}
    </>
    )
}
