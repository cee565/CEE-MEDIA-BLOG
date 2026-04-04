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
  title = 'CEE MEDIA | Campus Pulse & Voting',
  description = 'Shape the future of your campus. Vote on trending topics, share your voice, and stay connected.',
  image = 'https://media.base44.com/images/public/user_69c58cd8140b12f4f7e0ba23/fed4f0662_Screenshot_20260326-200402.jpg',
  url = window.location.href,
  type = 'website'
}) => {
  const siteTitle = title.includes('CEE MEDIA') ? title : `${title} | CEE MEDIA`;

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
