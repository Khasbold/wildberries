/**
 * Tier mascots — premium vector illustration style with rich gradients,
 * realistic fur textures, detailed anatomy, whiskers, and expressive features.
 * Silver holds a carrot; Gold powerlifts a massive carrot overhead.
 */

function SvgRoot({ className, children, title }) {
    return (
        <svg
            className={className}
            viewBox="0 -10 120 136"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-hidden={title ? undefined : true}
        >
            {title ? <title>{title}</title> : null}
            {children}
        </svg>
    )
}

/* ═══════════════════════════════════════════════════════════════════════════
   FREE — Soft baby bunny: plush round form, pearlescent fur, dewy eyes,
   little whiskers, tiny clover beside it
   ═══════════════════════════════════════════════════════════════════════════ */
export function TierBunnyFree({ className }) {
    return (
        <SvgRoot className={className} title="Baby bunny — Free tier">
            <defs>
                <linearGradient id="fr-fur" x1="15%" y1="5%" x2="85%" y2="95%" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#fffefb" />
                    <stop offset="20%" stopColor="#f8f2ec" />
                    <stop offset="50%" stopColor="#ede1d6" />
                    <stop offset="80%" stopColor="#d8cabb" />
                    <stop offset="100%" stopColor="#c4b4a4" />
                </linearGradient>
                <linearGradient id="fr-fur2" x1="50%" y1="0%" x2="50%" y2="100%">
                    <stop offset="0%" stopColor="#faf6f1" />
                    <stop offset="100%" stopColor="#d4c4b4" />
                </linearGradient>
                <radialGradient id="fr-ear" cx="40%" cy="30%" r="65%">
                    <stop offset="0%" stopColor="#ffe4e8" />
                    <stop offset="40%" stopColor="#f9b8c4" />
                    <stop offset="100%" stopColor="#e88da0" />
                </radialGradient>
                <radialGradient id="fr-cheek" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ffc9d3" stopOpacity="0.55" />
                    <stop offset="100%" stopColor="#ffc9d3" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="fr-belly" cx="50%" cy="35%" r="55%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="fr-ground" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.3" />
                    <stop offset="60%" stopColor="#94a3b8" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#94a3b8" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="fr-nose" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#fda4af" />
                    <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
                <radialGradient id="fr-eye-iris" cx="45%" cy="40%" r="50%">
                    <stop offset="0%" stopColor="#4a2c1a" />
                    <stop offset="100%" stopColor="#1a0e08" />
                </radialGradient>
                <filter id="fr-soft" x="-15%" y="-15%" width="130%" height="130%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="b" />
                    <feOffset in="b" dy="2" result="o" />
                    <feComponentTransfer in="o" result="a">
                        <feFuncA type="linear" slope="0.2" />
                    </feComponentTransfer>
                    <feMerge>
                        <feMergeNode in="a" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
                <filter id="fr-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" />
                </filter>
            </defs>

            {/* Ground shadow */}
            <ellipse cx="60" cy="112" rx="36" ry="7" fill="url(#fr-ground)" />

            <g filter="url(#fr-soft)">
                {/* Left ear */}
                <path d="M 44 34 C 30 30 22 14 28 6 C 34 -2 48 6 52 20 C 54 28 50 34 44 34 Z" fill="url(#fr-fur)" />
                <path d="M 44 30 C 34 27 30 16 34 10 C 38 6 46 12 48 20 C 48 26 46 30 44 30 Z" fill="url(#fr-ear)" />
                {/* Left ear fur tuft */}
                <path d="M 36 12 Q 38 8 40 12" stroke="#d8cabb" strokeWidth="1" fill="none" opacity="0.5" />

                {/* Right ear */}
                <path d="M 76 34 C 90 30 98 14 92 6 C 86 -2 72 6 68 20 C 66 28 70 34 76 34 Z" fill="url(#fr-fur)" />
                <path d="M 76 30 C 86 27 90 16 86 10 C 82 6 74 12 72 20 C 72 26 74 30 76 30 Z" fill="url(#fr-ear)" />
                <path d="M 84 12 Q 82 8 80 12" stroke="#d8cabb" strokeWidth="1" fill="none" opacity="0.5" />

                {/* Head + chubby body */}
                <path
                    d="M 60 28
                       C 42 28 30 38 28 52
                       C 26 64 28 78 36 88
                       C 44 98 54 102 60 102
                       C 66 102 76 98 84 88
                       C 92 78 94 64 92 52
                       C 90 38 78 28 60 28 Z"
                    fill="url(#fr-fur)"
                />

                {/* Belly patch */}
                <ellipse cx="60" cy="78" rx="16" ry="18" fill="url(#fr-belly)" />

                {/* Cheek puffs */}
                <ellipse cx="40" cy="58" rx="11" ry="9" fill="url(#fr-fur2)" opacity="0.85" />
                <ellipse cx="80" cy="58" rx="11" ry="9" fill="url(#fr-fur2)" opacity="0.85" />

                {/* Forehead fur tuft */}
                <path d="M 56 30 Q 60 26 64 30" stroke="#d8cabb" strokeWidth="1.2" fill="none" opacity="0.6" />
                <path d="M 54 32 Q 60 27 66 32" stroke="#e0d4c8" strokeWidth="0.8" fill="none" opacity="0.4" />
            </g>

            {/* Blush spots */}
            <ellipse cx="42" cy="60" rx="6" ry="4" fill="url(#fr-cheek)" />
            <ellipse cx="78" cy="60" rx="6" ry="4" fill="url(#fr-cheek)" />

            {/* Eyes — large glossy */}
            <ellipse cx="50" cy="50" rx="5" ry="5.5" fill="url(#fr-eye-iris)" />
            <ellipse cx="70" cy="50" rx="5" ry="5.5" fill="url(#fr-eye-iris)" />
            {/* Primary highlight */}
            <ellipse cx="52" cy="48" rx="2" ry="2.2" fill="#ffffff" opacity="0.95" />
            <ellipse cx="72" cy="48" rx="2" ry="2.2" fill="#ffffff" opacity="0.95" />
            {/* Secondary highlight */}
            <ellipse cx="49" cy="52" rx="1" ry="1.2" fill="#ffffff" opacity="0.5" />
            <ellipse cx="69" cy="52" rx="1" ry="1.2" fill="#ffffff" opacity="0.5" />
            {/* Iris ring */}
            <ellipse cx="50" cy="50" rx="5" ry="5.5" stroke="#3d2010" strokeWidth="0.5" fill="none" opacity="0.3" />
            <ellipse cx="70" cy="50" rx="5" ry="5.5" stroke="#3d2010" strokeWidth="0.5" fill="none" opacity="0.3" />

            {/* Nose */}
            <ellipse cx="60" cy="58" rx="3.5" ry="2.6" fill="url(#fr-nose)" />
            <ellipse cx="59.5" cy="57.2" rx="1.2" ry="0.7" fill="#ffffff" opacity="0.4" />

            {/* Mouth */}
            <path d="M 56 61 Q 60 65 64 61" stroke="#a18a7a" strokeWidth="1.1" strokeLinecap="round" fill="none" opacity="0.6" />
            <line x1="60" y1="60.5" x2="60" y2="63" stroke="#a18a7a" strokeWidth="0.8" opacity="0.5" />

            {/* Whiskers */}
            <g stroke="#c9b9a9" strokeWidth="0.6" strokeLinecap="round" opacity="0.45">
                <line x1="36" y1="56" x2="22" y2="54" />
                <line x1="36" y1="59" x2="20" y2="60" />
                <line x1="36" y1="62" x2="22" y2="66" />
                <line x1="84" y1="56" x2="98" y2="54" />
                <line x1="84" y1="59" x2="100" y2="60" />
                <line x1="84" y1="62" x2="98" y2="66" />
            </g>

            {/* Front paws */}
            <ellipse cx="44" cy="96" rx="9" ry="5" fill="url(#fr-fur2)" />
            <ellipse cx="76" cy="96" rx="9" ry="5" fill="url(#fr-fur2)" />
            {/* Paw pads */}
            <ellipse cx="44" cy="97" rx="3" ry="1.8" fill="#e8b4bc" opacity="0.5" />
            <ellipse cx="76" cy="97" rx="3" ry="1.8" fill="#e8b4bc" opacity="0.5" />

            {/* Tail fluff */}
            <circle cx="84" cy="86" r="7" fill="url(#fr-fur2)" />
            <circle cx="86" cy="84" r="3" fill="#ffffff" opacity="0.3" />

            {/* Tiny clover accent */}
            <g transform="translate(22 98)" opacity="0.6">
                <line x1="4" y1="12" x2="4" y2="4" stroke="#4ade80" strokeWidth="1" />
                <ellipse cx="4" cy="3" rx="2.5" ry="2" fill="#4ade80" />
                <ellipse cx="2" cy="5" rx="2.5" ry="2" fill="#22c55e" />
                <ellipse cx="6" cy="5" rx="2.5" ry="2" fill="#22c55e" />
            </g>
        </SvgRoot>
    )
}

