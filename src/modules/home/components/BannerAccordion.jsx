import { useEffect, useState } from 'react'

const slides = [
	{
		id: 's1',
		img: 'https://images.unsplash.com/photo-1516387938699-a93567ec168e?q=80&w=2000&auto=format&fit=crop',
		title: 'Up to 65% off',
		cta: 'Shop now',
		url: '#',
	},
	{
		id: 's2',
		img: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=2000&auto=format&fit=crop',
		title: 'New arrivals',
		cta: 'Discover',
		url: '#',
	},
	{
		id: 's3',
		img: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?q=80&w=2000&auto=format&fit=crop',
		title: 'Editors’ picks',
		cta: 'Explore',
		url: '#',
	},
]

export default function BannerAccordion() {
	const [active, setActive] = useState(0)

	useEffect(() => {
		const id = setInterval(() => {
			setActive((p) => (p + 1) % slides.length)
		}, 5000)
		return () => clearInterval(id)
	}, [])

	return (
		<div className="container-app py-4 md:py-8">
			<div
				className="grid grid-cols-1 md:flex gap-3 sm:gap-4"
				role="tablist"
				aria-label="Promotional banners"
			>
				{slides.map((s, idx) => (
					<button
						key={s.id}
						role="tab"
						aria-selected={active === idx}
						onMouseEnter={() => setActive(idx)}
						onFocus={() => setActive(idx)}
						onClick={() => setActive(idx)}
						className={`relative overflow-hidden rounded-xl shadow-card transition-[flex-basis,transform,opacity] duration-500 h-36 sm:h-44 md:h-48 lg:h-56 xl:h-64 focus:outline-none ${active === idx ? 'md:basis-2/3 lg:basis-2/3' : 'md:basis-1/3 lg:basis-1/3 opacity-90 hover:opacity-100'}`}
						style={{ flexBasis: active === idx ? '66%' : '33%' }}
					>
						<img src={s.img} alt={s.title} className="w-full h-full object-cover" />
						<div className="absolute inset-0 bg-gradient-to-t from-black/50 to-black/0" />
						<div className="absolute left-3 bottom-3 sm:left-4 sm:bottom-4 text-left">
							<p className="text-white text-base sm:text-xl md:text-2xl font-bold drop-shadow">{s.title}</p>
							<span className="mt-1.5 sm:mt-2 inline-block bg-white text-gray-900 rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1 text-xs sm:text-sm">{s.cta}</span>
						</div>
					</button>
				))}
			</div>
			<div className="mt-3 flex items-center justify-center gap-2">
				{slides.map((_, i) => (
					<span key={i} className={`w-2 h-2 rounded-full ${i === active ? 'bg-white' : 'bg-white/50'}`}></span>
				))}
			</div>
		</div>
	)
} 