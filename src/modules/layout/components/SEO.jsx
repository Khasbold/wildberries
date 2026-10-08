import { Helmet } from 'react-helmet-async'

export default function SEO({ title, description, image, url }) {
    const siteName = 'iBunny - Ecommerce Online Shop'
    const fullTitle = title ? `${title} | ${siteName}` : siteName
    const desc = description || 'iBunny — ecommerce, online shop, маркетплейс, хүн бүр дэлгүүр нээж бараа зарах боломжтой.'

    return (
        <Helmet>
            <title>{fullTitle}</title>
            <meta name="description" content={desc} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={desc} />
            <meta property="og:type" content="website" />
            {image && <meta property="og:image" content={image} />}
            {url && <meta property="og:url" content={url} />}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={desc} />
            {image && <meta name="twitter:image" content={image} />}
        </Helmet>
    )
}
