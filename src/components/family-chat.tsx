'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2, GripHorizontal, X, MessageSquareOff } from 'lucide-react';
import type { Message, FamilyMember } from '@/lib/types';
import { getDb } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { sendMessage } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from './ui/skeleton';
import { type DragControls } from 'framer-motion';


type FamilyChatProps = {
  currentUser: FamilyMember | null;
  dragControls: DragControls;
  onClose: () => void;
}

export function FamilyChat({ currentUser, dragControls, onClose }: FamilyChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const isChatAllowedForCurrentUser = currentUser?.isChatEnabled ?? true;

  useEffect(() => {
    if (!currentUser) {
        setIsLoading(false);
        return;
    }
    const db = getDb();
    const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const msgs: Message[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          msgs.push({
            ...data,
            id: doc.id,
          } as Message);
        });
        setMessages(msgs);
        setIsLoading(false);
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
  }, [currentUser, toast]);

  useEffect(() => {
    // Auto-scroll to bottom
    if (scrollAreaRef.current) {
        const scrollableNode = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (scrollableNode) {
            scrollableNode.scrollTop = scrollableNode.scrollHeight;
        }
    }
  }, [messages]);


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !currentUser || !isChatAllowedForCurrentUser) return;

    setIsSending(true);
    try {
      await sendMessage(currentUser.id, currentUser.name, currentUser.avatar, newMessage);
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
  
  const formatTimestamp = (timestamp: any) => {
    if (timestamp instanceof Timestamp) {
      return formatDistanceToNow(timestamp.toDate(), { addSuffix: true, locale: es });
    }
    return "justo ahora";
  }


  return (
    <Card className="w-full h-full flex flex-col shadow-2xl resize-none overflow-hidden relative">
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 flex justify-center items-center cursor-grab active:cursor-grabbing z-10" 
        onPointerDown={(e) => dragControls.start(e)}
        style={{ touchAction: 'none' }}
        >
        <GripHorizontal className="text-muted-foreground" />
      </div>
       <Button variant="ghost" size="icon" onClick={onClose} className="absolute top-1 right-1 h-7 w-7 rounded-full z-10">
        <X className="h-4 w-4" />
      </Button>

      <CardHeader className="pt-8">
          <CardTitle className="text-center">Chat Familiar</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        {isLoading ? (
            <div className="space-y-4 p-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-20 w-3/4 self-end" />
                <Skeleton className="h-16 w-full" />
            </div>
        ) : (
        <ScrollArea className="h-full pr-4" ref={scrollAreaRef}>
          <div className="space-y-6">
            {messages.map((message) => {
              const isCurrentUser = message.memberId === currentUser?.id;
              return (
                <div
                  key={message.id}
                  className={`flex items-start gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={message.memberAvatar} />
                    <AvatarFallback>{message.memberName?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`rounded-lg p-3 max-w-xs md:max-w-sm ${
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
             {messages.length === 0 && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <p>No hay mensajes todavía.</p>
                    <p>¡Sé el primero en saludar!</p>
                </div>
            )}
          </div>
        </ScrollArea>
        )}
      </CardContent>
      <CardFooter>
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
                    disabled={!currentUser || isSending}
                />
                <Button type="submit" size="icon" disabled={!currentUser || isSending}>
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
            </form>
        )}
      </CardFooter>
    </Card>
  );
}
