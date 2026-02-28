import { useState } from 'react'
import { useSession } from '../modules/state/useSession.js'
import { Button } from './components/ui/Button.jsx'
import { Input } from './components/ui/Input.jsx'
import { Label } from './components/ui/Label.jsx'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/Card.jsx'

export default function LoginPage() {
    const { login } = useSession()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')

    function handleSubmit(e) {
        e.preventDefault()
        setError('')
        const result = login(username, password)
        if (!result.ok) {
            setError(result.error)
        }
    }

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center space-y-2">
                    <div className="mx-auto h-12 w-12 rounded-xl bg-slate-900 flex items-center justify-center">
                        <span className="text-white text-lg font-bold">WB</span>
                    </div>
                    <CardTitle className="text-xl">Admin Login</CardTitle>
                    <p className="text-sm text-slate-500">Sign in to your admin or store owner account</p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="Enter username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Enter password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        {error && (
                            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>
                        )}
                        <Button type="submit" className="w-full">Sign In</Button>
                    </form>

                    <div className="mt-6 border-t border-slate-200 pt-4">
                        <p className="text-xs text-slate-400 font-medium mb-2">Demo accounts:</p>
                        <div className="space-y-1.5 text-xs text-slate-500">
                            <div className="flex justify-between bg-slate-50 rounded px-2 py-1.5">
                                <span className="font-medium text-slate-700">SuperAdmin</span>
                                <span>superadmin / superadmin</span>
                            </div>
                            <div className="flex justify-between bg-slate-50 rounded px-2 py-1.5">
                                <span className="font-medium text-slate-700">Fashion Hub</span>
                                <span>admin1 / admin1</span>
                            </div>
                            <div className="flex justify-between bg-slate-50 rounded px-2 py-1.5">
                                <span className="font-medium text-slate-700">TechWorld</span>
                                <span>admin2 / admin2</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
