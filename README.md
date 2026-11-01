# METRA FieldClimate Collector

مستودع مستقل لجمع بيانات محطات **FieldClimate / METOS** ومزامنتها مع جداول FieldClimate المخصصة في مشروع Supabase الخاص بمنظومة METRA.

> الحالة: هيكل أولي جاهز للمراجعة. لم يتم اختبار OAuth أو سحب بيانات حقيقية من حساب FieldClimate بعد.

## المكونات
- عامل مزامنة Python مستقل.
- OAuth 2.0 Client Credentials.
- جلب المحطات من `/user/stations`.
- حفظ المحطات في `public.fieldclimate_stations` والقراءات في `public.fieldclimate`.
- صفحة تعريفية عربية قابلة للنشر عبر GitHub Pages.
- مثال شاشة Flutter يستهلك Backend موحداً ولا يتصل مباشرة بقاعدة البيانات.

## التشغيل
1. أنشئ بيئة Python افتراضية.
2. ثبّت المتطلبات: `pip install -r requirements.txt`.
3. انسخ `.env.example` إلى `.env`.
4. أدخل OAuth وSupabase credentials في متغيرات بيئة آمنة.
5. شغّل `python -m app.sync`.

## متغيرات البيئة
`FIELDCLIMATE_CLIENT_ID`, `FIELDCLIMATE_CLIENT_SECRET`, `FIELDCLIMATE_TOKEN_URL`, `FIELDCLIMATE_API_BASE`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SYNC_GROUPS`, `SYNC_LOOKBACK_DAYS`, `SYNC_INTERVAL_SECONDS`.

**لا ترفع ملف .env أو مفاتيح OAuth/Supabase إلى GitHub.** استخدم Secrets في بيئة تشغيل العامل الخلفي، ولا تضعها في Flutter أو GitHub Pages.

## قاعدة البيانات
الملف `database/001_fieldclimate.sql` يوثق بنية الجدولين المخصصين. تم تطبيق الجدولين مسبقاً في مشروع Supabase INSERT المشار إليه في الملف. جداول المحطات الكلاسيكية لا يتم تعديلها.

## Backend
عقد API المقترح موثق في `docs/backend-contract.md`: `GET /api/v1/stations?source=all|classic|fieldclimate&search=...`. الـ endpoint الموحد غير منفذ بعد، ويحتاج إلى خدمة خلفية منفصلة.

## تنبيهات
- يلزم اشتراك FieldClimate API فعال وصلاحيات OAuth صحيحة.
- حدود التاريخ والاستدعاءات تعتمد على باقة API.
- محلل القراءات الحالي عام ومحافظ وليس parser مؤكداً لكل أنواع استجابات FieldClimate. اختبر عينة فعلية قبل التوسع.
- راجع صلاحيات RLS والوصول قبل الإنتاج.

## تطبيق FieldClimate العام (قراءة فقط)

- شاشة Flutter الجديدة: `flutter/fieldclimate_screen.dart`.
- تستخدم الشاشة عرضَي القراءة فقط: `fieldclimate_public_stations` و`fieldclimate_public_readings`.
- تم إنشاء العرضين في Supabase مع منح SELECT فقط لدوري `anon` و`authenticated`. جداول المصدر `fieldclimate` و`fieldclimate_stations` تبقى محمية بـ RLS ولا تمنح صلاحية كتابة للزوار.
- إعداد Flutter يحتاج `SUPABASE_URL` وSupabase anon/publishable key فقط. هذا المفتاح مصمم للاستخدام في العميل مع صلاحيات محدودة؛ لا تستخدم service-role key مطلقاً.
- واجهة Flutter تعرض FieldClimate فقط ولا تستعلم من جدول `public.stations`.

### تشغيل عامل المزامنة باستمرار

يمكن تشغيل العامل كـ Background Worker على Render أو أي استضافة Python دائمة:
- Build: `pip install -r requirements.txt`
- Start: `python -m app.sync`
- أضف المتغيرات التالية في لوحة Secrets الخاصة بمضيف العامل: `FIELDCLIMATE_CLIENT_ID`, `FIELDCLIMATE_CLIENT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- يمكن ضبط `SYNC_GROUPS=hourly,daily`, `SYNC_LOOKBACK_DAYS=30`, `SYNC_INTERVAL_SECONDS=900`.
- لا تضف أي سر إلى GitHub Pages أو Flutter أو ملفات المستودع.

### الحالة الحالية والاختبارات المطلوبة

قاعدة البيانات تحتوي حالياً على صفر سجل في جدولي FieldClimate. تم تعديل عامل المزامنة ليستخدم مفتاح التعارض `station_id,recorded_at,group_name`، لكن لا يمكن اعتبار جمع البيانات جاهزاً قبل تشغيله بأسرار OAuth الفعالة والتحقق من شكل استجابة API الفعلية. يجب مراجعة parser وفق عينة حقيقية قبل الاعتماد التشغيلي.

## GitHub Pages
الصفحة في `docs/` وتُنشر عبر GitHub Actions. من Settings → Pages اختر Source: GitHub Actions إذا لم يكن مفعلاً.
