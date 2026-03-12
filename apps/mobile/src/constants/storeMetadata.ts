// Store listing metadata for App Store and Google Play — all user-facing text in Turkish

// ---------------------------------------------------------------------------
// App identity
// ---------------------------------------------------------------------------

export const APP_NAME = 'LUMA - Uyumluluk Bazlı Tanışma' as const;

export const SHORT_DESCRIPTION =
  'Gerçek uyumluluğa dayalı premium tanışma uygulaması' as const;

export const SUBTITLE =
  'Uyumlu insanlarla tanışma platformu' as const;

// ---------------------------------------------------------------------------
// Full description (~4000 chars, Turkish)
// ---------------------------------------------------------------------------

export const FULL_DESCRIPTION = `LUMA, yüzeysel kaydırmalardan sıkılmış ve gerçek uyumluluk arayan insanlar için tasarlanmış premium bir tanışma uygulamasıdır.

🔬 BİLİMSEL UYUMLULUK SİSTEMİ
LUMA'nın kalbi, 45 özenle hazırlanmış sorudan oluşan kapsamlı bir uyumluluk analizidir. Değerler, yaşam tarzı, iletişim biçimi ve gelecek hedefleriniz üzerinden derinlemesine analiz yaparak size gerçekten uyumlu kişileri önerir. Yüzeysel beğeniler yerine anlamlı bağlantılar kurmanızı sağlar.

💜 NASIL ÇALIŞIR?
1. Profilinizi oluşturun ve fotoğraflarınızı ekleyin
2. 45 soruluk uyumluluk testini tamamlayın
3. Niyetinizi belirtin: Ciddi İlişki, Keşfetmek İstiyorum veya Henüz Emin Değilim
4. LUMA algoritması size en uyumlu kişileri sunsun
5. Eşleşin, sohbet edin ve Harmony Room'da sesli tanışın

🎯 KEŞFET
Uyumluluk puanlarına göre sıralanmış profilleri keşfedin. Her profilde uyumluluk yüzdenizi ve ortak noktalarınızı görün. Beğendiğiniz kişilere ilgi gösterin ve karşılıklı beğeni ile eşleşin.

💬 EŞLEŞMELERİNİZ
Eşleştiğiniz kişilerle anında sohbete başlayın. Metin mesajları gönderin, fotoğraf paylaşın ve birbirinizi daha yakından tanıyın. Her eşleşmenin uyumluluk detaylarını inceleyin.

🎙️ HARMONY ROOM
LUMA'ya özel sesli tanışma odaları! Eşleştiğiniz kişiyle güvenli bir ortamda sesli görüşme yapın. Yazışmadan önce sesinizi duyurun, kimyayı hissedin. Gerçek bağlantılar yüz yüze başlar.

👑 SUPREME ÜYELİK AVANTAJLARI
• Sınırsız beğeni hakkı
• Sizi beğenenleri görme
• Gelişmiş filtreler (mesafe, yaş, niyet, uyumluluk eşiği)
• Öncelikli görünürlük — profiliniz daha fazla kişiye ulaşır
• Özel Supreme rozeti
• Harmony Room'da öncelik
• Aylık bonus jeton paketi
• Reklamsız deneyim

🔒 GÜVENLİK VE GİZLİLİK
• Selfie doğrulama ile gerçek kişilerle tanışın
• Tüm verileriniz şifrelenerek korunur
• İstenmeyen mesajları engelleme ve raporlama
• 7/24 moderasyon ekibi
• KVKK ve GDPR uyumlu veri politikası
• Hesabınızı ve verilerinizi istediğiniz zaman silebilirsiniz

🏅 JETON SİSTEMİ
Özel etkileşimler için jeton kullanın: Süper Beğeni gönderin, profilinizi öne çıkarın veya ek uyumluluk detaylarını açın. Jetonlarınızı akıllıca kullanarak doğru kişiyle bağlantı kurun.

📍 KONUM BAZLI KEŞİF
Yakınındaki veya belirlediğin mesafe aralığındaki uyumlu kişileri keşfet. Seyahat ederken bile yeni bağlantılar kur.

💡 NEDEN LUMA?
• Bilimsel temelli uyumluluk algoritması
• 45 soru ile derinlemesine profil analizi
• 3 farklı niyet etiketi ile net beklentiler
• Sesli tanışma odaları (Harmony Room)
• Premium ama erişilebilir fiyatlandırma
• Türkiye'nin en yenilikçi tanışma deneyimi

LUMA ile yüzeysel kaydırmayı bırakın, gerçek uyumluluğu keşfedin. İlk adımı bugün atın!

Sorularınız veya geri bildirimleriniz için: destek@luma.dating
Web: https://luma.dating` as const;

