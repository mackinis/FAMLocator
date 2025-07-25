'use server';

import 'dotenv/config';

import { getDb } from './firebase';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, writeBatch, query, where, limit, addDoc, serverTimestamp, or, Timestamp, deleteDoc } from 'firebase/firestore';
import nodemailer from 'nodemailer';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import es from '@/locales/es.json';
import en from '@/locales/en.json';
import type { FamilyMember, SiteSettings, LoginResult } from './types';

const translations = { es, en };
type Language = 'es' | 'en';

const getMessage = (lang: Language, key: string, fallback?: string): string => {
    const keys = key.split('.');
    let result: any = translations[lang];
    for(const k of keys) {
        result = result?.[k];
        if (result === undefined) return fallback ?? key;
    }
    return result;
}

export async function loginUser({email, password}: {email: string; password: string;}, lang: Language = 'es'): Promise<LoginResult> {
  const db = getDb();
  const provisionalEmail = process.env.ADMIN_EMAIL;
  const provisionalPassword = process.env.ADMIN_PASSWORD;

  // 1. Check for provisional login to setup admin account
  if (email === provisionalEmail && password === provisionalPassword) {
    const adminUserRef = doc(db, 'users', 'admin_user');
    const adminUserDoc = await getDoc(adminUserRef);
    if (!adminUserDoc.exists() || !adminUserDoc.data().email) {
        return { success: true, firstLogin: true, userId: 'admin_user', isAdmin: true };
    }
  }

  // 2. Definitive login for all users
  try {
    const q = query(collection(db, 'users'), where('email', '==', email), limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return { success: false, message: getMessage(lang, 'auth.invalidCredentialsError') };
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    const isPasswordValid = await bcrypt.compare(password, userData.password);
    if (!isPasswordValid) {
        return { success: false, message: getMessage(lang, 'auth.invalidCredentialsError') };
    }

    if (userData.status === 'pending') {
        if (userData.verificationToken) {
           return { success: false, needsVerification: true, message: getMessage(lang, 'auth.needsVerificationError') };
        }
        // Email is verified, but not authorized by admin
        return { success: false, message: getMessage(lang, 'auth.needsAdminApprovalError') };
    }

    if (userData.status === 'suspended') {
        return { success: false, message: getMessage(lang, 'auth.accountSuspendedError') };
    }
    
    if (userData.status === 'active') {
        // Log in successful, update online status
        const memberRef = doc(db, 'familyMembers', userDoc.id);
        const memberDoc = await getDoc(memberRef);
        if (memberDoc.exists()) {
            await updateDoc(memberRef, { isOnline: true });
        }
        return { success: true, firstLogin: false, userId: userDoc.id, isAdmin: userData.isAdmin === true };
    }
    
    return { success: false, message: getMessage(lang, 'auth.accountInactiveError') };

  } catch (error) {
    console.error("Error in loginUser:", error);
    return { success: false, message: getMessage(lang, 'auth.unexpectedError', 'Ocurrió un error inesperado.') };
  }
}

async function sendVerificationEmail(email: string, token: string, lang: Language) {
    const settings = await getSiteSettings();
    
    const subjectTemplate = settings.emailTemplates?.verification?.subject || getMessage(lang, 'auth.verificationSubject');
    const bodyTemplate = settings.emailTemplates?.verification?.body || getMessage(lang, 'auth.verificationHtmlBody');

    const subject = subjectTemplate.replace('{{token}}', token);
    const body = bodyTemplate.replace('{{token}}', token);

    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || "587"),
        secure: (process.env.EMAIL_PORT === '465'),
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    try {
        await transporter.sendMail({
            from: `FAMLocator <${process.env.EMAIL_FROM}>`,
            to: email,
            subject: subject,
            html: body,
        });
    } catch(error) {
         console.error("Error sending email:", error);
         throw new Error("Error de conexión con el servidor de correo. Por favor, inténtelo de nuevo más tarde.");
    }
}

function generateSecureToken() {
    return randomBytes(18).toString('base64url').substring(0, 24);
}


