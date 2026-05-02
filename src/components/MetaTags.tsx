import React from 'react';
import { Helmet } from 'react-helmet-async';

interface MetaTagsProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
}

const MetaTags: React.FC<MetaTagsProps> = ({
  title = 'CEE MEDIA BLOG | Official Campus Portal',
  description = 'Your Official Campus Voice, News and Updates. Stay updated with the latest campus stories.',
  image = 'https://i.ibb.co/vzB7Z6N/ceemedia-logo.png',
  url = typeof window !== 'undefined' ? window.location.href : '',
  type = 'website'
}) => {
  const siteTitle = title.includes('CEE MEDIA') ? title : `${title} | CEE MEDIA BLOG`;

  return (
    <Helmet>
      {/* Standard metadata tags */}
      <title>{siteTitle}</title>
      <meta name="description" content={description} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={url} />
      <meta property="twitter:title" content={siteTitle} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={image} />
    </Helmet>
  );
};

export default MetaTags;
