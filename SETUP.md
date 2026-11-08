# הוראות הקמה (בשביל Claude)

הקובץ הזה מיועד ל-Claude Code שמקים את המערכת עבור המשתמש. הקוד כבר מוכן ונבדק: לא כותבים אותו מחדש, רק ממלאים פרטים, מעלים ומדריכים. (חריג אחד: אם מטא מציגה רק Unified login, ראו הנספח בסוף.)

## איך לעבוד עם המשתמש
- המשתמש כנראה לא טכני. עברית פשוטה, שלב אחד בכל פעם. בכל שלב: משפט אחד על מה עושים ולמה, בדיוק על מה ללחוץ, ולחכות ל"עשיתי".
- שמות כפתורים ומסכים כותבים כמו שהם מופיעים במסך (באנגלית).
- **לעולם לא לבקש להדביק בצ'אט סיסמה, טוקן, App Secret או מפתח.** סוד שהמשתמש צריך להכניס: פקודה שהוא מריץ בעצמו בטרמינל (לשונית Terminal באפליקציה), או קובץ שהוא פותח ומדביק בו. סודות ש-Claude מייצר (VERIFY_TOKEN, ADMIN_PASSWORD) נשמרים ב-`secrets.local.txt` ולא נכתבים בצ'אט.
- המשתמש מתחבר בעצמו לאינסטגרם, לפייסבוק ול-Cloudflare. Claude לא שולט בדפדפן שלו ולא מפעיל את חשבון האינסטגרם.
- המסכים של מטא משתנים. אם המשתמש לא מוצא כפתור, לשאול מה הוא רואה ולהתאים.
- לא למחוק שום דבר בחשבון המטא או ב-Cloudflare בלי לשאול. לא לשלוח הודעות לאנשים שלא פנו.

## מה יש בקוד (להסביר למשתמש בשני משפטים, לא יותר)
Cloudflare Worker עם מסד D1: מקבל מאינסטגרם הודעה על כל תגובה (`/webhook`), בודק מילת מפתח (`src/match.js`), ושולח הודעה פרטית דרך ה-API הרשמי (`src/meta.js`). יש דף ניהול עם סיסמה (`/admin`) ועמודי פרטיות ומחיקת נתונים (`/privacy`, `/data-deletion`) שמטא דורשת.

## שלבים

**0. לפני שמתחילים.** לבדוק ש-Node.js מותקן (אם לא, להסביר איך להתקין). להריץ `npm install` ו-`npm test`. לשאול את המשתמש: שם המותג, ומייל ליצירת קשר לעמוד הפרטיות. לוודא שחשבון האינסטגרם מקצועי (עסקי או יוצר) ומחובר לתיק עסקי (Business Portfolio) במטא.

**1. Cloudflare.** `npx wrangler login`, והמשתמש מאשר בדפדפן. אם זה נכשל: להדריך ליצור Custom API Token עם ההרשאות **Workers Scripts: Edit**, **D1: Edit**, **Account Settings: Read**. ליצור קובץ `.env` עם השורה `CLOUDFLARE_API_TOKEN=`, והמשתמש מדביק את הטוקן בקובץ בעצמו.
אחר כך:
- `npx wrangler d1 create instagram-dm`, ולהכניס את ה-database_id ל-`wrangler.toml`.
- למלא BRAND_NAME ו-CONTACT_EMAIL ב-`wrangler.toml`.
- `npx wrangler d1 execute instagram-dm --remote --file=src/schema.sql`
- לייצר VERIFY_TOKEN ו-ADMIN_PASSWORD אקראיים, לשמור ב-`secrets.local.txt`, ולהגדיר אותם עם `npx wrangler secret put` (אפשר להעביר את הערך מהקובץ בצינור).
- `npx wrangler deploy`, ולהגיד למשתמש מה הכתובת (`https://instagram-dm.<שם>.workers.dev`). אם Cloudflare מבקש לבחור תת-דומיין ל-workers.dev, להסביר איפה עושים את זה בדשבורד.

**2. אפליקציה במטא.** ב-developers.facebook.com: **My Apps ← Create App**, שם לאפליקציה, ב-Use case לבחור **Manage messaging & content on Instagram**, ולשייך לתיק העסקי. במסך ה-Use case: **API setup with Instagram login**, וללחוץ **Add all required permissions**.

