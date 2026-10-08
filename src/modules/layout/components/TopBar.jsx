import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n/useI18n.js'
import { Truck, Package, HelpCircle, Heart } from 'lucide-react'

/* ── sparkle/glow keyframes injected once ── */
const styleId = '__topbar-glow-css'
if (typeof document !== 'undefined' && !document.getElementById(styleId)) {
	const s = document.createElement('style')
	s.id = styleId
	s.textContent = `
@keyframes topbar-glow-pulse {
  0%, 100% { box-shadow: 0 0 4px #e98c63, 0 0 12px #d66b3e66; }
  50%      { box-shadow: 0 0 8px #e98c63, 0 0 22px #d66b3eaa, 0 0 36px #d66b3e44; }
}
@keyframes topbar-shimmer {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes topbar-sparkle-float {
  0%   { transform: translateY(0) scale(1); opacity: 1; }
  80%  { opacity: 1; }
  100% { transform: translateY(-18px) scale(0); opacity: 0; }
}
@keyframes topbar-bounce-subtle {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-2px); }
}
@keyframes topbar-star-spin {
  0%   { transform: rotate(0deg) scale(0.8); opacity: 0.7; }
  50%  { transform: rotate(180deg) scale(1.1); opacity: 1; }
  100% { transform: rotate(360deg) scale(0.8); opacity: 0.7; }
}
.topbar-open-store {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 14px 3px 11px;
  border-radius: 9999px;
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.02em;
  color: #ffffff;
  background: linear-gradient(135deg, #e98c63 0%, #d66b3e 50%, #b5532c 100%);
  background-size: 200% auto;
  animation: topbar-glow-pulse 2s ease-in-out infinite, topbar-shimmer 3s linear infinite, topbar-bounce-subtle 2.5s ease-in-out infinite;
  transition: transform 0.18s, filter 0.18s;
  cursor: pointer;
  text-decoration: none;
  overflow: visible;
  white-space: nowrap;
}
.topbar-open-store:hover {
  transform: scale(1.08) translateY(-1px);
  filter: brightness(1.08);
  color: #ffffff;
  box-shadow: 0 0 14px #e98c63, 0 0 28px #d66b3ecc, 0 0 48px #d66b3e55;
}
.topbar-open-store::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 9999px;
  background: conic-gradient(from 0deg, #e98c63, #b5532c, #f7e9d7, #e98c63);
  z-index: -1;
  animation: topbar-star-spin 4s linear infinite;
  opacity: 0.5;
}
.topbar-sparkle {
  position: absolute;
  pointer-events: none;
  animation: topbar-sparkle-float 1.6s ease-out infinite;
}
`
	document.head.appendChild(s)
}

/* Small SVG sparkle */
function Sparkle({ size = 8, delay = 0, left, top, color = '#fbbf24' }) {
	return (
		<svg
			className="topbar-sparkle"
			width={size} height={size}
			viewBox="0 0 24 24"
			fill={color}
			style={{ left, top, animationDelay: `${delay}s` }}
		>
			<path d="M12 0 L14.5 9.5 L24 12 L14.5 14.5 L12 24 L9.5 14.5 L0 12 L9.5 9.5 Z" />
		</svg>
	)
}

/* Tiny rocket icon */
function RocketIcon() {
	return (
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
			<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
			<path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
			<path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
			<path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
		</svg>
	)
}

export default function TopBar() {
	const { t } = useI18n()
	return (
		<div className="bg-gradient-to-r from-[#4B7F4D] via-[#436f45] to-[#4B7F4D] text-[#F7E9D7] text-xs font-medium tracking-wide overflow-x-hidden">
			<div className="container-app py-2.5 flex flex-wrap items-center justify-between gap-2 sm:gap-4">
				<div className="flex items-center gap-4 sm:gap-6">
					<span className="text-white/70 hidden sm:inline">{t('topbar.deliveryTo')}</span>
				</div>
				<div className="flex items-center gap-4 sm:gap-6">
					<Link to="https://www.facebook.com/profile.php?id=61574330195349" className="flex items-center gap-1.5 px-2 py-1 rounded-full hover:text-white hover:bg-white/10 transition-all duration-200 active:scale-[0.97]">
						<HelpCircle className="w-3.5 h-3.5" />
						{t('topbar.help')}
					</Link>
					<Link to="/admin" className="topbar-open-store">
					{/* <Link to="/admin" className="topbar-open-store" style={{ overflow: 'hidden' }}> */}
						<Sparkle size={7} delay={0} left="-4px" top="-4px" color="#F7E9D7" />
						<Sparkle size={6} delay={0.5} left="calc(100% - 2px)" top="-3px" color="#F7E9D7" />
						<Sparkle size={5} delay={1.0} left="40%" top="-6px" color="#fff" />
						<RocketIcon />
						<span>{t('topbar.ownerLogin') || 'Дэлгүүр нээх'}</span>
					</Link>
				</div>
			</div>
		</div>
	)
} 