/* ═══════════════════════════════════════════════════════════════════════════
   BRONZE — Young bunny: warm coppery coat, lean athletic build,
   holding a small carrot, bronze bandana, detailed fur texture
   ═══════════════════════════════════════════════════════════════════════════ */
export function TierBunnyBronze({ className }) {
    return (
        <SvgRoot className={className} title="Young bunny with carrot — Bronze tier">
            <defs>
                <linearGradient id="br-fur" x1="15%" y1="5%" x2="90%" y2="95%" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#fff8ee" />
                    <stop offset="20%" stopColor="#f5e0c0" />
                    <stop offset="50%" stopColor="#d4b08a" />
                    <stop offset="80%" stopColor="#b8916a" />
                    <stop offset="100%" stopColor="#9a7550" />
                </linearGradient>
                <linearGradient id="br-fur2" x1="50%" y1="0%" x2="50%" y2="100%">
                    <stop offset="0%" stopColor="#faecd4" />
                    <stop offset="100%" stopColor="#c9a070" />
                </linearGradient>
                <radialGradient id="br-ear" cx="35%" cy="28%" r="65%">
                    <stop offset="0%" stopColor="#ffe4cc" />
                    <stop offset="50%" stopColor="#f0b88a" />
                    <stop offset="100%" stopColor="#d4946a" />
                </radialGradient>
                <radialGradient id="br-belly" cx="50%" cy="35%" r="55%">
                    <stop offset="0%" stopColor="#fff8ee" stopOpacity="0.65" />
                    <stop offset="100%" stopColor="#fff8ee" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="br-bandana" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="30%" stopColor="#d97706" />
                    <stop offset="70%" stopColor="#b45309" />
                    <stop offset="100%" stopColor="#92400e" />
                </linearGradient>
                <linearGradient id="br-carrot" x1="50%" y1="0%" x2="50%" y2="100%">
                    <stop offset="0%" stopColor="#fdba74" />
                    <stop offset="40%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#c2410c" />
                </linearGradient>
                <radialGradient id="br-cheek" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#f0a888" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#f0a888" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="br-eye-iris" cx="45%" cy="40%" r="50%">
                    <stop offset="0%" stopColor="#5a3818" />
                    <stop offset="100%" stopColor="#2a1608" />
                </radialGradient>
                <radialGradient id="br-ground" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#d97706" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
                </radialGradient>
                <filter id="br-soft" x="-12%" y="-12%" width="124%" height="124%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" result="b" />
                    <feOffset in="b" dy="1.5" result="o" />
                    <feComponentTransfer in="o" result="a">
                        <feFuncA type="linear" slope="0.2" />
                    </feComponentTransfer>
                    <feMerge>
                        <feMergeNode in="a" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            <ellipse cx="60" cy="112" rx="38" ry="7" fill="url(#br-ground)" />

            <g filter="url(#br-soft)">
                {/* Left ear — tall, expressive */}
                <path d="M 40 28 C 26 24 20 6 26 -2 C 32 -8 46 2 50 18 C 52 24 48 28 42 28 Z" fill="url(#br-fur)" />
                <path d="M 42 24 C 32 20 28 8 34 4 C 38 0 46 8 46 18 C 46 22 44 24 42 24 Z" fill="url(#br-ear)" />

                {/* Right ear — slightly tilted (character) */}
                <path d="M 80 26 C 94 20 100 4 94 -2 C 88 -8 74 2 70 18 C 68 24 72 28 78 28 Z" fill="url(#br-fur)" />
                <path d="M 78 22 C 88 18 92 8 88 4 C 84 0 76 8 74 16 C 74 20 76 22 78 22 Z" fill="url(#br-ear)" />
                {/* Floppy ear tip — right ear bends */}
                <path d="M 90 4 C 96 -2 102 2 100 10 C 98 16 92 14 90 8 Z" fill="url(#br-fur)" opacity="0.9" />

                {/* Head + lean athletic body */}
                <path
                    d="M 60 24
                       C 44 24 32 34 30 48
                       C 28 58 30 72 38 82
                       C 46 94 54 98 60 98
                       C 66 98 74 94 82 82
                       C 90 72 92 58 90 48
                       C 88 34 76 24 60 24 Z"
                    fill="url(#br-fur)"
                />

                {/* Belly lighter patch */}
                <ellipse cx="60" cy="76" rx="14" ry="16" fill="url(#br-belly)" />

                {/* Cheek puffs */}
                <ellipse cx="38" cy="56" rx="10" ry="8" fill="url(#br-fur2)" opacity="0.8" />
                <ellipse cx="82" cy="56" rx="10" ry="8" fill="url(#br-fur2)" opacity="0.8" />

                {/* Fur texture lines on head */}
                <path d="M 52 28 Q 56 25 60 28 Q 64 25 68 28" stroke="#c9a070" strokeWidth="0.7" fill="none" opacity="0.35" />
            </g>

            {/* Blush */}
            <ellipse cx="40" cy="58" rx="5" ry="3.5" fill="url(#br-cheek)" />
            <ellipse cx="80" cy="58" rx="5" ry="3.5" fill="url(#br-cheek)" />

            {/* Eyes */}
            <ellipse cx="50" cy="48" rx="4.5" ry="5" fill="url(#br-eye-iris)" />
            <ellipse cx="70" cy="48" rx="4.5" ry="5" fill="url(#br-eye-iris)" />
            <ellipse cx="51.5" cy="46.5" rx="1.6" ry="1.8" fill="#ffffff" opacity="0.95" />
            <ellipse cx="71.5" cy="46.5" rx="1.6" ry="1.8" fill="#ffffff" opacity="0.95" />
            <ellipse cx="49" cy="50" rx="0.9" ry="1" fill="#ffffff" opacity="0.45" />
            <ellipse cx="69" cy="50" rx="0.9" ry="1" fill="#ffffff" opacity="0.45" />
            {/* Eyebrow hint */}
            <path d="M 46 42 Q 50 40.5 54 42" stroke="#8a6840" strokeWidth="0.7" fill="none" opacity="0.3" />
            <path d="M 66 42 Q 70 40.5 74 42" stroke="#8a6840" strokeWidth="0.7" fill="none" opacity="0.3" />

            {/* Nose */}
            <ellipse cx="60" cy="56" rx="3" ry="2.2" fill="#e88a90" />
            <ellipse cx="59.5" cy="55.4" rx="1" ry="0.6" fill="#ffffff" opacity="0.35" />

            {/* Mouth */}
            <path d="M 56 59 Q 60 62.5 64 59" stroke="#8a6840" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.6" />
            <line x1="60" y1="58.2" x2="60" y2="60.5" stroke="#8a6840" strokeWidth="0.7" opacity="0.45" />

            {/* Whiskers */}
            <g stroke="#c4a47a" strokeWidth="0.55" strokeLinecap="round" opacity="0.4">
                <line x1="35" y1="54" x2="18" y2="52" />
                <line x1="34" y1="57" x2="16" y2="58" />
                <line x1="35" y1="60" x2="18" y2="64" />
                <line x1="85" y1="54" x2="102" y2="52" />
                <line x1="86" y1="57" x2="104" y2="58" />
                <line x1="85" y1="60" x2="102" y2="64" />
            </g>

            {/* Bronze bandana */}
            <path d="M 42 68 Q 60 64 78 68 L 77 74 Q 60 70 43 74 Z" fill="url(#br-bandana)" opacity="0.85" />
            <path d="M 73 74 L 78 82 L 70 80 Z" fill="url(#br-bandana)" opacity="0.7" />

            {/* Left arm holding small carrot */}
            <ellipse cx="30" cy="72" rx="11" ry="7" fill="url(#br-fur)" transform="rotate(-30 30 72)" />
            {/* Small carrot in left paw */}
            <g transform="translate(22 66) rotate(-25)">
                <path d="M 0 0 L 3 22 L -3 22 Z" fill="url(#br-carrot)" />
                <path d="M -0.8 2 L 0.8 2 L 0.8 18 L -0.8 18 Z" fill="#ffffff" opacity="0.25" />
                <path d="M 0 0 C -2 -4 -4 -7 -3 -10 C -2 -12 1 -9 0 0" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                <path d="M 0 0 C 2 -4 4 -7 3 -10 C 2 -12 -1 -9 0 0" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                <path d="M 0 0 L 0 -11" stroke="#15803d" strokeWidth="1.2" strokeLinecap="round" />
            </g>

            {/* Right arm */}
            <ellipse cx="90" cy="70" rx="11" ry="7" fill="url(#br-fur)" transform="rotate(28 90 70)" />

            {/* Front paws */}
            <ellipse cx="44" cy="94" rx="8" ry="5" fill="url(#br-fur2)" />
            <ellipse cx="76" cy="94" rx="8" ry="5" fill="url(#br-fur2)" />
            <ellipse cx="44" cy="95" rx="3" ry="1.5" fill="#d4946a" opacity="0.4" />
            <ellipse cx="76" cy="95" rx="3" ry="1.5" fill="#d4946a" opacity="0.4" />

            {/* Tail */}
            <circle cx="86" cy="84" r="7" fill="url(#br-fur2)" />
            <circle cx="88" cy="82" r="2.5" fill="#ffffff" opacity="0.25" />
        </SvgRoot>
    )
}

