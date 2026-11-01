# METRA FieldClimate Collector

مستودع مستقل لجمع بيانات محطات **FieldClimate / METOS** وتخزينها في جداول مخصصة داخل Supabase، ثم عرضها في لوحة ويب عربية عامة للقراءة فقط.

## البنية

1. **عامل المزامنة**: Python عبر GitHub Actions، يستخدم OAuth 2.0 Client Credentials للاتصال بـ FieldClimate.
2. **التخزين**: جدولَا `public.fieldclimate_stations` و`public.fieldclimate` داخل Supabase.
3. **العروض العامة**: `fieldclimate_public_stations` و`fieldclimate_public_readings` تعرضان قائمة محددة من الحقول فقط.
4. **الواجهة**: صفحة ثابتة في `docs/` منشورة عبر GitHub Pages. المتصفح يقرأ من عروض Supabase العامة فقط، ولا يتصل بـ FieldClimate API.

لا يستخدم هذا المشروع جدول `public.stations` الخاص بمنظومة METRA الكلاسيكية، ولا يخلط بيانات FieldClimate معه.

## الحالة التشغيلية المتحققة

حتى 1 نوفمبر 2026:
- تم التحقق من مزامنة حقيقية ناجحة عبر GitHub Actions.
- آخر فحص لقاعدة البيانات أظهر **18,755** قراءة و**33** محطة في العرضين العامين.
- أحدث وقت جلب مسجل في ذلك الفحص: `2026-11-01 04:32:18 UTC`.
- اختبار صلاحيات PostgreSQL بدور `anon` أعاد البيانات من العرضين، بينما لم يمتلك هذا الدور صلاحية SELECT على جدولي التخزين الأساسيين.
- هذه الأرقام لقطة وقت الفحص وليست ضماناً لعدد ثابت.

## روابط التشغيل

- لوحة الويب: https://gfa437926-tech.github.io/metra-fieldclimate-collector/
- GitHub Actions: https://github.com/gfa437926-tech/metra-fieldclimate-collector/actions
- إعداد Secrets: https://github.com/gfa437926-tech/metra-fieldclimate-collector/settings/secrets/actions

## المزامنة التلقائية

ملف `.github/workflows/fieldclimate-sync.yml` يشغل مزامنة واحدة كل 15 دقيقة، ويمكن تشغيله يدوياً من Actions.

المتغيرات المطلوبة في GitHub Actions Secrets:
- `FIELDCLIMATE_CLIENT_ID`
- `FIELDCLIMATE_CLIENT_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

يستخدم العامل مفتاح Service Role من بيئة GitHub Actions الخلفية فقط. **لا تضع هذا المفتاح أو بيانات OAuth في ملفات الواجهة أو GitHub Pages أو المستودع.**

إعدادات المزامنة الحالية في workflow:
- `SYNC_GROUPS=hourly,daily`
- `SYNC_LOOKBACK_DAYS=30`
- تكرار workflow كل 15 دقيقة.

## قاعدة البيانات والصلاحيات

- مخطط الجداول: `database/001_fieldclimate.sql`.
- تعريف العرضين العامين وصلاحياتهما: `database/002_fieldclimate_public_views.sql`.
- العرضان يعملان مع `security_invoker=false` لتمكين القراءة العامة من خلال مالك العرض.
- تم منح `anon` و`authenticated` صلاحية SELECT على العرضين فقط، وسحب صلاحياتهما على الجدولين الأساسيين.
- العرضان لا يكشفان حقول `raw_data` أو `metadata`.
- لا تضف حقولاً حساسة أو بيانات خام إلى الإسقاط العام دون مراجعة أمنية.

## الواجهة

- `docs/index.html`: واجهة عربية RTL.
- `docs/dashboard.js`: جلب المحطات والقياسات من العرضين العامين وعرضها.
- تستخدم الواجهة Supabase publishable key فقط، وهو مفتاح عميل عام محدود بالصلاحيات الممنوحة في قاعدة البيانات.
- لا تتطلب تسجيل دخول، ولا تنفذ عمليات كتابة.

## التطوير المحلي

1. أنشئ بيئة Python افتراضية.
2. ثبّت المتطلبات: `pip install -r requirements.txt`.
3. جهّز متغيرات البيئة محلياً دون رفع ملف الأسرار إلى Git.
4. شغّل مزامنة واحدة: `python -c "import asyncio; from app.sync import sync_once; asyncio.run(sync_once())"`.

## حدود النطاق

- شاشة Flutter الموجودة في `flutter/fieldclimate_screen.dart` مثال/مكوّن منفصل، وليست تطبيق Flutter متكاملاً جاهزاً للبناء؛ لا يوجد في هذا المستودع حالياً مشروع Flutter كامل.
- عقد Backend موحد لمنظومة METRA الكلاسيكية ليس جزءاً منفذاً من هذا المشروع.
- يجب الاستمرار في مراقبة سجلات Actions وحدود FieldClimate API وحداثة البيانات.
- نجاح نشر GitHub Pages لا يثبت وحده أن المتصفح نجح في قراءة Supabase؛ افحص حالة الاتصال في اللوحة وأدوات المطور عند اختبار الواجهة.
