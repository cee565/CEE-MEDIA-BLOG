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
  title = 'AAU 100 LVL MOCK EXAM COMPETITION',
  description = 'Participate in the ultimate preparation for GST and Departmental exams. Practice under real conditions and win!',
  image = 'https://images.unsplash.com/photo-1523050335456-c38a89b7d560?auto=format&fit=crop&q=80&w=1200&h=630',
  url = typeof window !== 'undefined' ? window.location.href : '',
  type = 'website'
}) => {
  const siteTitle = title.includes('AAU') ? title : `${title} | AAU COMPETITION`;

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