/* ═══════════════════════════════════════════════════════════════════════════
   SILVER — Elegant adult bunny: cool silver/platinum fur, confident posture,
   holding a polished carrot like a trophy, detailed features with silver sheen
   ═══════════════════════════════════════════════════════════════════════════ */
export function TierBunnySilver({ className }) {
    return (
        <SvgRoot className={className} title="Elegant bunny holding carrot — Silver tier">
            <defs>
                <linearGradient id="sv-fur" x1="10%" y1="0%" x2="90%" y2="100%" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="15%" stopColor="#f1f3f8" />
                    <stop offset="35%" stopColor="#dbe0ea" />
                    <stop offset="60%" stopColor="#b8c0d0" />
                    <stop offset="85%" stopColor="#98a2b6" />
                    <stop offset="100%" stopColor="#7e8aa0" />
                </linearGradient>
                <linearGradient id="sv-fur2" x1="50%" y1="0%" x2="50%" y2="100%">
                    <stop offset="0%" stopColor="#eef0f6" />
                    <stop offset="100%" stopColor="#a8b2c4" />
                </linearGradient>
                <radialGradient id="sv-ear" cx="38%" cy="30%" r="62%">
                    <stop offset="0%" stopColor="#fce4f0" />
                    <stop offset="50%" stopColor="#e8b0c8" />
                    <stop offset="100%" stopColor="#c888a8" />
                </radialGradient>
                <radialGradient id="sv-belly" cx="50%" cy="30%" r="55%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="sv-sheen" cx="30%" cy="20%" r="50%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="sv-carrot" x1="50%" y1="0%" x2="50%" y2="100%">
                    <stop offset="0%" stopColor="#fdba74" />
                    <stop offset="25%" stopColor="#fb923c" />
                    <stop offset="60%" stopColor="#ea580c" />
                    <stop offset="100%" stopColor="#c2410c" />
                </linearGradient>
                <linearGradient id="sv-carrot-hi" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
                    <stop offset="40%" stopColor="#ffffff" stopOpacity="0.4" />
                    <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="sv-leaf" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#4ade80" />
                    <stop offset="100%" stopColor="#15803d" />
                </linearGradient>
                <radialGradient id="sv-cheek" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#dab8cc" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#dab8cc" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="sv-eye-iris" cx="42%" cy="38%" r="50%">
                    <stop offset="0%" stopColor="#4a6080" />
                    <stop offset="70%" stopColor="#1e3a5c" />
                    <stop offset="100%" stopColor="#0f1d30" />
                </radialGradient>
                <radialGradient id="sv-ground" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#64748b" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#64748b" stopOpacity="0" />
                </radialGradient>
                <filter id="sv-soft" x="-12%" y="-12%" width="124%" height="124%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" result="b" />
                    <feOffset in="b" dy="1.5" result="o" />
                    <feComponentTransfer in="o" result="a">
                        <feFuncA type="linear" slope="0.18" />
                    </feComponentTransfer>
                    <feMerge>
                        <feMergeNode in="a" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            <ellipse cx="60" cy="112" rx="38" ry="7" fill="url(#sv-ground)" />

            <g filter="url(#sv-soft)">
                {/* Left ear — tall elegant */}
                <path d="M 38 24 C 24 20 16 2 24 -4 C 32 -10 44 0 48 16 C 50 22 46 26 40 26 Z" fill="url(#sv-fur)" />
                <path d="M 40 20 C 30 16 26 4 32 0 C 36 -4 44 4 44 14 C 44 18 42 20 40 20 Z" fill="url(#sv-ear)" />

                {/* Right ear */}
                <path d="M 82 24 C 96 20 104 2 96 -4 C 88 -10 76 0 72 16 C 70 22 74 26 80 26 Z" fill="url(#sv-fur)" />
                <path d="M 80 20 C 90 16 94 4 88 0 C 84 -4 76 4 76 14 C 76 18 78 20 80 20 Z" fill="url(#sv-ear)" />

                {/* Head + confident body */}
                <path
                    d="M 60 22
                       C 42 22 28 34 26 48
                       C 24 60 26 76 34 86
                       C 44 98 54 102 60 102
                       C 66 102 76 98 86 86
                       C 94 76 96 60 94 48
                       C 92 34 78 22 60 22 Z"
                    fill="url(#sv-fur)"
                />

                {/* Belly patch */}
                <ellipse cx="60" cy="76" rx="15" ry="18" fill="url(#sv-belly)" />

                {/* Chest fur detail */}
                <path d="M 52 66 Q 56 62 60 66 Q 64 62 68 66" stroke="#c8d0e0" strokeWidth="0.8" fill="none" opacity="0.35" />
                <path d="M 54 70 Q 58 66 62 70 Q 64 66 66 70" stroke="#c8d0e0" strokeWidth="0.6" fill="none" opacity="0.25" />

                {/* Cheeks */}
                <ellipse cx="38" cy="54" rx="10" ry="8" fill="url(#sv-fur2)" opacity="0.85" />
                <ellipse cx="82" cy="54" rx="10" ry="8" fill="url(#sv-fur2)" opacity="0.85" />
            </g>

            {/* Silver sheen highlight on head */}
            <ellipse cx="48" cy="38" rx="18" ry="14" fill="url(#sv-sheen)" />

            {/* Blush */}
            <ellipse cx="40" cy="56" rx="5" ry="3" fill="url(#sv-cheek)" />
            <ellipse cx="80" cy="56" rx="5" ry="3" fill="url(#sv-cheek)" />

            {/* Eyes — cool-toned, sharp */}
            <ellipse cx="50" cy="46" rx="4.5" ry="5" fill="url(#sv-eye-iris)" />
            <ellipse cx="70" cy="46" rx="4.5" ry="5" fill="url(#sv-eye-iris)" />
            <ellipse cx="51.5" cy="44.2" rx="1.6" ry="1.8" fill="#ffffff" opacity="0.95" />
            <ellipse cx="71.5" cy="44.2" rx="1.6" ry="1.8" fill="#ffffff" opacity="0.95" />
            <ellipse cx="49" cy="48" rx="0.9" ry="1.1" fill="#c8e0ff" opacity="0.4" />
            <ellipse cx="69" cy="48" rx="0.9" ry="1.1" fill="#c8e0ff" opacity="0.4" />
            {/* Confident brow line */}
            <path d="M 45 40 Q 50 38 55 40" stroke="#6e7a90" strokeWidth="0.7" fill="none" opacity="0.35" />
            <path d="M 65 40 Q 70 38 75 40" stroke="#6e7a90" strokeWidth="0.7" fill="none" opacity="0.35" />

            {/* Nose */}
            <ellipse cx="60" cy="54" rx="3.2" ry="2.4" fill="#c8889a" />
            <ellipse cx="59.5" cy="53.4" rx="1.1" ry="0.6" fill="#ffffff" opacity="0.35" />

            {/* Mouth — slight smirk */}
            <path d="M 55 57 Q 60 61 65 57.5" stroke="#6e7a90" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.55" />
            <line x1="60" y1="56.5" x2="60" y2="58.5" stroke="#6e7a90" strokeWidth="0.7" opacity="0.4" />

            {/* Whiskers — elegant */}
            <g stroke="#b0b8c8" strokeWidth="0.5" strokeLinecap="round" opacity="0.4">
                <line x1="34" y1="52" x2="14" y2="49" />
                <line x1="33" y1="55" x2="12" y2="56" />
                <line x1="34" y1="58" x2="14" y2="63" />
                <line x1="86" y1="52" x2="106" y2="49" />
                <line x1="87" y1="55" x2="108" y2="56" />
                <line x1="86" y1="58" x2="106" y2="63" />
            </g>

            {/* Left arm extended holding carrot like a trophy */}
            <path d="M 30 62 C 20 56 14 48 18 42 C 22 38 30 44 34 54 C 36 60 34 64 30 62 Z" fill="url(#sv-fur)" />

            {/* The carrot — held elegantly in left paw */}
            <g transform="translate(14 36) rotate(-20)">
                <path d="M 0 0 Q 1 24 5 42 L -5 42 Q -1 24 0 0 Z" fill="url(#sv-carrot)" />
                {/* Carrot ridges */}
                <path d="M -3 10 Q 0 9 3 10" stroke="#c2410c" strokeWidth="0.5" fill="none" opacity="0.4" />
                <path d="M -3.5 18 Q 0 17 3.5 18" stroke="#c2410c" strokeWidth="0.5" fill="none" opacity="0.4" />
                <path d="M -4 26 Q 0 25 4 26" stroke="#c2410c" strokeWidth="0.5" fill="none" opacity="0.4" />
                <path d="M -4 34 Q 0 33 4 34" stroke="#c2410c" strokeWidth="0.5" fill="none" opacity="0.3" />
                {/* Highlight stripe */}
                <path d="M -1 4 L 1 4 L 1.5 36 L -1.5 36 Z" fill="url(#sv-carrot-hi)" />
                {/* Leafy top — lush */}
                <path d="M 0 0 C -3 -5 -7 -10 -5 -15 C -3 -18 1 -13 0 -4" fill="url(#sv-leaf)" opacity="0.85" />
                <path d="M 0 0 C 3 -5 7 -10 5 -15 C 3 -18 -1 -13 0 -4" fill="url(#sv-leaf)" opacity="0.75" />
                <path d="M 0 0 C -1 -6 -3 -14 0 -18 C 3 -14 1 -6 0 0" fill="url(#sv-leaf)" opacity="0.65" />
                <line x1="0" y1="0" x2="0" y2="-16" stroke="#15803d" strokeWidth="1.2" strokeLinecap="round" />
                <line x1="0" y1="-14" x2="-3" y2="-20" stroke="#22c55e" strokeWidth="1" strokeLinecap="round" />
                <line x1="0" y1="-14" x2="3" y2="-20" stroke="#22c55e" strokeWidth="1" strokeLinecap="round" />
            </g>

            {/* Right arm resting */}
            <path d="M 90 62 C 100 56 106 50 102 44 C 98 40 90 46 86 56 C 84 62 86 64 90 62 Z" fill="url(#sv-fur)" />

            {/* Paw at end of right arm */}
            <circle cx="100" cy="44" r="5" fill="url(#sv-fur2)" />
            {/* Paw at end of left arm (holding carrot) */}
            <circle cx="20" cy="42" r="5" fill="url(#sv-fur2)" />

            {/* Front paws */}
            <ellipse cx="44" cy="96" rx="9" ry="5" fill="url(#sv-fur2)" />
            <ellipse cx="76" cy="96" rx="9" ry="5" fill="url(#sv-fur2)" />
            <ellipse cx="44" cy="97" rx="3" ry="1.5" fill="#c888a8" opacity="0.35" />
            <ellipse cx="76" cy="97" rx="3" ry="1.5" fill="#c888a8" opacity="0.35" />

            {/* Tail — fluffy */}
            <circle cx="88" cy="88" r="8" fill="url(#sv-fur2)" />
            <circle cx="90" cy="86" r="3" fill="#ffffff" opacity="0.3" />

            {/* Silver sparkle accents */}
            <g opacity="0.4">
                <path d="M 96 20 L 97 17 L 98 20 L 101 21 L 98 22 L 97 25 L 96 22 L 93 21 Z" fill="#e0e8f8" />
                <path d="M 12 28 L 12.5 26 L 13 28 L 15 28.5 L 13 29 L 12.5 31 L 12 29 L 10 28.5 Z" fill="#e0e8f8" />
            </g>
        </SvgRoot>
    )
}

