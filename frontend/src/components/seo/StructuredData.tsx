interface StructuredDataProps {
  data: Record<string, unknown>;
}

export function StructuredData({ data }: StructuredDataProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data),
      }}
    />
  );
}

// Organization structured data
export function OrganizationStructuredData() {
  const organizationData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Sedori Platform',
    description: 'Your comprehensive platform for product sourcing, sales tracking, and business intelligence',
    url: 'https://your-domain.com',
    logo: 'https://your-domain.com/logo.png',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+81-3-1234-5678',
      contactType: 'customer service',
      availableLanguage: ['Japanese', 'English'],
    },
    sameAs: [
      'https://twitter.com/sedori_platform',
      'https://www.facebook.com/sedori.platform',
    ],
  };

  return <StructuredData data={organizationData} />;
}

// Website structured data
export function WebsiteStructuredData() {
  const websiteData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Sedori Platform',
    description: 'Your comprehensive platform for product sourcing, sales tracking, and business intelligence',
    url: 'https://your-domain.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://your-domain.com/products?search={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return <StructuredData data={websiteData} />;
}

// Product structured data
export function ProductStructuredData({ product }: { product: { id: string; title: string; description: string; price: number; stock: number; category: string; brand?: string; imageUrl: string } }) {
  const productData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: product.imageUrl,
    brand: {
      '@type': 'Brand',
      name: product.brand || 'Unknown',
    },
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'JPY',
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'Sedori Platform',
      },
    },
    category: product.category,
    sku: product.id,
  };

  return <StructuredData data={productData} />;
}

// Breadcrumb structured data
export function BreadcrumbStructuredData({ breadcrumbs }: { breadcrumbs: Array<{ name: string; url: string }> }) {
  const breadcrumbData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((breadcrumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: breadcrumb.name,
      item: breadcrumb.url,
    })),
  };

  return <StructuredData data={breadcrumbData} />;
}