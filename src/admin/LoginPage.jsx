import { useState } from 'react'
import { signInWithEmail, signOut, registerWithEmail } from '../firebase/authService.js'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from './components/ui/Button.jsx'
import { Input } from './components/ui/Input.jsx'
import { Label } from './components/ui/Label.jsx'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/Card.jsx'
import { getStaffUserByFirebaseUser, registerStaffStoreOwnerProfile } from '../firebase/db.js'
import { setAdminSessionFromStaffProfile, clearAdminSession, mergeStaffUserIntoLocalStore, addAdminNotification } from '../modules/state/store.js'

export default function LoginPage() {
    const navigate = useNavigate()
    const [mode, setMode] = useState('signin')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [storeName, setStoreName] = useState('')
    const [ownerName, setOwnerName] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            if (mode === 'register') {
                if (!storeName.trim()) {
                    setError('Store name is required.')
                    setLoading(false)
                    return
                }
                if (password.length < 6) {
                    setError('Password must be at least 6 characters.')
                    setLoading(false)
                    return
                }
                const user = await registerWithEmail(email.trim(), password, ownerName.trim() || storeName.trim())
                try {
                    const profile = await registerStaffStoreOwnerProfile(user, {
                        storeName: storeName.trim(),
                        ownerName: ownerName.trim(),
                    })
                    mergeStaffUserIntoLocalStore(profile)
                    setAdminSessionFromStaffProfile(profile)
                    // Notify superadmin about new store owner registration
                    addAdminNotification({
                        storeId: '__superadmin__',
                        storeName: profile.storeName || storeName.trim(),
                        title: '🏪 Шинэ дэлгүүр бүртгэгдлээ',
                        body: `"${profile.storeName || storeName.trim()}" дэлгүүр бүртгүүллээ. Эзэмшигч: ${profile.name || ownerName.trim() || email.trim()}`,
                        type: 'new_store_registered',
                    })
                    navigate('/admin', { replace: true })
                } catch (inner) {
                    await signOut().catch(() => {})
                    throw inner
                }
                return
            }

            const user = await signInWithEmail(email.trim(), password)
            const staff = await getStaffUserByFirebaseUser(user)
            if (!staff) {
                clearAdminSession()
                await signOut().catch(() => {})
                setError('This account is not authorized for the admin panel. Register as a store owner or use an invited account.')
                return
            }
            if (staff.disabled) {
                clearAdminSession()
                await signOut().catch(() => {})
                setError(staff.disabledReason || 'Your store has been disabled by the administrator. Contact support for more information.')
                return
            }
            setAdminSessionFromStaffProfile(staff)
            navigate('/admin', { replace: true })
        } catch (err) {
            const code = err?.code || ''
            if (code === 'auth/email-already-in-use') {
                setError('This email is already registered. Sign in instead.')
            } else if (err?.code === 'ALREADY_REGISTERED' || err?.message === 'ALREADY_REGISTERED') {
                setError('This account already has a store. Sign in.')
            } else if (code === 'permission-denied' || err?.message?.includes('permission')) {
                setError(
                    'Could not save your store profile in Firestore (permission denied). Deploy the rules in firestore.rules: run firebase deploy --only firestore:rules from this project.',
                )
            } else {
                setError(err?.message || 'Something went wrong. Check email, password, and Firestore rules for the users collection.')
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#F7E9D7] via-white to-[#F7E9D7]/80">
            <Card className="w-full max-w-md rounded-3xl border-brand/15 shadow-card-elevated animate-scale-in hover:shadow-card-elevated">
                <CardHeader className="text-center space-y-2">
                    <div className="mx-auto h-20 w-20 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-soft">
                        <img src="/logo3.png" alt="Catalog" className="w-20 h-20" />
                    </div>

                    <CardTitle className="text-xl text-slate-900">Дэлгүүрийн эзэн нэвтрэх</CardTitle>
                    <p className="text-sm text-slate-600">
                        {mode === 'signin' ? (
                            <>
                            </>
                        ) : (
                            <>
                                Дэлгүүр үүсгэхэд үнэгүй ба <strong>Free</strong> tier түвшинтэй нээгдэнэ. Та бүртгүүлсний дараа админы удирдлага руу нэвтрэх болно.
                            </>
                        )}
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="flex rounded-xl border border-brand/15 bg-brand-50/40 p-1 mb-4 text-sm font-medium shadow-inner-soft">
                        <button
                            type="button"
                            className={`flex-1 py-2 rounded-lg transition-all duration-200 ease-spring ${mode === 'signin' ? 'bg-gradient-to-br from-brand to-brand-dark text-white shadow-brand-sm' : 'text-slate-600 hover:bg-white/70'}`}
                            onClick={() => { setMode('signin'); setError('') }}
                        >
                            Нэвтрэх
                        </button>
                        <button
                            type="button"
                            className={`flex-1 py-2 rounded-lg transition-all duration-200 ease-spring ${mode === 'register' ? 'bg-[#4B7F4D] text-white shadow-soft' : 'text-slate-600 hover:bg-white/70'}`}
                            onClick={() => { setMode('register'); setError('') }}
                        >
                            Дэлгүүр үүсгэх
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {mode === 'register' && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="admin-store">Дэлгүүрийн нэр</Label>
                                    <Input
                                        id="admin-store"
                                        type="text"
                                        autoComplete="organization"
                                        placeholder="My Bunny Shop"
                                        value={storeName}
                                        onChange={(e) => setStoreName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="admin-owner">Таны нэр (optional)</Label>
                                    <Input
                                        id="admin-owner"
                                        type="text"
                                        autoComplete="name"
                                        placeholder="Jane Doe"
                                        value={ownerName}
                                        onChange={(e) => setOwnerName(e.target.value)}
                                    />
                                </div>
                            </>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="admin-email">Емайл</Label>
                            <Input
                                id="admin-email"
                                type="email"
                                autoComplete="username"
                                placeholder="Захиалгын мэдээлэл емайл рүү очих тул үнэн зөв емайл оруулна уу"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="admin-password">Нууц үг</Label>
                            <Input
                                id="admin-password"
                                type="password"
                                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={mode === 'register' ? 6 : undefined}
                            />
                            {mode === 'register' && <p className="text-xs text-slate-500">Хамгийн багадаа 6 тэмдэгт.</p>}
                        </div>
                        {error && (
                            <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-xl border border-red-100 border-l-4 border-l-red-400 shadow-soft animate-fade-in">{error}</p>
                        )}
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Please wait…' : mode === 'register' ? 'Дэлгүүр үүсгэх' : 'Нэвтрэх'}
                        </Button>
                    </form>

                    <p className="mt-6 text-center text-sm text-slate-500">
                        <Link to="/" className="text-[#4B7F4D] font-medium hover:underline">
                            ← Буцах дэлгүүр лүү
                        </Link>
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