> **אם אין במסך "API setup with Instagram login"** (מופיעה הודעה "API setup with Instagram login is not available for newer apps", ויש רק **API setup with Unified login** וכפתור **Create new configuration**): זה תקין. מסוף אוקטובר 2026 מטא נותנת לאפליקציות חדשות רק את המסלול הזה, והיא ממליצה עליו רשמית. לא לחפש דרך לעקוף, ולהגיד למשתמש שזה לא תקלה אצלו. במקרה הזה עוברים ל**נספח: Unified login** בסוף הקובץ במקום שלבים 3, 5 ו-6.

**3. המפתחות.** באותו מסך מופיעים **Instagram app ID** ו-**Instagram app secret**. להדגיש שזה לא ה-App ID הרגיל של מטא. לתת למשתמש להריץ בטרמינל `npx wrangler secret put IG_APP_ID` ו-`npx wrangler secret put IG_APP_SECRET`, והוא מדביק כשהפקודה מבקשת. אחר כך `npx wrangler deploy` שוב.

**4. Webhook.** ב-**Configure webhooks**: Callback URL = הכתובת + `/webhook`. Verify token = ה-VERIFY_TOKEN (המשתמש מעתיק מ-`secrets.local.txt`). **Verify and save**, ואז **Subscribe** ל-**comments** ול-**messages**. לבחור את גרסת ה-API העדכנית ביותר, ולעדכן את GRAPH_VERSION ב-`wrangler.toml` לאותה גרסה (ואז deploy).

**5. Business login ופרטיות.** ב-**Set up Instagram business login**: Redirect URL = הכתובת + `/callback`. ב-**App settings ← Basic**: Privacy Policy URL = הכתובת + `/privacy`, User data deletion = הכתובת + `/data-deletion`, אייקון וקטגוריה. **Save changes**.

**6. בודק.** ב-**App roles ← Roles**: להוסיף את חשבון האינסטגרם כ-**Instagram Tester**. לאשר את ההזמנה בדפדפן במחשב: `instagram.com/accounts/manage_access`, בלשונית **Tester invites**. להדגיש: רק מהדפדפן, לא מאפליקציית אינסטגרם.

**7. חיבור.** לפתוח את `/admin`. שם משתמש: כל מילה, סיסמה: ADMIN_PASSWORD מ-`secrets.local.txt`. ללחוץ **חיבור אינסטגרם** ולאשר במסך של אינסטגרם. לוודא שהדף מראה "מחובר". אם יש שגיאה, לקרוא אותה ולתקן.

**8. פרסום.** בתפריט האפליקציה במטא: **Publish**. אם חסר משהו, לעזור להשלים.

**9. חוק ראשון ובדיקה.** להוסיף חוק בדף הניהול, ושהמשתמש יגיב את המילה **מחשבון אחר שאינו בודק**. אם לא הגיעה הודעה: "פעילות אחרונה" בדף הניהול, ו-`npx wrangler tail`.
לומר בכנות: כשהאפליקציה בתיק העסקי של המשתמש ופועלת רק על החשבון שלו, זה עבד גם בלי App Review, אבל מטא יכולה לשנות את זה. אם זה לא עובד מחשבון אחר, או שמטא תבקש App Review בעתיד, לעזור להכין בקשה: הסבר באנגלית לכל הרשאה (instagram_business_basic, instagram_business_manage_comments, instagram_business_manage_messages) ותסריט לסרטון הדגמה קצר.

**10. סיכום.** לכתוב למשתמש קובץ הוראות קצר בעברית: איך מוסיפים חוק, כמה מילים עם פסיקים, כפתור ותגובה פומבית, מה קורה מעל 150 הודעות בשעה (תור), ומה עושים אם משהו מפסיק לעבוד. להזכיר: לא להפעיל את אותה מילה גם במניצ'ט או בכלי אחר, אחרת יישלחו שתי הודעות.

## נספח: Unified login (אפליקציות חדשות, מסוף אוקטובר 2026)

