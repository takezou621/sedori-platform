import { DataSource } from 'typeorm';
import { Category } from '../../categories/entities/category.entity';

export async function seedCategories(dataSource: DataSource): Promise<void> {
  const categoryRepository = dataSource.getRepository(Category);

  // 主要カテゴリのシードデータ
  const categoriesData = [
    // Electronics
    {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Electronic devices and gadgets',
      sortOrder: 1,
      isActive: true,
      children: [
        {
          name: 'Smartphones',
          slug: 'smartphones',
          description: 'Mobile phones and accessories',
          sortOrder: 1,
        },
        {
          name: 'Laptops',
          slug: 'laptops',
          description: 'Laptop computers and accessories',
          sortOrder: 2,
        },
        {
          name: 'Tablets',
          slug: 'tablets',
          description: 'Tablet devices and accessories',
          sortOrder: 3,
        },
        {
          name: 'Audio & Video',
          slug: 'audio-video',
          description: 'Headphones, speakers, and audio equipment',
          sortOrder: 4,
        },
        {
          name: 'Wearables',
          slug: 'wearables',
          description: 'Smartwatches and fitness trackers',
          sortOrder: 5,
        },
      ],
    },
    // Books
    {
      name: 'Books',
      slug: 'books',
      description: 'Books and educational materials',
      sortOrder: 2,
      isActive: true,
      children: [
        {
          name: 'Fiction',
          slug: 'fiction',
          description: 'Novels and fictional works',
          sortOrder: 1,
        },
        {
          name: 'Non-Fiction',
          slug: 'non-fiction',
          description: 'Educational and informational books',
          sortOrder: 2,
        },
        {
          name: 'Business',
          slug: 'business-books',
          description: 'Business and entrepreneurship books',
          sortOrder: 3,
        },
        {
          name: 'Technology',
          slug: 'technology-books',
          description: 'Programming and technology books',
          sortOrder: 4,
        },
      ],
    },
    // Fashion
    {
      name: 'Fashion',
      slug: 'fashion',
      description: 'Clothing and fashion accessories',
      sortOrder: 3,
      isActive: true,
      children: [
        {
          name: "Men's Clothing",
          slug: 'mens-clothing',
          description: 'Clothing for men',
          sortOrder: 1,
        },
        {
          name: "Women's Clothing",
          slug: 'womens-clothing',
          description: 'Clothing for women',
          sortOrder: 2,
        },
        {
          name: 'Shoes',
          slug: 'shoes',
          description: 'Footwear for all',
          sortOrder: 3,
        },
        {
          name: 'Accessories',
          slug: 'fashion-accessories',
          description: 'Fashion accessories and jewelry',
          sortOrder: 4,
        },
      ],
    },
    // Home & Garden
    {
      name: 'Home & Garden',
      slug: 'home-garden',
      description: 'Home improvement and gardening supplies',
      sortOrder: 4,
      isActive: true,
      children: [
        {
          name: 'Kitchen',
          slug: 'kitchen',
          description: 'Kitchen appliances and tools',
          sortOrder: 1,
        },
        {
          name: 'Furniture',
          slug: 'furniture',
          description: 'Home and office furniture',
          sortOrder: 2,
        },
        {
          name: 'Gardening',
          slug: 'gardening',
          description: 'Gardening tools and supplies',
          sortOrder: 3,
        },
        {
          name: 'Home Decor',
          slug: 'home-decor',
          description: 'Decorative items and artwork',
          sortOrder: 4,
        },
      ],
    },
    // Health & Beauty
    {
      name: 'Health & Beauty',
      slug: 'health-beauty',
      description: 'Health and beauty products',
      sortOrder: 5,
      isActive: true,
      children: [
        {
          name: 'Skincare',
          slug: 'skincare',
          description: 'Skincare products and treatments',
          sortOrder: 1,
        },
        {
          name: 'Makeup',
          slug: 'makeup',
          description: 'Cosmetics and makeup products',
          sortOrder: 2,
        },
        {
          name: 'Supplements',
          slug: 'supplements',
          description: 'Health supplements and vitamins',
          sortOrder: 3,
        },
        {
          name: 'Fitness',
          slug: 'fitness',
          description: 'Fitness equipment and accessories',
          sortOrder: 4,
        },
      ],
    },
    // Sports & Outdoors
    {
      name: 'Sports & Outdoors',
      slug: 'sports-outdoors',
      description: 'Sports equipment and outdoor gear',
      sortOrder: 6,
      isActive: true,
      children: [
        {
          name: 'Fitness Equipment',
          slug: 'fitness-equipment',
          description: 'Exercise and gym equipment',
          sortOrder: 1,
        },
        {
          name: 'Outdoor Recreation',
          slug: 'outdoor-recreation',
          description: 'Camping and hiking gear',
          sortOrder: 2,
        },
        {
          name: 'Sports Apparel',
          slug: 'sports-apparel',
          description: 'Athletic clothing and shoes',
          sortOrder: 3,
        },
        {
          name: 'Team Sports',
          slug: 'team-sports',
          description: 'Equipment for team sports',
          sortOrder: 4,
        },
      ],
    },
  ];

  // 親カテゴリを先に作成
  const parentCategories: Category[] = [];
  for (const categoryData of categoriesData) {
    const { children, ...parentData } = categoryData;
    const parentCategory = categoryRepository.create(parentData);
    const savedParent = await categoryRepository.save(parentCategory);
    parentCategories.push(savedParent);
  }

  // 子カテゴリを作成
  for (let i = 0; i < categoriesData.length; i++) {
    const categoryData = categoriesData[i];
    const parentCategory = parentCategories[i];
    
    if (categoryData.children) {
      for (const childData of categoryData.children) {
        const childCategory = categoryRepository.create({
          ...childData,
          parentId: parentCategory.id,
          isActive: true,
        });
        await categoryRepository.save(childCategory);
      }
    }
  }

  console.log('✅ Categories seeded successfully');
}