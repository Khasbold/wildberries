import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { Link } from 'react-router-dom'
import { BookOpen, ShoppingBag, Package, QrCode, Truck, DollarSign, Bell, Settings, ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react'

const steps = [
    {
        icon: DollarSign,
        color: 'bg-amber-100 text-amber-600',
        title: 'Хамтадаа хөгжье - Бидний давуу тал',
        items: [
            'Бүх зүйлээ нэг дороос: Захиалга, Статистик, мөнгөн шилжүүлэг бүгдийг нэг платформоор удирдана',
            'Дэлгүүрээ хүссэнээрээ удирдах боломж: Статистик харах, Excel татах, Бараа нэмэх, захиалга хүлээн авах, хүргэлтээ баталгаажуулах гээд бүгдийг өөрөө шийднэ',
            'Дэлгүүр "А" маркетинг сайн хийгээд борлуулалт сайн байхад, Дэлгүүр "Б" сурталчилгалаа ер хийгээгүй байтал Дэлгүүр "А" гийн бүтээгдэхүүнийг авах гэж орж ирсэн худалдан авагч нь Дэлгүүр "Б"-гийн бараа таалагдсан тул бас худалдаад авах боломжтой, тус бүртээ ганцхан маркетингаа л хийж байхад хамтадаа хандалтаа ихэсгэж хөгжих боломжтой шүү',
            'Цаашдаа хүргэлтийн компанитай холбогдох боломж нээгдэнэ (аль болох оффис болон гэрээс тань хүргэлтийн ажилтан ирээд барааг тань аваад хүргэлт хийгдэх боломжтойг нь судална аа)',
        ],
    },
    {
        icon: Settings,
        color: 'bg-slate-100 text-slate-600',
        title: '1. Дэлгүүрийн тохиргоо',
        items: [
            'Админ → Дэлгүүрийн тохиргоо хэсэгт орж мэдээллээ бөглөнө үү',
            'Дэлгүүрийн нэр, лого, утасны дугаар, банкны данс оруулна',
            'Хүргэлтийн төлбөр тохируулна: Үнэгүй эсвэл тогтмол үнэ',
            'Банкны данс заавал оруулна — Bunny болсон захиалгын мөнгө энэ дансанд шилжинэ',
        ],
    },
    {
        icon: Package,
        color: 'bg-emerald-100 text-emerald-600',
        title: '2. Бараа нэмэх',
        items: [
            'Админ → Бараа → Шинэ бараа нэмэх дарна',
            'Гарчиг, үнэ, зураг, тайлбар, ангилал, нөөцийн тоо оруулна',
            'Бараа нэмсний дараа SuperAdmin зөвшөөрөхийг хүлээнэ',
            '"Зөвшөөрөгдсөн" статустай бараа л хэрэглэгчдэд харагдана',
            'Зөвшөөрөгдсөн/татгалзсан тухай мэдэгдэл ирнэ',
        ],
    },
    {
        icon: ShoppingBag,
        color: 'bg-blue-100 text-blue-600',
        title: '3. Захиалга хүлээн авах',
        items: [
            'Шинэ захиалга ирэхэд мэдэгдэл ирнэ',
            'Админ → Захиалгууд хэсэгт очиж "Хүлээн авах (Accept)" дарна',
            'Захиалгыг хүлээн авсан гэдгийг хэрэглэгчид мэдэгдэнэ',
        ],
    },
    {
        icon: Truck,
        color: 'bg-indigo-100 text-indigo-600',
        title: '4. Хүргэлт хийх',
        items: [
            'Хэрэглэгчийн хаяг захиалгын дэлгэрэнгүйд байна',
            'Барааг хүргээд дараах аргаар баталгаажуулна:',
        ],
        subSections: [
            {
                label: 'QR скан (auto) Дэлгүүрийн эзэн өөрөө',
                badge: 'QR',
                badgeColor: 'bg-emerald-100 text-emerald-700',
                desc: 'Хэрэглэгчийн QR кодыг Админ → QR скан хэсгээс уншуулна. Автоматаар "Delivered" болно.',
            },
            {
                label: 'Гар аргаар (manual) Cargo болон хүртэлтийн компанийн ажилтнуудаар хийх үед',
                badge: 'Гар',
                badgeColor: 'bg-amber-100 text-amber-700',
                desc: 'Захиалгын хүснэгт эсвэл дэлгэрэнгүй хэсгээс "Хүргэсэн (Delivered)" товч дарна.',
            },
        ],
    },
    {
        icon: DollarSign,
        color: 'bg-amber-100 text-amber-600',
        title: '5. Мөнгө хүлээн авах',
        items: [
            '"Delivered" болсон захиалгыг SuperAdmin шалгана',
            'SuperAdmin "Bunny" тэмдэглэхэд шимтгэл хасагдсан дүнг таны дансанд шилжүүлнэ',
            'Орлогын задаргааг захиалга тус бүрийн дэлгэрэнгүйгээс харах боломжтой',
        ],
    },
    {
        icon: Bell,
        color: 'bg-purple-100 text-purple-600',
        title: '6. Мэдэгдэл',
        items: [
            'Шинэ захиалга, хүргэлт баталгаажсан, Bunny баталгаажсан, бараа зөвшөөрөгдсөн/татгалзсан үед мэдэгдэл ирнэ',
            'Push notification идэвхжүүлэхийн тулд браузерийн мэдэгдэл идэвхжүүлнэ',
        ],
    },
]

export default function InstructionsPage() {
    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <div className="flex items-center gap-3">
                <Link to="/admin" className="text-slate-400 hover:text-slate-600">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <BookOpen size={22} className="text-brand" />
                        Заавар — Дэлгүүр эзэмшигчид
                    </h2>
                    <p className="text-sm text-slate-500">Платформыг хэрхэн ашиглах тухай дэлгэрэнгүй заавар</p>
                </div>
            </div>

            {/* Tier info */}
            <Card className="border-brand/20 bg-brand/5">
                <CardContent className="pt-5">
                    <p className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                        <DollarSign size={16} className="text-brand" />
                        Tier систем — Шимтгэлийн хувь
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                        {[
                            { name: 'Free', pct: '10%', color: 'border-slate-300' },
                            { name: 'Bronze', pct: '8%', color: 'border-amber-400' },
                            { name: 'Silver', pct: '6%', color: 'border-slate-400' },
                            { name: 'Gold', pct: '4%', color: 'border-yellow-500' },
                        ].map((t) => (
                            <div key={t.name} className={`rounded-xl border-2 ${t.color} bg-white p-3`}>
                                <p className="text-xs text-slate-500">{t.name}</p>
                                <p className="text-lg font-bold text-slate-900">{t.pct}</p>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-3">
                        Шимтгэл = (Захиалгын дүн − QPay 1% − Гүйлгээ хураамж ₮200) × Tier %
                    </p>
                </CardContent>
            </Card>

            {/* Steps */}
            {steps.map((step) => {
                const Icon = step.icon
                return (
                    <Card key={step.title}>
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-3 text-base">
                                <div className={`h-9 w-9 rounded-lg ${step.color} flex items-center justify-center shrink-0`}>
                                    <Icon size={18} />
                                </div>
                                {step.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <ul className="space-y-2 text-sm text-slate-700">
                                {step.items.map((item, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        {item.startsWith('Цаа') ? (<><AlertTriangle size={24} /></>) : (<CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />)}
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                            {step.subSections && (
                                <div className="mt-3 space-y-2 pl-5">
                                    {step.subSections.map((sub) => (
                                        <div key={sub.label} className="border border-slate-200 rounded-lg p-3">
                                            <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                                {sub.label}
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${sub.badgeColor}`}>{sub.badge}</span>
                                            </p>
                                            <p className="text-xs text-slate-600 mt-1">{sub.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )
            })}

            {/* Important notes */}
            <Card className="border-amber-200 bg-amber-50/50">
                <CardContent className="pt-5">
                    <p className="font-semibold text-amber-800 flex items-center gap-2 mb-3">
                        <AlertTriangle size={16} />
                        Анхаарах зүйлс
                    </p>
                    <ul className="space-y-2 text-sm text-amber-900">
                        <li className="flex items-start gap-2">
                            <span className="shrink-0">1.</span>
                            <span>Банкны данс заавал зөв оруулна уу - мөнгө энэ дансанд шилжинэ</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="shrink-0">2.</span>
                            <span>Барааны зургийг тод, чанартай оруулна уу</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="shrink-0">3.</span>
                            <span>Захиалга ирмэгц аль болох хурдан хүлээн авна уу</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="shrink-0">4.</span>
                            <span>QR скан хийх нь илүү найдвартай — гар аргаар тэмдэглэсэн хүргэлтийг SuperAdmin нэмэлт шалгалт хийнэ</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="shrink-0">5.</span>
                            <span>Асуудал гарвал idealogy0108@gmail.com хаягаар холбогдоно уу</span>
                        </li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    )
}
