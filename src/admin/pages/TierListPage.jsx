import React from 'react'
import { Crown, Medal, Gem, ShieldCheck, Check, Star } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/Card.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { TIER_PLANS } from '../../modules/state/store.js'
import { useSession } from '../../modules/state/useSession.js'
import { useAdmin } from '../../modules/state/useAdmin.js'

const tierIcons = {
    free: ShieldCheck,
    bronze: Medal,
    silver: Gem,
    gold: Crown,
}

const tierGradients = {
    free: 'from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900',
    bronze: 'from-amber-100 to-amber-200 dark:from-amber-900 dark:to-amber-950',
    silver: 'from-gray-100 to-gray-300 dark:from-gray-700 dark:to-gray-800',
    gold: 'from-yellow-100 to-yellow-200 dark:from-yellow-900 dark:to-yellow-950',
}

const tierBorders = {
    free: 'border-slate-300 dark:border-slate-600',
    bronze: 'border-amber-400 dark:border-amber-600',
    silver: 'border-gray-400 dark:border-gray-500',
    gold: 'border-yellow-400 dark:border-yellow-500',
}

const tierBadgeVariants = {
    free: 'bg-slate-200 text-slate-800',
    bronze: 'bg-amber-200 text-amber-900',
    silver: 'bg-gray-300 text-gray-800',
    gold: 'bg-yellow-200 text-yellow-900',
}

const tierIconColors = {
    free: 'text-slate-500',
    bronze: 'text-amber-600',
    silver: 'text-gray-500',
    gold: 'text-yellow-500',
}

export default function TierListPage() {
    const { isSuperAdmin, tier } = useSession()
    const { buyTierForCurrentStore } = useAdmin()
    const plans = Object.values(TIER_PLANS)

    const handleBuy = (tierId) => {
        if (isSuperAdmin) return
        buyTierForCurrentStore(tierId)
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Tier Plans</h1>
                <p className="text-muted-foreground mt-1">
                    {isSuperAdmin
                        ? 'Overview of available tiers. Manage store owner tiers from the Store Owners page.'
                        : 'Choose a plan that fits your store. Upgrade anytime to unlock more products and features.'}
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {plans.map((plan) => {
                    const Icon = tierIcons[plan.id]
                    const isCurrent = tier === plan.id
                    const isUpgrade = !isSuperAdmin && !isCurrent

                    return (
                        <Card
                            key={plan.id}
                            className={`relative overflow-hidden border-2 transition-shadow hover:shadow-lg ${
                                isCurrent ? tierBorders[plan.id] + ' shadow-md' : 'border-border'
                            }`}
                        >
                            {/* Gradient Header */}
                            <div className={`bg-gradient-to-br ${tierGradients[plan.id]} px-6 pt-6 pb-4 text-center`}>
                                {isCurrent && (
                                    <Badge className={`absolute top-3 right-3 ${tierBadgeVariants[plan.id]}`}>
                                        Current
                                    </Badge>
                                )}
                                <Icon className={`mx-auto h-10 w-10 mb-3 ${tierIconColors[plan.id]}`} />
                                <CardTitle className="text-xl">{plan.name}</CardTitle>
                                <div className="mt-3 flex items-baseline justify-center gap-1">
                                    <span className="text-3xl font-extrabold">
                                        {plan.price === 0 ? 'Free' : `$${plan.price}`}
                                    </span>
                                    {plan.price > 0 && <span className="text-sm text-muted-foreground">/month</span>}
                                </div>
                            </div>

                            <CardContent className="pt-5 pb-2">
                                <p className="text-sm font-medium text-muted-foreground mb-3">
                                    Up to <span className="font-bold text-foreground">{plan.maxProducts}</span> products
                                </p>
                                <ul className="space-y-2">
                                    {plan.benefits.map((b, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm">
                                            <Check className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                                            <span>{b}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>

                            <CardFooter className="pt-2 pb-5">
                                {isSuperAdmin ? (
                                    <Button variant="outline" className="w-full" disabled>
                                        Manage via Store Owners
                                    </Button>
                                ) : isCurrent ? (
                                    <Button variant="outline" className="w-full" disabled>
                                        <Star className="h-4 w-4 mr-2" /> Current Plan
                                    </Button>
                                ) : (
                                    <Button
                                        className="w-full"
                                        onClick={() => handleBuy(plan.id)}
                                    >
                                        {plan.price === 0 ? 'Downgrade' : 'Buy'}
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    )
                })}
            </div>

            {!isSuperAdmin && tier && (
                <Card>
                    <CardContent className="py-4">
                        <div className="flex items-center gap-3">
                            <Badge className={tierBadgeVariants[tier]}>
                                {TIER_PLANS[tier]?.name}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                                Your current plan allows up to{' '}
                                <strong>{TIER_PLANS[tier]?.maxProducts}</strong> products.
                            </span>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