export async function registerUser(data: Record<string, FormDataEntryValue>, lang: Language = 'es') {
  const db = getDb();
  const { email, password, name, phone } = data;
  if (typeof email !== 'string' || typeof password !== 'string' || typeof name !== 'string') {
    return { success: false, message: "Datos de formulario inválidos." };
  }

  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where("email", "==", email), limit(1));
    const existingUserSnapshot = await getDocs(q);

    if (!existingUserSnapshot.empty) {
      const userDoc = existingUserSnapshot.docs[0];
      const userData = userDoc.data();
      if(userData.status === 'pending' && userData.verificationToken){
        const newVerificationToken = generateSecureToken();
        const newTokenExpiry = new Date(Date.now() + 3600000);
        await updateDoc(userDoc.ref, { verificationToken: newVerificationToken, tokenExpiry: newTokenExpiry });
        await sendVerificationEmail(email, newVerificationToken, lang);
        return { success: true, message: getMessage(lang, 'auth.verificationSent') };
      }
      return { success: false, message: "Ya existe un usuario con este correo electrónico." };
    }

    const verificationToken = generateSecureToken();
    const tokenExpiry = new Date(Date.now() + 3600000);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUserDoc = {
      name,
      phone: phone || '',
      email,
      password: hashedPassword,
      isAdmin: false,
      status: 'pending',
      verificationToken,
      tokenExpiry,
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(db, 'users'), newUserDoc);
    await sendVerificationEmail(email, verificationToken, lang);

    return { success: true, message: getMessage(lang, 'auth.verificationSent') };

  } catch (error) {
    console.error("Error registering user:", error);
    return { success: false, message: (error as Error).message || getMessage(lang, 'auth.unexpectedError', 'Ocurrió un error inesperado al registrar el usuario.') };
  }
}

export async function setupAdminAccount(data: Record<string, FormDataEntryValue>, lang: Language = 'es') {
    const db = getDb();
    const { email, password, name } = data;
    if (typeof email !== 'string' || typeof password !== 'string' || typeof name !== 'string') {
        return { success: false, message: "Datos de formulario inválidos." };
    }

    try {
        const adminUserRef = doc(db, 'users', 'admin_user');
        
        const verificationToken = generateSecureToken();
        const tokenExpiry = new Date(Date.now() + 3600000);
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await setDoc(adminUserRef, {
            name: name,
            email: email,
            password: hashedPassword,
            isAdmin: true,
            status: 'pending',
            verificationToken,
            tokenExpiry,
            createdAt: serverTimestamp(),
        });
        
        await sendVerificationEmail(email, verificationToken, lang);

        return { success: true, message: "Datos de administrador guardados. Se ha enviado un token de verificación a tu correo." };
    } catch (error) {
        console.error("Error setting up admin account:", error);
        return { success: false, message: "Ocurrió un error al configurar la cuenta de administrador." };
    }
}


export async function verifyTokenAndActivateUser({ token }: { token: string }, lang: Language = 'es') {
  const db = getDb();
  if (!token || token.length !== 24) {
    return { success: false, message: "El formato del token es inválido." };
  }
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where("verificationToken", "==", token), limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { success: false, message: "Token inválido o la cuenta ya ha sido activada." };
    }
    
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    const userRef = userDoc.ref;

    if(userData.tokenExpiry?.toDate() && new Date() > userData.tokenExpiry.toDate()) {
        return { success: false, message: "El token de verificación ha expirado. Por favor, solicita uno nuevo." };
    }
    

    if (userData.isAdmin) {
        const batch = writeBatch(db);
        batch.update(userRef, {
            status: 'active',
            verificationToken: null,
            tokenExpiry: null
        });

        const memberRef = doc(db, 'familyMembers', userDoc.id);
        batch.set(memberRef, {
            id: userDoc.id,
            name: userData.name || 'Admin',
            email: userData.email,
            avatar: 'https://placehold.co/150x150.png',
            location: {
              name: 'Ubicación Desconocida',
              lat: -34.723,
              lng: -58.254,
              timestamp: new Date().toISOString(),
            },
            isOnline: false,
            status: 'active',
            isSharingLocation: true,
            isChatEnabled: true,
            isAdmin: true,
        });

        const generalChatRef = doc(db, 'chats', 'general');
        const generalChatDoc = await getDoc(generalChatRef);

        if (!generalChatDoc.exists()) {
          batch.set(generalChatRef, {
              name: 'General',
              memberIds: [userDoc.id],
              isGroup: true,
              createdAt: serverTimestamp()
          });
        } else {
            const memberIds = generalChatDoc.data().memberIds || [];
            if (!memberIds.includes(userDoc.id)) {
                 batch.update(generalChatRef, {
                    memberIds: [...memberIds, userDoc.id]
                });
            }
        }

        await batch.commit();
        return { success: true, message: "Cuenta de administrador verificada. Ya puedes iniciar sesión." };
    } else {
        await updateDoc(userRef, {
            verificationToken: null,
            tokenExpiry: null
        });
        return { success: true, message: "Correo verificado. Tu cuenta está ahora pendiente de aprobación por el administrador." };
    }

  } catch (error) {
    console.error("Error verifying token:", error);
    return { success: false, message: "Ocurrió un error al verificar el token." };
  }
}

