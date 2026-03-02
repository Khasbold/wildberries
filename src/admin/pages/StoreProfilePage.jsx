import { useState, useRef } from 'react'
import { Store, Upload, Save, Camera } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Label } from '../components/ui/Label.jsx'
import { useAdmin } from '../../modules/state/useAdmin.js'

export default function StoreProfilePage() {
    const { session, updateStoreProfile } = useAdmin()
    const [storeName, setStoreName] = useState(session?.storeName || '')
    const [storeImage, setStoreImage] = useState(session?.storeImage || null)
    const [previewUrl, setPreviewUrl] = useState(session?.storeImage || null)
    const [saved, setSaved] = useState(false)
    const fileInputRef = useRef(null)

    function handleImageUpload(e) {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) return

        const reader = new FileReader()
        reader.onload = (ev) => {
            const dataUrl = ev.target.result
            setStoreImage(dataUrl)
            setPreviewUrl(dataUrl)
        }
        reader.readAsDataURL(file)
    }

    function handleRemoveImage() {
        setStoreImage(null)
        setPreviewUrl(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    function handleSave() {
        if (!storeName.trim()) return
        updateStoreProfile({ storeName: storeName.trim(), storeImage })
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h2 className="text-xl font-bold text-slate-900">Store Profile</h2>
                <p className="text-sm text-slate-500">Manage your store's public appearance — name and image shown to customers.</p>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Store size={20} className="text-slate-600" />
                        <CardTitle className="text-lg">Store Identity</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Store image */}
                    <div>
                        <Label className="mb-2 block">Store Image</Label>
                        <div className="flex items-start gap-5">
                            <div
                                className="relative group w-28 h-28 sm:w-36 sm:h-36 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-brand/50 transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {previewUrl ? (
                                    <>
                                        <img
                                            src={previewUrl}
                                            alt="Store"
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Camera size={24} className="text-white" />
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center gap-1 text-slate-400">
                                        <Upload size={28} />
                                        <span className="text-xs">Upload</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col gap-2 pt-1">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageUpload}
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload size={14} className="mr-1.5" />
                                    Choose Image
                                </Button>
                                {previewUrl && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                        onClick={handleRemoveImage}
                                    >
                                        Remove
                                    </Button>
                                )}
                                <p className="text-xs text-slate-400 max-w-[200px]">
                                    Upload a logo or image for your store. Shown on the stores listing and detail page.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Store name */}
                    <div>
                        <Label className="mb-1 block">Store Name</Label>
                        <Input
                            value={storeName}
                            onChange={(e) => setStoreName(e.target.value)}
                            placeholder="Enter your store name"
                            className="max-w-md"
                        />
                        <p className="text-xs text-slate-400 mt-1">This is displayed as the title of your store to customers.</p>
                    </div>

                    {/* Preview */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-3">Preview</p>
                        <div className="flex items-center gap-4">
                            {previewUrl ? (
                                <img
                                    src={previewUrl}
                                    alt="Store preview"
                                    className="w-14 h-14 rounded-xl object-cover border border-slate-200"
                                />
                            ) : (
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                                    {storeName?.slice(0, 2)?.toUpperCase() || 'ST'}
                                </div>
                            )}
                            <div>
                                <p className="font-semibold text-slate-900 text-lg">{storeName || 'Store Name'}</p>
                                <p className="text-sm text-slate-500">by {session?.name}</p>
                            </div>
                        </div>
                    </div>

                    {/* Save button */}
                    <div className="flex items-center gap-3">
                        <Button onClick={handleSave} disabled={!storeName.trim()}>
                            <Save size={14} className="mr-1.5" />
                            Save Profile
                        </Button>
                        {saved && (
                            <span className="text-sm text-emerald-600 font-medium animate-pulse">
                                ✓ Profile saved successfully!
                            </span>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