// ---------------------------------------------------------------------------
// Keywords & categorization
// ---------------------------------------------------------------------------

export const KEYWORDS: readonly string[] = [
  'tanışma',
  'dating',
  'uyumluluk',
  'aşk',
  'ilişki',
  'eşleşme',
  'flört',
  'buluşma',
  'arkadaş',
  'sohbet',
  'premium',
  'ciddi ilişki',
  'partner',
  'sevgili',
  'bağlantı',
] as const;

/** Apple App Store keyword string — max 100 chars, comma-separated */
export const APP_STORE_KEYWORDS =
  'tanışma,dating,uyumluluk,aşk,ilişki,eşleşme,flört,premium,sevgili,sohbet' as const;

export const CATEGORY = {
  IOS_PRIMARY: 'Social Networking',
  IOS_SECONDARY: 'Lifestyle',
  ANDROID: 'Dating',
} as const;

export const CONTENT_RATING = {
  IOS: '17+',
  ANDROID: 'Mature 17+',
  IARC: '16+',
} as const;

// ---------------------------------------------------------------------------
// Legal & support URLs
// ---------------------------------------------------------------------------

export const PRIVACY_URL = 'https://luma.dating/privacy' as const;
export const TERMS_URL = 'https://luma.dating/terms' as const;
export const SUPPORT_URL = 'https://luma.dating/support' as const;
export const EULA_URL = 'https://luma.dating/eula' as const;
export const DATA_DELETION_URL = 'https://luma.dating/data-deletion' as const;

// ---------------------------------------------------------------------------
// Copyright & developer
// ---------------------------------------------------------------------------

export const COPYRIGHT = `Copyright ${new Date().getFullYear()} LUMA Dating. Tüm hakları saklıdır.` as const;
export const DEVELOPER_NAME = 'LUMA Dating' as const;

// ---------------------------------------------------------------------------
// What's new text — update per release (Turkish)
// ---------------------------------------------------------------------------

export const WHATS_NEW = `LUMA 1.0 — İlk sürüm!

• 45 soruluk bilimsel uyumluluk sistemi
• Keşfet, Eşleşmeler, Harmony Room ve Profil ekranları
• Supreme üyelik ile premium deneyim
• Selfie doğrulama ile güvenli tanışma
• Sesli tanışma odaları (Harmony Room)
• Jeton sistemi ile özel etkileşimler
• Karanlık ve aydınlık tema desteği` as const;

// ---------------------------------------------------------------------------
// Promotional text — can be updated without new app submission (iOS)
// ---------------------------------------------------------------------------

export const PROMOTIONAL_TEXT =
  'LUMA ile gerçekten uyumlu insanları keşfet! 45 soruluk bilimsel uyumluluk analizi ile anlamlı bağlantılar kur.' as const;

// ---------------------------------------------------------------------------
// Consolidated export
// ---------------------------------------------------------------------------

export const STORE_METADATA = {
  appName: APP_NAME,
  shortDescription: SHORT_DESCRIPTION,
  subtitle: SUBTITLE,
  fullDescription: FULL_DESCRIPTION,
  keywords: KEYWORDS,
  appStoreKeywords: APP_STORE_KEYWORDS,
  category: CATEGORY,
  contentRating: CONTENT_RATING,
  privacyUrl: PRIVACY_URL,
  termsUrl: TERMS_URL,
  supportUrl: SUPPORT_URL,
  eulaUrl: EULA_URL,
  dataDeletionUrl: DATA_DELETION_URL,
  copyright: COPYRIGHT,
  developerName: DEVELOPER_NAME,
  whatsNew: WHATS_NEW,
  promotionalText: PROMOTIONAL_TEXT,
} as const;

export type StoreMetadata = typeof STORE_METADATA;