export async function authorizeUser(userId: string): Promise<{success: boolean, message?: string}> {
    const db = getDb();
    if (!userId) {
        return { success: false, message: "ID de usuario no válido." };
    }
    try {
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            return { success: false, message: "El usuario a autorizar no existe." };
        }

        const userData = userDoc.data();
        if (userData.status !== 'pending' || userData.verificationToken) {
            return { success: false, message: "El usuario no está pendiente de autorización o no ha verificado su correo." };
        }

        const batch = writeBatch(db);

        batch.update(userRef, { status: 'active' });

        const memberRef = doc(db, 'familyMembers', userId);
        batch.set(memberRef, {
            id: userId,
            name: userData.name || 'Nuevo Miembro',
            email: userData.email,
            avatar: 'https://placehold.co/150x150.png',
            location: {
              name: 'Ubicación Desconocida',
              lat: -34.723,
              lng: -58.254,
              timestamp: new Date().toISOString(),
            },
            isOnline: false,
            status: 'active',
            isSharingLocation: true,
            isChatEnabled: true,
            isAdmin: false,
        });

        // Add user to general chat
        const generalChatRef = doc(db, 'chats', 'general');
        const generalChatDoc = await getDoc(generalChatRef);
        if (generalChatDoc.exists()) {
            const memberIds = generalChatDoc.data().memberIds || [];
            if (!memberIds.includes(userId)) {
                batch.update(generalChatRef, {
                    memberIds: [...memberIds, userId]
                });
            }
        }
        
        await batch.commit();
        return { success: true };
    } catch(e) {
        console.error("Error authorizing user:", e);
        return { success: false, message: "Ocurrió un error al autorizar al usuario." };
    }
}


export async function resendVerificationToken({ email }: { email: string }, lang: Language = 'es') {
  const db = getDb();
  if (!email) {
    return { success: false, message: "Por favor, introduce tu correo electrónico." };
  }
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where("email", "==", email), where("status", "==", "pending"), limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { success: false, message: "No se encontró una cuenta pendiente con este correo o ya está activa." };
    }

    const userDoc = querySnapshot.docs[0];
    const userRef = userDoc.ref;
    
    if (!userDoc.data().verificationToken) {
        return { success: false, message: "Este correo ya fue verificado. La cuenta está esperando la aprobación del administrador."}
    }
    
    const verificationToken = generateSecureToken();
    const tokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    await updateDoc(userRef, {
      verificationToken,
      tokenExpiry,
    });

    await sendVerificationEmail(email, verificationToken, lang);

    return { success: true, message: "Se ha enviado un nuevo token de verificación a tu correo." };

  } catch(error) {
    console.error("Error resending token:", error);
    return { success: false, message: "Ocurrió un error al reenviar el token." };
  }
}

export async function getFamilyMembers(): Promise<FamilyMember[]> {
    try {
        const db = getDb();
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const familyMembersSnapshot = await getDocs(collection(db, 'familyMembers'));

        const familyMembersMap = new Map<string, FamilyMember>();
        familyMembersSnapshot.forEach(doc => {
            familyMembersMap.set(doc.id, { ...doc.data(), id: doc.id } as FamilyMember);
        });

        const allMembers: FamilyMember[] = usersSnapshot.docs.map(userDoc => {
            const userId = userDoc.id;
            const userData = userDoc.data();
            const familyMemberData = familyMembersMap.get(userId);

            if (familyMemberData) {
                // Combine data, giving precedence to familyMemberData, but ensuring status is from userDoc
                return { ...familyMemberData, status: userData.status, email: userData.email, name: userData.name };
            } else {
                // This is a user without a familyMember profile (likely pending)
                return {
                    id: userId,
                    name: userData.name || 'Usuario Pendiente',
                    email: userData.email,
                    avatar: 'https://placehold.co/150x150.png',
                    location: {
                        name: 'N/A',
                        lat: 0,
                        lng: 0,
                        timestamp: '',
                    },
                    isOnline: false,
                    status: userData.status as 'pending' | 'active' | 'suspended',
                    isSharingLocation: false,
                    isChatEnabled: false,
                    isAdmin: userData.isAdmin || false,
                };
            }
        });
        
        const adminMember = allMembers.find(m => m.isAdmin === true);
        const otherMembers = allMembers.filter(m => m.isAdmin !== true);

        const sortedMembers = otherMembers.sort((a, b) => {
            if (a.status === 'pending' && b.status !== 'pending') return -1;
            if (a.status !== 'pending' && b.status === 'pending') return 1;
            return a.name.localeCompare(b.name);
        });

        if (adminMember) {
            return [adminMember, ...sortedMembers];
        }
        
        return sortedMembers;

    } catch (error) {
        console.error('Error fetching family members:', error);
        throw error;
    }
}


