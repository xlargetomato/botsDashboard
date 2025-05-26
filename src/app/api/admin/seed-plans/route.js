import { executeQuery } from '@/lib/db/config';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Sample plans for seeding the database based on the provided image
const samplePlans = [
  {
    id: uuidv4(),
    name: 'Tier 1',
    description: 'Essential features for small businesses',
    price_monthly: 19.99,
    price_yearly: 39.99,
    features: [
      { en: 'Bulk Messaging', ar: 'الرسائل الجماعية' },
      { en: 'Message Log', ar: 'سجل الرسائل' },
      { en: 'Auto Reply', ar: 'الرد الآلي' },
      { en: 'Button Message', ar: 'إرسال رسالة الزر' },
      { en: 'Group Alerts', ar: 'تنبيهات المجموعات' },
      { en: 'Single Message', ar: 'ارسال رسالة واحده' },
      { en: 'QR Generator', ar: 'مولد QR' },
      { en: '5 Responses', ar: '5 اجابات استخدامه' },
      { en: 'Max File Size: 10MB', ar: 'الحد الأقصى لحجم الملف: 10 ميجابايت' }
    ],
    is_active: true
  },
  {
    id: uuidv4(),
    name: 'Tier 2',
    description: 'Advanced features for growing businesses',
    price_monthly: 59.99,
    price_yearly: 99.99,
    features: [
      { en: 'All Tier 1 Features', ar: 'جميع ميزات المستوى الأول' },
      { en: 'WhatsApp Chatbot', ar: 'شات بوت(واتساب)' },
      { en: 'Call Answering', ar: 'الاجابة على المكالمات' },
      { en: 'List Messages', ar: 'إرسال رسائل القائمة' },
      { en: 'Poll Messages', ar: 'Send poll message' },
      { en: 'REST API', ar: 'REST API' },
      { en: 'Group Management', ar: 'إدارة المجموعات' },
      { en: 'Linked Accounts', ar: 'ادارة الحسابات المرتبطه' },
      { en: 'Reports', ar: 'تقرير' },
      { en: 'URL Shortener', ar: 'أداة تقصير عناوين URL' },
      { en: '20GB Storage', ar: '20 جيجابايت استضافة' },
      { en: 'Max File Size: 50MB', ar: 'الحد الأقصى لحجم الملف: 50 ميجابايت' }
    ],
    is_active: true
  },
  {
    id: uuidv4(),
    name: 'Tier 3',
    description: 'Complete solution for large organizations',
    price_monthly: 89.99,
    price_yearly: 149.99,
    features: [
      { en: 'All Tier 2 Features', ar: 'جميع ميزات المستوى الثاني' },
      { en: 'Advanced Features', ar: 'الميزات المتقدمة' },
      { en: 'Linkei Bio', ar: 'Linkei Bio (Links para BIO)' },
      { en: 'Watermark', ar: 'علامة مائية' },
      { en: 'Proxies', ar: 'Proxies' },
      { en: 'Team Management', ar: 'ادارة فريق العمل' },
      { en: 'OpenAI Content Generation', ar: 'OpenAI Generate Content' },
      { en: 'OpenAI Image Generation', ar: 'OpenAI Generate Image' },
      { en: 'Image Editor', ar: 'محرر الصور' },
      { en: 'Cloud Import', ar: 'استيراد السحابي' },
      { en: 'Unlimited Storage', ar: 'استضافة غير محدودة' },
      { en: 'Max File Size: 500MB', ar: 'الحد الأقصى لحجم الملف: 500 ميجابايت' }
    ],
    is_active: true
  }
];

// GET handler to seed the database with sample plans
export async function GET() {
  try {
    // Check if plans already exist
    const existingPlans = await executeQuery(
      'SELECT COUNT(*) as count FROM subscription_plans'
    );
    
    const planCount = existingPlans[0]?.count || 0;
    
    if (planCount > 0) {
      return NextResponse.json(
        { message: `Database already has ${planCount} plans. No seeding needed.` },
        { status: 200 }
      );
    }
    
    // Insert sample plans into the database
    for (const plan of samplePlans) {
      await executeQuery(
        `INSERT INTO subscription_plans 
         (id, name, description, price_monthly, price_yearly, features, is_active) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          plan.id, 
          plan.name, 
          plan.description, 
          plan.price_monthly, 
          plan.price_yearly, 
          JSON.stringify(plan.features),
          plan.is_active ? 1 : 0
        ]
      );
    }
    
    return NextResponse.json(
      { message: `Successfully seeded database with ${samplePlans.length} plans` },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error seeding plans:', error);
    return NextResponse.json(
      { error: 'Failed to seed plans', details: error.message },
      { status: 500 }
    );
  }
}
