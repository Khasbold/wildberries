/**
 * Staff `users.loginEmail` may differ from Firebase Auth email (e.g. .web vs .app).
 * Each inner array is one logical mailbox — any address matches the same Firestore row.
 */
export const LOGIN_EMAIL_ALIAS_GROUPS = [
    ['superbunny@demo.web', 'superbunny@demo.app'],
]