export async function getSiteSettings(): Promise<SiteSettings> {
    const db = getDb();
    const defaultSettings: SiteSettings = {
        siteName: "FAMLocator",
        copyright: "© 2024 FAMLocator. Todos los derechos reservados.",
        iconUrl: "",
        colors: {
            primary: "#26A69A",
            accent: "#64B5F6",
            background: "#F5F5F5",
        },
        developerCreditText: "Desarrollado por",
        developerName: "RchBytec Srl",
        developerUrl: "https://rchbytec.com.ar",
        isChatEnabled: true,
        emailTemplates: {
            verification: {
                subject: 'Tu código de verificación para FAMLocator',
                body: '<p>Tu código de verificación es: <strong>{{token}}</strong></p>'
            }
        }
    };

    try {
        const settingsRef = doc(db, 'settings', 'site_config');
        const docSnap = await getDoc(settingsRef);

        if (docSnap.exists()) {
            const fetchedSettings = docSnap.data() as SiteSettings;
            // Deep merge for nested objects
            const settings = {
                ...defaultSettings,
                ...fetchedSettings,
                colors: {
                    ...defaultSettings.colors,
                    ...fetchedSettings.colors
                },
                emailTemplates: {
                    ...defaultSettings.emailTemplates,
                    ...fetchedSettings.emailTemplates,
                    verification: {
                        ...defaultSettings.emailTemplates.verification,
                        ...fetchedSettings.emailTemplates?.verification
                    }
                }
            };
            return settings;
        } else {
            await setDoc(settingsRef, defaultSettings);
            return defaultSettings;
        }
    } catch (error) {
        console.error("Error fetching site settings: ", error);
        throw error; // Re-throw to be caught by the client
    }
}


export async function saveSiteSettings(settings: SiteSettings): Promise<{success: boolean, message?: string}> {
    try {
        const db = getDb();
        const settingsRef = doc(db, 'settings', 'site_config');
        await setDoc(settingsRef, settings, { merge: true });
        return { success: true };
    } catch (error) {
        console.error("Error saving site settings:", error);
        return { success: false, message: "No se pudo guardar la configuración en la base de datos." };
    }
}

export async function updateMyProfile(userId: string, data: Partial<FamilyMember>): Promise<{success: boolean, message?: string, updatedUser?: FamilyMember}> {
    const db = getDb();
    if (!userId) {
        return { success: false, message: "ID de usuario no válido." };
    }
    try {
        const memberRef = doc(db, 'familyMembers', userId);
        const memberDoc = await getDoc(memberRef);

        if (!memberDoc.exists()) {
             return { success: false, message: "Usuario no encontrado." };
        }
        
        await updateDoc(memberRef, data);

        const updatedDoc = await getDoc(memberRef);
        const updatedUser = { ...updatedDoc.data(), id: updatedDoc.id } as FamilyMember;
        
        return { success: true, message: "Perfil actualizado con éxito.", updatedUser };

    } catch (error) {
        console.error("Error updating profile:", error);
        return { success: false, message: "No se pudo actualizar el perfil." };
    }
}

export async function updateMyLocation(userId: string, lat: number, lng: number, locationName: string): Promise<{success: boolean, message?: string}> {
    const db = getDb();
    if (!userId) {
        return { success: false, message: "ID de usuario no válido." };
    }
    try {
        const memberRef = doc(db, 'familyMembers', userId);
        const memberDoc = await getDoc(memberRef);

        if (!memberDoc.exists()) {
            return { success: false, message: "Usuario no encontrado." };
        }
        
        const newLocation = {
            name: locationName,
            lat,
            lng,
            timestamp: new Date().toISOString(),
        };

        await updateDoc(memberRef, { location: newLocation, isOnline: true });

        return { success: true };

    } catch (error) {
        console.error("Error updating location:", error);
        return { success: false, message: "No se pudo actualizar la ubicación." };
    }
}