המסלול הזה עדיין חדש, ומטא עוד מעדכנת את המסכים. לעבוד לאט, לשאול את המשתמש מה הוא רואה, ולהתאים. לומר לו בכנות שזה מסלול חדש, ושייתכן שיידרשו כמה ניסיונות.

**מה שונה מהמסלול הרגיל:**
- אין Instagram app ID ו-secret. משתמשים ב-**App ID** וב-**App secret** הרגילים של האפליקציה (**App settings ← Basic**), ומגדירים אותם באותה דרך, עם `wrangler secret put IG_APP_ID` ו-`IG_APP_SECRET`.
- ההתחברות היא דרך Facebook Login for Business עם **configuration**. במסך Unified login: **Create new configuration**, עם טוקן מסוג **System-user access token**, תוקף **Never**, ונכס עסקי **Instagram account**. אפשר להוריד את ההרשאות שהמערכת לא צריכה (`ads_management`, `ads_read`, `instagram_content_publish`). צריך להשאיר את `instagram_basic`, `instagram_manage_comments` ו-`instagram_manage_messages`. Redirect URL = הכתובת + `/callback`. לשמור את ה-**config_id** שמתקבל.
- עמוד פייסבוק לא נדרש, אבל תיק עסקי כן.

**שינויים בקוד** (רק כאן מותר לשנות את הקוד, וכמה שפחות):
- `authorizeUrl`: `https://www.facebook.com/<GRAPH_VERSION>/dialog/oauth` עם `client_id`, `redirect_uri`, `state`, `config_id`, `response_type=code`, `override_default_response_type=true`, **בלי** `scope`. את ה-config_id לשמור כמשתנה ב-`wrangler.toml` (הוא לא סוד).
- `exchangeCode`: `GET https://graph.facebook.com/<GRAPH_VERSION>/oauth/access_token` עם `client_id`, `client_secret`, `redirect_uri`, `code`. הטוקן שחוזר לא פג, אז אין צורך ב-`refreshToken`. לנטרל את הרענון, לא למחוק את הקוד.
- `graph()`: לעבור ל-`https://graph.facebook.com`.
- `getMe`: במקום `/me`, לקרוא ל-`/me/assigned_instagram_accounts` ולקחת משם את מזהה חשבון האינסטגרם ואת שם המשתמש. בכל מקום שכתוב `/me/...` (media, subscribed_apps) לשים את המזהה הזה במקום `me`.
- שאר הקריאות (`/{id}/messages` עם `comment_id`, `/{comment-id}/replies`, בדיקת החתימה עם App secret) נשארות כמו שהן. לבדוק כל אחת בפועל.

**אם החשבון לא נמצא:** אם `/me/assigned_instagram_accounts` מחזיר רשימה ריקה, או שכל קריאה נכשלת עם שגיאה `100` / subcode `33`: מפתחים דיווחו שזה נפתר כשמוסיפים את ההרשאה `business_management`. היא לא מופיעה במסך Unified login. מוסיפים את המוצר **Facebook Login for Business**, ב-**Configurations** לוחצים **Edit** על אותה configuration ומוסיפים את `business_management`, ואז המשתמש מתחבר שוב. זה דיווח של מפתחים ולא תיעוד רשמי, אז לעשות את זה רק אם באמת נתקעים.

**שלבים 5 ו-6:** אין Set up Instagram business login ואין Instagram Tester. המשתמש הוא מנהל האפליקציה, והחשבון מגיע דרך התיק העסקי. עמודי הפרטיות (שלב 5, החלק של App settings) עדיין נדרשים.

**Webhook:** אותו Callback URL ואותו Verify token. אם מסך ה-webhooks לא נמצא במקום הרגיל, לחפש אותו תחת Unified login או תחת **Webhooks** בתפריט, עם האובייקט **Instagram**, ולהירשם ל-**comments** ול-**messages**. אחרי החיבור, `POST /<ig-id>/subscribed_apps?subscribed_fields=comments,messages`.

**בדיקה:** כמו בשלב 9, מחשבון אחר. אם ההודעה הפרטית לא מגיעה, לקרוא את השגיאה ב"פעילות אחרונה" וב-`npx wrangler tail` ולתקן לפיה.