/* ═══════════════════════════════════════════════════════════════════════════
   GOLD — Champion bunny: majestic golden fur, powerful muscular build,
   lifting a massive carrot overhead like a champion powerlifter,
   golden glow, crown, detailed anatomy
   ═══════════════════════════════════════════════════════════════════════════ */
export function TierBunnyGold({ className }) {
    return (
        <SvgRoot className={className} title="Champion bunny lifting giant carrot — Gold tier">
            <defs>
                <linearGradient id="gd-fur" x1="10%" y1="0%" x2="90%" y2="100%" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#fffef2" />
                    <stop offset="15%" stopColor="#fef6d0" />
                    <stop offset="35%" stopColor="#fce588" />
                    <stop offset="55%" stopColor="#f5c842" />
                    <stop offset="78%" stopColor="#daa520" />
                    <stop offset="100%" stopColor="#b8860b" />
                </linearGradient>
                <linearGradient id="gd-fur2" x1="50%" y1="0%" x2="50%" y2="100%">
                    <stop offset="0%" stopColor="#fef6d0" />
                    <stop offset="100%" stopColor="#d4a520" />
                </linearGradient>
                <radialGradient id="gd-ear" cx="35%" cy="28%" r="65%">
                    <stop offset="0%" stopColor="#fff8dc" />
                    <stop offset="50%" stopColor="#ffd700" />
                    <stop offset="100%" stopColor="#daa520" />
                </radialGradient>
                <radialGradient id="gd-belly" cx="50%" cy="30%" r="55%">
                    <stop offset="0%" stopColor="#fffef2" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="#fffef2" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="gd-muscle" cx="60%" cy="50%" r="55%">
                    <stop offset="0%" stopColor="#b8860b" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#b8860b" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="gd-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ffd700" stopOpacity="0.15" />
                    <stop offset="60%" stopColor="#ffd700" stopOpacity="0.05" />
                    <stop offset="100%" stopColor="#ffd700" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="gd-carrot" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#c2410c" />
                    <stop offset="20%" stopColor="#ea580c" />
                    <stop offset="50%" stopColor="#f97316" />
                    <stop offset="80%" stopColor="#ea580c" />
                    <stop offset="100%" stopColor="#c2410c" />
                </linearGradient>
                <linearGradient id="gd-carrot-v" x1="50%" y1="0%" x2="50%" y2="100%">
                    <stop offset="0%" stopColor="#fdba74" />
                    <stop offset="50%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#c2410c" />
                </linearGradient>
                <linearGradient id="gd-leaf" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#86efac" />
                    <stop offset="50%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="#15803d" />
                </linearGradient>
                <linearGradient id="gd-crown" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="40%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
                <radialGradient id="gd-eye-iris" cx="42%" cy="38%" r="50%">
                    <stop offset="0%" stopColor="#8b6914" />
                    <stop offset="60%" stopColor="#5c4510" />
                    <stop offset="100%" stopColor="#2a1f08" />
                </radialGradient>
                <radialGradient id="gd-ground" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#daa520" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#daa520" stopOpacity="0" />
                </radialGradient>
                <filter id="gd-soft" x="-15%" y="-15%" width="130%" height="130%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" result="b" />
                    <feOffset in="b" dy="1.8" result="o" />
                    <feComponentTransfer in="o" result="a">
                        <feFuncA type="linear" slope="0.22" />
                    </feComponentTransfer>
                    <feMerge>
                        <feMergeNode in="a" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
                <filter id="gd-glow-f" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="4" />
                </filter>
            </defs>

            {/* Golden aura glow */}
            <ellipse cx="60" cy="65" rx="55" ry="55" fill="url(#gd-glow)" filter="url(#gd-glow-f)" />

            {/* Ground shadow */}
            <ellipse cx="60" cy="114" rx="40" ry="8" fill="url(#gd-ground)" />

            {/* ──── MASSIVE CARROT overhead ──── */}
            <g transform="translate(60 -6)">
                {/* Main carrot body — big thick horizontal carrot */}
                <path
                    d="M -42 0
                       C -44 -8 -40 -14 -36 -14
                       L 36 -14
                       C 40 -14 44 -8 42 0
                       L 36 6
                       C 30 10 -30 10 -36 6 Z"
                    fill="url(#gd-carrot)"
                />
                {/* Carrot tip — tapers right */}
                <path d="M 42 -7 L 56 -4 L 42 1 Z" fill="#c2410c" />
                <path d="M -42 -7 L -56 -4 L -42 1 Z" fill="#c2410c" />
                {/* Carrot ridges */}
                <path d="M -28 -12 Q -28 -4 -28 4" stroke="#b8400c" strokeWidth="0.6" opacity="0.35" />
                <path d="M -14 -13 Q -14 -3 -14 5" stroke="#b8400c" strokeWidth="0.6" opacity="0.35" />
                <path d="M 0 -14 Q 0 -3 0 6" stroke="#b8400c" strokeWidth="0.6" opacity="0.35" />
                <path d="M 14 -13 Q 14 -3 14 5" stroke="#b8400c" strokeWidth="0.6" opacity="0.35" />
                <path d="M 28 -12 Q 28 -4 28 4" stroke="#b8400c" strokeWidth="0.6" opacity="0.35" />
                {/* Highlight streak */}
                <path d="M -30 -10 Q 0 -16 30 -10" stroke="#ffffff" strokeWidth="1.5" fill="none" opacity="0.25" />

                {/* Leafy tops — lush foliage */}
                <g transform="translate(-20 -14)">
                    <path d="M 0 0 C -4 -8 -8 -16 -4 -22 C 0 -26 4 -18 2 -8 Z" fill="url(#gd-leaf)" opacity="0.85" />
                    <path d="M 0 0 C 2 -10 6 -18 4 -24 C 2 -28 -2 -20 -1 -8 Z" fill="url(#gd-leaf)" opacity="0.75" />
                    <line x1="0" y1="0" x2="-2" y2="-20" stroke="#15803d" strokeWidth="1" strokeLinecap="round" />
                </g>
                <g transform="translate(0 -14)">
                    <path d="M 0 0 C -3 -10 -6 -20 -2 -26 C 2 -30 5 -20 3 -8 Z" fill="url(#gd-leaf)" opacity="0.85" />
                    <path d="M 0 0 C 3 -10 7 -18 5 -24 C 3 -28 -1 -18 0 -6 Z" fill="url(#gd-leaf)" opacity="0.8" />
                    <path d="M 0 0 C 0 -12 -1 -22 2 -28 C 5 -22 3 -12 0 0" fill="url(#gd-leaf)" opacity="0.65" />
                    <line x1="0" y1="0" x2="0" y2="-24" stroke="#15803d" strokeWidth="1.2" strokeLinecap="round" />
                </g>
                <g transform="translate(20 -14)">
                    <path d="M 0 0 C 4 -8 8 -16 4 -22 C 0 -26 -4 -18 -2 -8 Z" fill="url(#gd-leaf)" opacity="0.85" />
                    <path d="M 0 0 C -2 -10 -6 -18 -4 -24 C -2 -28 2 -20 1 -8 Z" fill="url(#gd-leaf)" opacity="0.75" />
                    <line x1="0" y1="0" x2="2" y2="-20" stroke="#15803d" strokeWidth="1" strokeLinecap="round" />
                </g>
            </g>

            <g filter="url(#gd-soft)">
                {/* Left ear — powerful, upright */}
                <path d="M 36 30 C 22 26 14 10 22 2 C 28 -4 40 4 46 18 C 48 24 44 30 38 30 Z" fill="url(#gd-fur)" />
                <path d="M 38 26 C 28 22 24 10 30 6 C 34 2 42 8 42 18 C 42 22 40 26 38 26 Z" fill="url(#gd-ear)" />

                {/* Right ear */}
                <path d="M 84 30 C 98 26 106 10 98 2 C 92 -4 80 4 74 18 C 72 24 76 30 82 30 Z" fill="url(#gd-fur)" />
                <path d="M 82 26 C 92 22 96 10 90 6 C 86 2 78 8 78 18 C 78 22 80 26 82 26 Z" fill="url(#gd-ear)" />

                {/* Crown between ears */}
                <g transform="translate(60 20)">
                    <path d="M -12 0 L -14 -12 L -7 -6 L 0 -14 L 7 -6 L 14 -12 L 12 0 Z" fill="url(#gd-crown)" />
                    <circle cx="-7" cy="-6" r="1.5" fill="#ef4444" opacity="0.8" />
                    <circle cx="0" cy="-12" r="1.8" fill="#3b82f6" opacity="0.8" />
                    <circle cx="7" cy="-6" r="1.5" fill="#22c55e" opacity="0.8" />
                    <path d="M -12 0 L 12 0" stroke="#d97706" strokeWidth="1.5" />
                </g>

                {/* Broad muscular body */}
                <path
                    d="M 60 28
                       C 40 28 26 38 24 52
                       C 22 64 24 80 34 90
                       C 44 102 54 106 60 106
                       C 66 106 76 102 86 90
                       C 96 80 98 64 96 52
                       C 94 38 80 28 60 28 Z"
                    fill="url(#gd-fur)"
                />

                {/* Belly light patch */}
                <ellipse cx="60" cy="80" rx="16" ry="20" fill="url(#gd-belly)" />

                {/* Muscle definition */}
                <ellipse cx="72" cy="74" rx="18" ry="16" fill="url(#gd-muscle)" />
                <ellipse cx="48" cy="74" rx="18" ry="16" fill="url(#gd-muscle)" />

                {/* Chest V-shape fur detail */}
                <path d="M 50 60 Q 55 54 60 60 Q 65 54 70 60" stroke="#c8a020" strokeWidth="0.8" fill="none" opacity="0.35" />
                <path d="M 52 64 Q 56 58 60 64 Q 64 58 68 64" stroke="#c8a020" strokeWidth="0.6" fill="none" opacity="0.25" />

                {/* RAISED LEFT ARM — lifting overhead */}
                <path
                    d="M 26 52 C 16 44 10 30 16 20 C 22 12 32 18 36 32 C 38 42 34 52 28 52 Z"
                    fill="url(#gd-fur)"
                />
                {/* Bicep detail */}
                <path d="M 24 36 Q 28 32 30 38" stroke="#b8860b" strokeWidth="0.6" fill="none" opacity="0.3" />

                {/* RAISED RIGHT ARM — lifting overhead */}
                <path
                    d="M 94 52 C 104 44 110 30 104 20 C 98 12 88 18 84 32 C 82 42 86 52 92 52 Z"
                    fill="url(#gd-fur)"
                />
                <path d="M 96 36 Q 92 32 90 38" stroke="#b8860b" strokeWidth="0.6" fill="none" opacity="0.3" />

                {/* Paws gripping carrot */}
                <ellipse cx="18" cy="16" rx="8" ry="7" fill="url(#gd-fur2)" />
                <ellipse cx="102" cy="16" rx="8" ry="7" fill="url(#gd-fur2)" />
                {/* Paw pads */}
                <ellipse cx="18" cy="18" rx="3" ry="2" fill="#daa520" opacity="0.4" />
                <ellipse cx="102" cy="18" rx="3" ry="2" fill="#daa520" opacity="0.4" />
            </g>

            {/* Face details */}
            {/* Eyes — golden-amber, fierce but friendly */}
            <ellipse cx="50" cy="50" rx="4.8" ry="5.2" fill="url(#gd-eye-iris)" />
            <ellipse cx="70" cy="50" rx="4.8" ry="5.2" fill="url(#gd-eye-iris)" />
            {/* Determined brow */}
            <path d="M 44 44 Q 50 41 56 44" stroke="#8a6a18" strokeWidth="0.9" fill="none" opacity="0.4" />
            <path d="M 64 44 Q 70 41 76 44" stroke="#8a6a18" strokeWidth="0.9" fill="none" opacity="0.4" />
            {/* Main highlights */}
            <ellipse cx="51.5" cy="48" rx="1.7" ry="1.9" fill="#ffffff" opacity="0.95" />
            <ellipse cx="71.5" cy="48" rx="1.7" ry="1.9" fill="#ffffff" opacity="0.95" />
            {/* Secondary highlights */}
            <ellipse cx="49" cy="52" rx="1" ry="1.2" fill="#fef3c7" opacity="0.5" />
            <ellipse cx="69" cy="52" rx="1" ry="1.2" fill="#fef3c7" opacity="0.5" />

            {/* Nose */}
            <ellipse cx="60" cy="58" rx="3.5" ry="2.5" fill="#d4886a" />
            <ellipse cx="59.5" cy="57.2" rx="1.2" ry="0.7" fill="#ffffff" opacity="0.35" />

            {/* Big confident grin */}
            <path d="M 53 62 Q 60 68 67 62" stroke="#78500f" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.65" />
            <line x1="60" y1="60.5" x2="60" y2="63.5" stroke="#78500f" strokeWidth="0.8" opacity="0.45" />

            {/* Whiskers — thick and strong */}
            <g stroke="#c8a860" strokeWidth="0.6" strokeLinecap="round" opacity="0.4">
                <line x1="34" y1="56" x2="14" y2="53" />
                <line x1="33" y1="59" x2="12" y2="60" />
                <line x1="34" y1="62" x2="14" y2="67" />
                <line x1="86" y1="56" x2="106" y2="53" />
                <line x1="87" y1="59" x2="108" y2="60" />
                <line x1="86" y1="62" x2="106" y2="67" />
            </g>

            {/* Front paws / feet */}
            <ellipse cx="44" cy="100" rx="10" ry="5.5" fill="url(#gd-fur2)" />
            <ellipse cx="76" cy="100" rx="10" ry="5.5" fill="url(#gd-fur2)" />
            <ellipse cx="44" cy="101" rx="3.5" ry="1.8" fill="#daa520" opacity="0.35" />
            <ellipse cx="76" cy="101" rx="3.5" ry="1.8" fill="#daa520" opacity="0.35" />

            {/* Tail — fluffy champion tail */}
            <circle cx="90" cy="92" r="8" fill="url(#gd-fur2)" />
            <circle cx="92" cy="90" r="3" fill="#fffef2" opacity="0.35" />

            {/* Gold sparkle accents */}
            <g opacity="0.5">
                <path d="M 8 8 L 9 4 L 10 8 L 14 9 L 10 10 L 9 14 L 8 10 L 4 9 Z" fill="#fde047" />
                <path d="M 108 8 L 109 5 L 110 8 L 113 9 L 110 10 L 109 13 L 108 10 L 105 9 Z" fill="#fde047" />
                <path d="M 60 -8 L 61 -12 L 62 -8 L 66 -7 L 62 -6 L 61 -2 L 60 -6 L 56 -7 Z" fill="#fef08a" />
            </g>
        </SvgRoot>
    )
}

export const tierBunnyComponents = {
    free: TierBunnyFree,
    bronze: TierBunnyBronze,
    silver: TierBunnySilver,
    gold: TierBunnyGold,
}
