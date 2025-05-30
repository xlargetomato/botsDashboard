import { executeQuery } from '../../config';
import { generateUUID } from '@/lib/auth/authUtils';

export async function seedFaqs() {
  try {
    // Check if FAQs table is empty
    const existingFaqs = await executeQuery('SELECT COUNT(*) as count FROM faqs');
    
    if (existingFaqs[0].count > 0) {
      console.log('FAQs table already has data, skipping seed');
      return true;
    }
    
    console.log('Seeding FAQs table with initial data...');
    
    // Initial FAQ data
    const faqs = [
      {
        question_en: 'What subscription plans are available?',
        question_ar: 'ما هي خطط الاشتراك المتاحة؟',
        answer_en: 'We offer three subscription plans: Basic, Advanced, and Professional. Each plan comes with different features and a different number of monthly messages. You can compare the plans on the "Subscriptions" page.',
        answer_ar: 'نحن نقدم ثلاث خطط اشتراك: الأساسية، والمتقدمة، والاحترافية. كل خطة تأتي مع ميزات مختلفة وعدد مختلف من الرسائل الشهرية. يمكنك مقارنة الخطط في صفحة "الاشتراكات".',
        order_index: 0
      },
      {
        question_en: 'How do I cancel my subscription?',
        question_ar: 'كيف يمكنني إلغاء اشتراكي؟',
        answer_en: 'You can cancel your subscription at any time by going to the "Subscriptions" page and clicking the "Cancel Subscription" button next to the subscription you want to cancel.',
        answer_ar: 'يمكنك إلغاء اشتراكك في أي وقت من خلال الذهاب إلى صفحة "الاشتراكات" والنقر على زر "إلغاء الاشتراك" بجانب الاشتراك الذي تريد إلغاءه.',
        order_index: 1
      },
      {
        question_en: 'Can I change my subscription plan?',
        question_ar: 'هل يمكنني تغيير خطة الاشتراك الخاصة بي؟',
        answer_en: 'Yes, you can upgrade or downgrade your subscription plan at any time. Changes will take effect in the next billing cycle.',
        answer_ar: 'نعم، يمكنك ترقية أو تخفيض خطة الاشتراك الخاصة بك في أي وقت. سيتم تطبيق التغييرات في دورة الفوترة التالية.',
        order_index: 2
      },
      {
        question_en: 'How can I contact support?',
        question_ar: 'كيف يمكنني الاتصال بالدعم الفني؟',
        answer_en: 'You can contact our support team by opening a ticket in the "Support" section of your dashboard, or by sending an email to support@example.com.',
        answer_ar: 'يمكنك الاتصال بفريق الدعم لدينا عن طريق فتح تذكرة في قسم "الدعم" في لوحة التحكم الخاصة بك، أو عن طريق إرسال بريد إلكتروني إلى support@example.com.',
        order_index: 3
      }
    ];
    
    // Insert each FAQ
    for (const faq of faqs) {
      const id = generateUUID();
      const now = new Date();
      
      // Insert English version
      await executeQuery(
        `INSERT INTO faqs (id, question, answer, order_index, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, TRUE, ?, ?)`,
        [id, faq.question_en, faq.answer_en, faq.order_index, now, now]
      );
      
      // Insert Arabic version with a different ID
      const arId = generateUUID();
      await executeQuery(
        `INSERT INTO faqs (id, question, answer, order_index, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, TRUE, ?, ?)`,
        [arId, faq.question_ar, faq.answer_ar, faq.order_index, now, now]
      );
    }
    
    console.log('FAQs table seeded successfully');
    return true;
  } catch (error) {
    console.error('Error seeding FAQs table:', error);
    return false;
  }
}
