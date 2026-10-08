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
		<div className="container-app py-6 md:py-10">
			<div
				className="aspect-[16/6] grid grid-cols-1 md:flex gap-4"
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
						className={`group relative w-full h-full overflow-hidden rounded-3xl shadow-card-elevated transition-all duration-500 ease-spring focus:outline-none focus:ring-2 focus:ring-white/50 ${active === idx ? 'md:basis-2/3 lg:basis-2/3 ring-2 ring-white/30' : 'md:basis-1/3 lg:basis-1/3 opacity-85 hover:opacity-100'}`}
						style={{ flexBasis: active === idx ? '66%' : '33%' }}
					>
						<img src={s.img} alt={s.title} className={`w-full h-full object-cover transition-transform duration-700 ease-spring ${active === idx ? 'scale-105' : 'scale-100'}`} />
						<div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent pointer-events-none" />
						<div className="absolute inset-0 bg-gradient-to-tr from-[#D66B3E]/20 via-transparent to-transparent pointer-events-none" />
						<div className={`absolute left-4 bottom-4 sm:left-5 sm:bottom-5 text-left transition-all duration-500 ease-spring ${active === idx ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-90'}`}>
							<p className="text-white text-lg sm:text-xl md:text-2xl font-bold drop-shadow-lg">{s.title}</p>
							<span className="mt-2 inline-block bg-white text-slate-900 rounded-full px-4 py-1.5 text-sm font-semibold shadow-soft hover:bg-[#F7E9D7] hover:shadow-card-hover transition-all duration-200 group-active:scale-[0.97]">{s.cta}</span>
						</div>
					</button>
				))}
			</div>
			<div className="mt-4 flex items-center justify-center gap-2">
				{slides.map((_, i) => (
					<button
						key={i}
						onClick={() => setActive(i)}
						className={`h-2.5 rounded-full transition-all duration-300 ease-spring hover:scale-110 ${i === active ? 'bg-white w-8 shadow-soft' : 'bg-white/50 w-2.5 hover:bg-white/70'}`}
						aria-label={`Slide ${i + 1}`}
					/>
				))}
			</div>
		</div>
	)
} 