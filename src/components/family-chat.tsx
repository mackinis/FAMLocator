'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2, MessageSquareOff, Users, User, GripVertical, X, Trash2 } from 'lucide-react';
import type { Message, FamilyMember, Chat } from '@/lib/types';
import { getDb } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { sendMessage, deletePrivateChat, clearPrivateChatHistory } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';


type FamilyChatProps = {
  currentUser: FamilyMember;
  chats: Chat[];
  activeChat: Chat | null;
  onActiveChatChange: (chat: Chat | null) => void;
  onClose: () => void;
  familyMembers: FamilyMember[];
  onDragStart?: (e: React.MouseEvent) => void;
  onChatsUpdate: (chats: Chat[]) => void;
  onNewMessage: (chatId: string) => void;
};

function ChatContent({ chatId, currentUser, onNewMessage }: { chatId: string, currentUser: FamilyMember, onNewMessage: (chatId: string) => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const isInitialLoad = useRef(true);

  useEffect(() => {
    setIsLoading(true);
    isInitialLoad.current = true;
    const db = getDb();
    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy("timestamp", "asc"));
    
    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const msgs: Message[] = [];
        
        querySnapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const message = { ...change.doc.data(), id: change.doc.id } as Message;
                if (!isInitialLoad.current && message.memberId !== currentUser.id) {
                    onNewMessage(chatId);
                }
            }
        });

        querySnapshot.forEach((doc) => {
          const message = { ...doc.data(), id: doc.id } as Message
          msgs.push(message);
        });

        setMessages(msgs);
        setIsLoading(false);
        
        isInitialLoad.current = false;
      },
      (error) => {
        console.error("Error fetching messages: ", error);
        toast({
            variant: "destructive",
            title: "Error de Chat",
            description: "No se pudieron cargar los mensajes."
        });
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [chatId, toast, currentUser.id, onNewMessage]);

  useEffect(() => {
    if (scrollAreaRef.current) {
        const scrollableNode = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (scrollableNode) {
            scrollableNode.scrollTop = scrollableNode.scrollHeight;
        }
    }
  }, [messages]);

  const formatTimestamp = (timestamp: any) => {
    if (timestamp instanceof Timestamp) {
      return formatDistanceToNow(timestamp.toDate(), { addSuffix: true, locale: es });
    }
    return "justo ahora";
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-20 w-3/4 self-end" />
          <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <ScrollArea className="h-full pr-4" ref={scrollAreaRef}>
      <div className="space-y-4">
        {messages.map((message) => {
          const isCurrentUser = message.memberId === currentUser?.id;
          return (
            <div
              key={message.id}
              className={`flex items-start gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={message.memberAvatar} />
                <AvatarFallback>{message.memberName?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                <div
                  className={`rounded-lg p-2 max-w-xs md:max-w-sm ${
                    isCurrentUser
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                </div>
                <span className="text-xs text-muted-foreground mt-1">
                  {isCurrentUser ? "Tú" : message.memberName}, {formatTimestamp(message.timestamp)}
                </span>
              </div>
            </div>
          );
        })}
         {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-10">
                <p>No hay mensajes todavía.</p>
                <p>¡Sé el primero en saludar!</p>
            </div>
        )}
      </div>
    </ScrollArea>
  );
}