export async function clearChatHistory(): Promise<{success: boolean, message?: string}> {
    const db = getDb();
    try {
        const chatsSnapshot = await getDocs(collection(db, "chats"));
        const batch = writeBatch(db);

        for (const chatDoc of chatsSnapshot.docs) {
            const messagesSnapshot = await getDocs(collection(db, 'chats', chatDoc.id, 'messages'));
            messagesSnapshot.forEach(messageDoc => {
                batch.delete(messageDoc.ref);
            });
        }
        
        await batch.commit();
        return { success: true };
    } catch (error) {
        console.error("Error clearing ALL chat history:", error);
        return { success: false, message: "No se pudo vaciar el historial de todos los chats." };
    }
}

export async function sendMessage(chatId: string, memberId: string, memberName: string, memberAvatar: string, text: string) {
    const db = getDb();
    if (!text.trim() || !chatId) return;

    try {
        const messagesColRef = collection(db, 'chats', chatId, 'messages');
        await addDoc(messagesColRef, {
            memberId,
            memberName,
            memberAvatar,
            text,
            timestamp: serverTimestamp(),
        });
    } catch (error) {
        console.error("Error sending message: ", error);
        throw new Error("Could not send message.");
    }
}

export async function getOrCreateChat(currentUserId: string, otherUserId: string): Promise<string> {
    const db = getDb();
    const memberIds = [currentUserId, otherUserId].sort(); // Sort to ensure consistent chat ID

    // Check if a chat between these two users already exists
    const q = query(
        collection(db, 'chats'),
        where('isGroup', '==', false),
        where('memberIds', '==', memberIds)
    );

    const chatSnapshot = await getDocs(q);

    if (!chatSnapshot.empty) {
        return chatSnapshot.docs[0].id;
    } else {
        // Create a new chat
        const otherUserDoc = await getDoc(doc(db, 'familyMembers', otherUserId));
        if (!otherUserDoc.exists()) {
            throw new Error('Other user does not exist.');
        }

        const newChat = {
            name: otherUserDoc.data().name,
            memberIds,
            isGroup: false,
            createdAt: serverTimestamp()
        };
        const chatDocRef = await addDoc(collection(db, 'chats'), newChat);
        return chatDocRef.id;
    }
}

export async function getChatsForUser(userId: string) {
    const db = getDb();
    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, where('memberIds', 'array-contains', userId));
    
    const querySnapshot = await getDocs(q);
    const chats: any[] = [];
    querySnapshot.forEach(doc => {
        const data = doc.data();
        // Convert Firestore Timestamps to serializable format (ISO string)
        if (data.createdAt && data.createdAt instanceof Timestamp) {
            data.createdAt = data.createdAt.toDate().toISOString();
        }
        chats.push({ id: doc.id, ...data });
    });

    // Ensure "General" chat is always first
    chats.sort((a, b) => {
        if (a.id === 'general') return -1;
        if (b.id === 'general') return 1;
        if (a.isGroup && !b.isGroup) return -1;
        if (!a.isGroup && b.isGroup) return 1;
        return 0; // or sort by name/date
    });

    return chats;
}

export async function deletePrivateChat(chatId: string, userId: string): Promise<{ success: boolean; message?: string }> {
    const db = getDb();
    try {
        const chatRef = doc(db, 'chats', chatId);
        const chatDoc = await getDoc(chatRef);

        if (!chatDoc.exists()) {
            return { success: false, message: "La conversación no existe." };
        }

        const chatData = chatDoc.data();
        if (chatData.isGroup) {
            return { success: false, message: "No se puede eliminar el chat general." };
        }

        if (!chatData.memberIds.includes(userId)) {
            return { success: false, message: "No tienes permiso para eliminar este chat." };
        }
        
        // Delete all messages in the subcollection first
        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const messagesSnapshot = await getDocs(messagesRef);
        const batch = writeBatch(db);
        messagesSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Then delete the chat document itself
        batch.delete(chatRef);

        await batch.commit();
        
        return { success: true };
    } catch (error) {
        console.error("Error deleting private chat:", error);
        return { success: false, message: "Ocurrió un error al eliminar la conversación." };
    }
}

export async function clearPrivateChatHistory(chatId: string): Promise<{ success: boolean; message?: string }> {
    const db = getDb();
    try {
        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const messagesSnapshot = await getDocs(messagesRef);

        if (messagesSnapshot.empty) {
            return { success: true }; // Nothing to clear
        }
        
        const batch = writeBatch(db);
        messagesSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        
        return { success: true };
    } catch (error) {
        console.error("Error clearing private chat history:", error);
        return { success: false, message: "Ocurrió un error al vaciar el historial." };
    }
}
