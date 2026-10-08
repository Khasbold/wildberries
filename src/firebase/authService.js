/**
 * Firebase Authentication – email/password + social + guest
 * Saves FCM token to Firestore when user logs in for push notifications
 */

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    signInAnonymously,
    signOut as fbSignOut,
    onAuthStateChanged,
    updateProfile,
    GoogleAuthProvider,
    FacebookAuthProvider,
    linkWithCredential,
    EmailAuthProvider,
} from 'firebase/auth'
import { doc, setDoc, getDoc, query, where, limit, getDocs, collection } from 'firebase/firestore'
import { auth, db } from './init.js'
import { getCustomerProfile, setCustomerProfile } from './db.js'
import { requestNotificationPermission, saveTokenLocally } from './notificationService.js'

const USERNAMES_COLLECTION = 'usernames'

function normalizeUsername(username) {
    return String(username || '').trim().toLowerCase()
}

/**
 * Save FCM token to Firestore for a user (for admin push notifications)
 */
export async function saveUserFcmToken(userId, token, user = null) {
    if (!userId || !token) return
    try {
        const ref = doc(db, 'customerTokens', userId)
        const snap = await getDoc(ref)
        const data = snap.exists() ? snap.data() : { tokens: [], updatedAt: null }
        const tokens = data.tokens || []
        if (!tokens.includes(token)) {
            tokens.push(token)
        }
        await setDoc(ref, {
            tokens,
            updatedAt: new Date().toISOString(),
            userId,
            email: user?.email || data.email || null,
            displayName: user?.displayName || data.displayName || null,
        })
    } catch (err) {
        console.warn('[Auth] Could not save FCM token to Firestore:', err)
    }
}

/**
 * After login: request FCM permission and save token to Firestore
 */
export async function registerFcmTokenForUser(user) {
    if (!user?.uid) return
    try {
        const token = await requestNotificationPermission()
        if (token) {
            saveTokenLocally(token)
            await saveUserFcmToken(user.uid, token, user)
        }
    } catch (err) {
        console.warn('[Auth] FCM registration failed:', err)
    }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    await registerFcmTokenForUser(cred.user)
    return cred.user
}

/**
 * Register new user with email and password
 */
export async function registerWithEmail(email, password, displayName = '') {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    if (displayName && cred.user) {
        await updateProfile(cred.user, { displayName })
    }
    await registerFcmTokenForUser(cred.user)
    return cred.user
}

/**
 * Register shopper account with explicit username + email + password.
 */
export async function registerCustomerWithUsername({ username, email, password, displayName = '' }) {
    const uname = normalizeUsername(username)
    if (!uname) throw new Error('Username is required')

    const usernameRef = doc(db, USERNAMES_COLLECTION, uname)
    const usernameSnap = await getDoc(usernameRef)
    if (usernameSnap.exists()) {
        const err = new Error('Username already taken')
        err.code = 'auth/username-already-in-use'
        throw err
    }

    const user = await registerWithEmail(email, password, displayName || uname)

    await setDoc(usernameRef, {
        username: uname,
        uid: user.uid,
        email: String(email || '').trim().toLowerCase(),
        displayName: displayName || uname,
        updatedAt: new Date().toISOString(),
    })

    await saveCustomerProfile(user.uid, {
        name: displayName || uname,
        email,
        phone: '',
        city: '',
        address: '',
    })

    return user
}

/**
 * Sign in shopper with username + password.
 */
export async function signInWithUsername(username, password) {
    const uname = normalizeUsername(username)
    if (!uname) throw new Error('Username is required')

    const direct = await getDoc(doc(db, USERNAMES_COLLECTION, uname))
    if (direct.exists()) {
        const email = direct.data()?.email
        if (email) return signInWithEmail(email, password)
    }

    const q = query(collection(db, USERNAMES_COLLECTION), where('username', '==', uname), limit(1))
    const snap = await getDocs(q)
    if (!snap.empty) {
        const email = snap.docs[0].data()?.email
        if (email) return signInWithEmail(email, password)
    }

    const err = new Error('User not found')
    err.code = 'auth/user-not-found'
    throw err
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle() {
    const provider = new GoogleAuthProvider()
    const result = await signInWithPopup(auth, provider)
    await registerFcmTokenForUser(result.user)
    return result.user
}

/**
 * Sign in with Facebook
 * Requires: Firebase Console → Auth → Sign-in method → Facebook (enable + add App ID/Secret)
 */
export async function signInWithFacebook() {
    const provider = new FacebookAuthProvider()
    const result = await signInWithPopup(auth, provider)
    await registerFcmTokenForUser(result.user)
    return result.user
}

/**
 * Continue as guest (anonymous auth)
 */
export async function signInAsGuest() {
    const cred = await signInAnonymously(auth)
    await registerFcmTokenForUser(cred.user)
    return cred.user
}

export function initPhoneRecaptcha() {
    throw new Error('Phone OTP auth is disabled for web client.')
}

export async function sendPhoneOtp() {
    throw new Error('Phone OTP auth is disabled for web client.')
}

export async function verifyPhoneOtp() {
    throw new Error('Phone OTP auth is disabled for web client.')
}

export function cleanupRecaptcha() {
    // no-op: phone OTP auth disabled
}

/**
 * Sign out
 */
export async function signOut() {
    await fbSignOut(auth)
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(callback) {
    return onAuthStateChanged(auth, callback)
}

/**
 * Get current user
 */
export function getCurrentUser() {
    return auth.currentUser
}

/**
 * Load customer profile from Firestore (name, phone, address, city, email)
 */
export async function loadCustomerProfile(uid) {
    if (!uid) return null
    return getCustomerProfile(uid)
}

/**
 * Save customer profile to Firestore
 */
export async function saveCustomerProfile(uid, data) {
    if (!uid) return
    await setCustomerProfile(uid, {
        name: data?.name ?? '',
        phone: data?.phone ?? '',
        email: data?.email ?? '',
        city: data?.city ?? '',
        address: data?.address ?? '',
    })
}

/**
 * Update user profile (display name, etc.) – use Firebase Auth updateProfile
 */
export async function updateUserProfile(updates) {
    const user = auth.currentUser
    if (!user) return
    const profile = {}
    if (updates.displayName !== undefined) profile.displayName = updates.displayName
    if (updates.photoURL !== undefined) profile.photoURL = updates.photoURL
    if (Object.keys(profile).length > 0) {
        await updateProfile(user, profile)
    }
}

/**
 * Link anonymous user to email/password (upgrade guest to full account)
 */
export async function linkAnonymousToEmail(email, password, displayName = '') {
    const user = auth.currentUser
    if (!user?.isAnonymous) throw new Error('Not an anonymous user')
    const cred = EmailAuthProvider.credential(email, password)
    const result = await linkWithCredential(user, cred)
    if (displayName) await updateProfile(result.user, { displayName })
    await registerFcmTokenForUser(result.user)
    return result.user
}