export function FamilyChat({ currentUser, chats, activeChat, onActiveChatChange, familyMembers, onDragStart, onChatsUpdate, onClose, onNewMessage }: FamilyChatProps) {
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const isChatAllowedForCurrentUser = currentUser?.isChatEnabled ?? true;

  const privateChats = chats.filter(c => !c.isGroup);
  const generalChat = chats.find(c => c.isGroup) || null;
  
  // This derived state determines which main tab ('general' or 'private') is active
  const activeMainTab = activeChat?.isGroup ? 'general' : 'private';

  const getChatName = (chat: Chat) => {
    if (chat.isGroup) {
      return chat.name;
    }
    const otherMemberId = chat.memberIds.find(id => id !== currentUser.id);
    const otherMember = familyMembers.find(m => m.id === otherMemberId);
    return otherMember ? otherMember.name : "Chat Privado";
  };
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !currentUser || !isChatAllowedForCurrentUser || !activeChat) return;

    setIsSending(true);
    try {
      await sendMessage(activeChat.id, currentUser.id, currentUser.name, currentUser.avatar, newMessage);
      setNewMessage('');
    } catch (error) {
       toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo enviar el mensaje."
        });
    } finally {
        setIsSending(false);
    }
  };

  const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    try {
        const result = await deletePrivateChat(chatId, currentUser.id);
        if (result.success) {
            toast({ title: "Éxito", description: "La conversación ha sido eliminada." });
            const updatedChats = chats.filter(c => c.id !== chatId);
            onChatsUpdate(updatedChats);
            if (activeChat?.id === chatId) {
                onActiveChatChange(generalChat);
            }
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.message });
        }
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: "Ocurrió un error inesperado al eliminar el chat." });
    }
  };
  
  const handleClearChatHistory = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    try {
      const result = await clearPrivateChatHistory(chatId);
      if (result.success) {
        toast({ title: 'Éxito', description: 'El historial de este chat ha sido vaciado.' });
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
      }
    } catch (error) {
       toast({ variant: 'destructive', title: 'Error', description: "No se pudo vaciar el historial." });
    }
  };

  return (
    <Card className="w-full h-full flex flex-col shadow-2xl resize-none overflow-hidden relative">
      <CardHeader className="p-0 flex-shrink-0">
        <div className="flex items-center border-b" onMouseDown={!isMobile ? onDragStart : undefined}>
          {!isMobile && (
            <div className="cursor-move p-4 text-muted-foreground">
              <GripVertical />
            </div>
          )}
          <div className="flex-1 p-2">
            <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground w-full">
               <button
                  onClick={() => onActiveChatChange(generalChat)}
                  className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex-1",
                    activeMainTab === 'general' ? "bg-background text-foreground shadow-sm" : ""
                  )}
               >
                  <Users className="mr-2 h-4 w-4" /> General
               </button>
               <button
                  onClick={() => {
                      if (privateChats.length > 0 && activeMainTab !== 'private') {
                          onActiveChatChange(privateChats[0]);
                      }
                  }}
                  disabled={privateChats.length === 0}
                  className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex-1",
                    activeMainTab === 'private' ? "bg-background text-foreground shadow-sm" : ""
                  )}
               >
                   <User className="mr-2 h-4 w-4" /> Privados
               </button>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="mr-2" onClick={onClose}>
            <X className="h-4 w-4" />
            <span className="sr-only">Cerrar chat</span>
          </Button>
        </div>

        {activeMainTab === 'private' && privateChats.length > 0 && (
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex space-x-1 p-2 border-b items-start">
              {privateChats.map(chat => (
                <div
                  key={chat.id}
                  onClick={() => onActiveChatChange(chat)}
                  className="p-2 rounded-md cursor-pointer hover:bg-muted/50 flex flex-col items-center gap-1.5 transition-colors"
                >
                  <span
                    className={cn(
                      "text-xs font-medium",
                      activeChat?.id === chat.id ? "text-foreground font-bold" : "text-muted-foreground"
                    )}
                  >
                    {getChatName(chat)}
                  </span>
                  <div className="flex items-center gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full" title="Vaciar chat" onClick={(e) => e.stopPropagation()}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Vaciar historial?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esto eliminará todos los mensajes de esta conversación para siempre. Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={(e) => handleClearChatHistory(e, chat.id)}>Sí, vaciar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full" title="Eliminar chat" onClick={(e) => e.stopPropagation()}>
                          <X className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar conversación?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esto eliminará la conversación para todos los participantes. Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={(e) => handleDeleteChat(e, chat.id)}>Sí, eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden p-4">
        {activeChat ? (
            <ChatContent chatId={activeChat.id} currentUser={currentUser} onNewMessage={onNewMessage} />
        ) : (
            <div className="w-full h-full flex flex-col items-center justify-center">
                <div className="text-center text-muted-foreground">
                    <MessageSquareOff className="mx-auto h-12 w-12" />
                    <h3 className="mt-4 text-lg font-medium">No hay chat activo</h3>
                    <p className="mt-1 text-sm">
                        Selecciona una conversación o inicia una nueva.
                    </p>
                </div>
            </div>
        )}
      </CardContent>
      <CardFooter className="p-4 border-t flex-shrink-0">
        {!isChatAllowedForCurrentUser ? (
             <div className="w-full text-center text-sm text-muted-foreground p-4 bg-muted rounded-md flex items-center justify-center gap-2">
                <MessageSquareOff className="h-4 w-4" />
                <span>El administrador ha desactivado el chat para ti.</span>
            </div>
        ) : (
            <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
                <Input
                    type="text"
                    placeholder="Escribe un mensaje..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={!currentUser || isSending || !activeChat}
                />
                <Button type="submit" size="icon" disabled={!currentUser || isSending || !activeChat}>
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
            </form>
        )}
      </CardFooter>
    </Card>
  );
}
