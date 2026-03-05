// AI Coach service — mock AI response engine for compatibility coaching
// Provides scenario-based conversation practice with pre-built Turkish responses

export type AICoachScenario =
  | 'ilk_mesaj'
  | 'ilk_bulusma'
  | 'derin_sohbet'
  | 'tartisma_cozme'
  | 'ilgi_alani';

export interface AICoachScenarioConfig {
  id: AICoachScenario;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
}

export interface AICoachMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: string;
  scenario: AICoachScenario;
}

export interface QuickReply {
  id: string;
  text: string;
}

// ── Scenario definitions ──────────────────────────────────────────
export const AI_COACH_SCENARIOS: AICoachScenarioConfig[] = [
  {
    id: 'ilk_mesaj',
    title: 'İlk Mesaj',
    subtitle: 'Etkileyici ilk mesaj yaz',
    icon: '💬',
    color: '#8B5CF6',
  },
  {
    id: 'ilk_bulusma',
    title: 'İlk Buluşma',
    subtitle: 'Buluşma öncesi hazırlan',
    icon: '☕',
    color: '#EC4899',
  },
  {
    id: 'derin_sohbet',
    title: 'Derin Sohbet',
    subtitle: 'Anlamlı konuşmalar kur',
    icon: '🧠',
    color: '#3B82F6',
  },
  {
    id: 'tartisma_cozme',
    title: 'Tartışma Çözme',
    subtitle: 'Yapıcı iletişim öğren',
    icon: '🤝',
    color: '#10B981',
  },
  {
    id: 'ilgi_alani',
    title: 'İlgi Alanı Keşfi',
    subtitle: 'Ortak noktaları bul',
    icon: '🎯',
    color: '#F59E0B',
  },
];

// ── Mock AI response pools (40+ Turkish responses) ───────────────

const RESPONSE_POOL: Record<AICoachScenario, string[]> = {
  ilk_mesaj: [
    'Harika bir başlangıç! Profilindeki bir detaydan bahsetmen karşı tarafı özel hissettirir. Mesela "Fotoğraflarındaki İtalya gezisi harika görünüyor, en sevdiğin şehir hangisiydi?" gibi.',
    'İlk mesajlarda kısa ve merak uyandırıcı olmak önemli. Uzun paragraflar yerine tek bir ilgi çekici soru sor.',
    'Evet/hayır soruları yerine açık uçlu sorular tercih et. "Müzik sever misin?" yerine "Son dinlediğin ve kafana takılan şarkı hangisi?" daha iyi bir başlangıç.',
    'Profildeki ortak noktalardan yola çık. Aynı hobiye sahipseniz, kendi deneyiminden kısaca bahsedip soru sor.',
    'Espri yapmak güzel ama ilk mesajda abartma. Hafif ve samimi bir ton en iyisi. Karşı tarafın profilini gerçekten okuduğunu göster.',
    'Klişe mesajlardan kaçın. "Merhaba, nasılsın?" yerine profiline özel bir gözlemle başla. Bu seni diğerlerinden ayırır.',
    'İltifat edeceksen fiziksel değil, kişilikle ilgili olsun. "Çok güzelsin" yerine "Kitap zevkin harika, son okuduğun ne?" daha etkili.',
    'Zamanlama da önemli. Sabah erken veya gece geç saatler yerine akşam saatleri genellikle en iyi yanıt alma zamanı.',
    'Bir şey sormadan önce kendi hakkında küçük bir bilgi paylaş. Bu karşılıklı açılmayı kolaylaştırır.',
    'İlk mesajda çok uzun olmamaya dikkat et ama aynı zamanda tek kelimelik mesajlar da ilgisiz görünebilir. 2-3 cümle ideal.',
  ],
  ilk_bulusma: [
    'İlk buluşmada karşı tarafa gerçekten ilgi göster. Sorular sor ama sorguya çevirme. Doğal bir sohbet akışı oluştur.',
    'Buluşma yeri seçimi çok önemli. Sessiz bir kafe veya sakin bir park, birbirinizi tanımak için ideal. Gürültülü mekanlardan kaçın.',
    'İlk buluşmayı kısa tut — 1-2 saat yeterli. Güzel gidiyorsa ikinci buluşma için bir bahane olur. Kötü gidiyorsa çıkış kolay olur.',
    'Telefonunu masada bırakma veya sürekli kontrol etme. Bu karşı tarafa değer vermediğinin sinyalini verir.',
    'Eski ilişkilerden bahsetme. İlk buluşma yeni bir başlangıç, geçmişe takılma.',
    'Beden dilin sözlerinden daha çok şey anlatır. Göz teması kur, gülümse ve açık bir duruş sergile.',
    'Ortak ilgi alanlarını keşfetmeye çalış. "Sen de mi koşuyorsun? Hangi parkta?" gibi doğal bağlantılar kur.',
    'Buluşma sonunda net ol. İlgi duyuyorsan söyle: "Seninle vakit geçirmek güzeldi, tekrar buluşmak isterim." Belirsizlik bırakma.',
  ],
  derin_sohbet: [
    'Derin sohbet kurmak için önce güven ortamı oluştur. Kendi kırılganlığını paylaşmak karşı tarafı da açılmaya teşvik eder.',
    '"Hayatta en çok neyi değiştirmek isterdin?" gibi düşündürücü sorular sohbeti derinleştirir.',
    'Aktif dinleme çok önemli. Karşı taraf konuşurken sadece sıranı bekleme, gerçekten anlamaya çalış.',
    'Duygularını ifade etmekten korkma. "Bu beni mutlu ediyor" veya "Bu konu hakkında endişeleniyorum" gibi açık ifadeler yakınlık kurar.',
    '"Başarı senin için ne anlama geliyor?" sorusu insanların değerlerini ve önceliklerini anlamak için harika bir yol.',
    'Sessizliklerden korkma. Bazen en derin bağlantılar sessiz anlarda kurulur. Her boşluğu doldurmaya çalışma.',
    '"Eğer hiçbir engel olmasaydı hayatını nasıl yaşardın?" Böyle sorular insanların gerçek hayallerini ortaya çıkarır.',
    'Geçmiş deneyimlerden ders çıkarmayı konuşmak, iki tarafın da olgunluğunu ve büyüme kapasitesini gösterir.',
    'Kitaplar, filmler veya müzik üzerinden derin konulara giriş yapabilirsin. "O filmdeki mesaj sence neydi?" gibi.',
  ],
  tartisma_cozme: [
    'Tartışmalarda "sen" yerine "ben" dili kullan. "Sen beni dinlemiyorsun" yerine "Dinlenmediğimi hissediyorum" de.',
    'Öfkeliyken konuşma. "Bu konuyu biraz sonra konuşabilir miyiz?" demek olgunluk göstergesi.',
    'Karşı tarafın bakış açısını anlamaya çalış. Haklı olmak değil, birlikte çözüm bulmak önemli.',
    'Geçmişteki sorunları tekrar açma. Her tartışma kendi başına ele alınmalı. "Sen zaten hep böylesin" deme.',
    'Özür dilemek güçsüzlük değil, güç göstergesi. "Haklısın, bunda hata yaptım" diyebilmek ilişkiyi güçlendirir.',
    'Tartışma sırasında fiziksel temas (el tutma gibi) gerilimi azaltabilir. Duvarlar örme, köprüler kur.',
    'Sorun hakkında konuş, kişi hakkında değil. "Bu davranış beni üzüyor" de, "Sen kötü birisin" deme.',
    'Çözüm odaklı ol. "Peki bundan sonra bunu nasıl farklı yapabiliriz?" sorusu tartışmayı yapıcı hale getirir.',
  ],
  ilgi_alani: [
    'Ortak ilgi alanları bulmak için açık fikirli ol. Karşı tarafın hobilerini denemeye istekli olmak güzel bir sinyal.',
    '"Bu konuda ne seviyorsun?" sorusu basit ama etkili. İnsanlar tutkularını anlatmayı sever.',
    'Farklı ilgi alanlarınız olsa bile bu bir sorun değil. Birbirinizden yeni şeyler öğrenmek ilişkiyi zenginleştirir.',
    'Birlikte yapabileceğiniz aktiviteler önermek ilişkiyi güçlendirir. "Birlikte yemek yapmayı deneyelim mi?" gibi.',
    'Seyahat, müzik ve yemek neredeyse herkesin konuşabileceği konular. Buradan başlayıp derinleşebilirsin.',
    '"Çocukken en çok ne yapmayı severdin?" sorusu insanların gerçek tutkularını ortaya çıkarır.',
    'Karşı tarafın favori podcast veya YouTube kanalını sor. Bu, günlük ilgi alanlarını anlamak için harika bir yol.',
    'Bir hobisini seninle paylaşmasını iste. İnsanlar bildikleri şeyleri öğretmeyi severler ve bu yakınlık kurar.',
    '"Hayatında deneyip de bayıldığın son şey ne?" Yenilik arayan insanlar bu soruyu çok sever.',
  ],
};

// ── Quick reply suggestions per scenario ─────────────────────────

const QUICK_REPLIES: Record<AICoachScenario, QuickReply[]> = {
  ilk_mesaj: [
    { id: 'qr1', text: 'Profilden bir detay nasıl yakalarım?' },
    { id: 'qr2', text: 'Espri yapmalı mıyım?' },
    { id: 'qr3', text: 'Cevap gelmezse ne yapmalıyım?' },
  ],
  ilk_bulusma: [
    { id: 'qr4', text: 'Nerede buluşmalıyız?' },
    { id: 'qr5', text: 'Neler konuşmalıyım?' },
    { id: 'qr6', text: 'Çok heyecanlıyım, ne yapmalıyım?' },
  ],
  derin_sohbet: [
    { id: 'qr7', text: 'Sohbeti nasıl derinleştirebilirim?' },
    { id: 'qr8', text: 'Duygularımı nasıl ifade edebilirim?' },
    { id: 'qr9', text: 'Hangi konuları açabilirim?' },
  ],
  tartisma_cozme: [
    { id: 'qr10', text: 'Öfkemi nasıl kontrol ederim?' },
    { id: 'qr11', text: 'Yapıcı eleştiri nasıl yapılır?' },
    { id: 'qr12', text: 'Özür dilemek zor geliyor.' },
  ],
  ilgi_alani: [
    { id: 'qr13', text: 'Ortak nokta bulamıyoruz.' },
    { id: 'qr14', text: 'Farklı hobilerimiz var, sorun mu?' },
    { id: 'qr15', text: 'Birlikte ne yapabiliriz?' },
  ],
};

// ── Match-specific tips ──────────────────────────────────────────

const MATCH_SPECIFIC_TIPS: string[] = [
  'Uyum puanınız yüksek! Bu, benzer değerlere sahip olduğunuz anlamına geliyor. Ortak değerleriniz hakkında konuşarak bağınızı güçlendirebilirsiniz.',
  'Eşleşmenizle iletişim kurarken samimi ve kendiniz olun. Uyum puanınız zaten güçlü bir temel olduğunu gösteriyor.',
  'Profilindeki ilgi alanlarına dikkat et. Ortak noktalarınızdan yola çıkarak doğal bir sohbet başlatabilirsin.',
  'İlk birkaç mesajda çok fazla bilgi paylaşma. Merak uyandır ve sohbetin doğal akışına bırak.',
  'Eşleşmenizle aranızdaki uyum kategorilerine bak. En güçlü olduğunuz alandan sohbet başlatmak harika bir strateji.',
];

// ── Greeting messages per scenario ───────────────────────────────

const SCENARIO_GREETINGS: Record<AICoachScenario, string> = {
  ilk_mesaj: 'Merhaba! İlk mesaj yazmak konusunda sana yardımcı olacağım. Kiminle eşleştin ve profilinde neler dikkatini çekti?',
  ilk_bulusma: 'Harika, ilk buluşma heyecanı! Buluşma öncesi hazırlanman için sana ipuçları vereceğim. Ne tür bir mekanda buluşmayı düşünüyorsun?',
  derin_sohbet: 'Derin ve anlamlı sohbetler kurmak istiyorsun, çok güzel! Hangi konularda derinleşmek istediğini paylaş benimle.',
  tartisma_cozme: 'Tartışma çözmek olgunluk ister ve sen doğru yerdesin. Yaşadığın durumu anlat, birlikte yapıcı bir yaklaşım bulalım.',
  ilgi_alani: 'İlgi alanı keşfi eğlenceli bir süreç! Karşı tarafla hangi konularda bağlantı kurmak istiyorsun?',
};

// Track used response indices per scenario to avoid repetition
const usedIndices: Record<AICoachScenario, Set<number>> = {
  ilk_mesaj: new Set(),
  ilk_bulusma: new Set(),
  derin_sohbet: new Set(),
  tartisma_cozme: new Set(),
  ilgi_alani: new Set(),
};

let messageCounter = 0;

const generateMessageId = (): string => {
  messageCounter += 1;
  return `ai-coach-msg-${Date.now()}-${messageCounter}`;
};

const getRandomResponse = (scenario: AICoachScenario): string => {
  const pool = RESPONSE_POOL[scenario];
  const used = usedIndices[scenario];

  // Reset if all responses have been used
  if (used.size >= pool.length) {
    used.clear();
  }

  // Find an unused index
  let index: number;
  do {
    index = Math.floor(Math.random() * pool.length);
  } while (used.has(index));

  used.add(index);
  return pool[index] as string;
};

// ── Public service API ───────────────────────────────────────────

export const aiCoachService = {
  getScenarios: (): AICoachScenarioConfig[] => {
    return AI_COACH_SCENARIOS;
  },

  getGreeting: (scenario: AICoachScenario): AICoachMessage => {
    return {
      id: generateMessageId(),
      content: SCENARIO_GREETINGS[scenario],
      sender: 'ai',
      timestamp: new Date().toISOString(),
      scenario,
    };
  },

  getQuickReplies: (scenario: AICoachScenario): QuickReply[] => {
    return QUICK_REPLIES[scenario];
  },

  getMatchSpecificTip: (): string => {
    const index = Math.floor(Math.random() * MATCH_SPECIFIC_TIPS.length);
    return MATCH_SPECIFIC_TIPS[index] as string;
  },

  /**
   * Simulate AI response with a delay. Returns a promise that resolves
   * after a mock "thinking" period (1-2 seconds).
   */
  sendMessage: async (
    _userMessage: string,
    scenario: AICoachScenario,
  ): Promise<AICoachMessage> => {
    // Simulate network/AI processing delay (1-2 seconds)
    const delay = 1000 + Math.random() * 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    return {
      id: generateMessageId(),
      content: getRandomResponse(scenario),
      sender: 'ai',
      timestamp: new Date().toISOString(),
      scenario,
    };
  },

  /**
   * Get a personalized tip for a specific match
   */
  getMatchCoachingTip: async (
    _matchId: string,
    matchName: string,
  ): Promise<AICoachMessage> => {
    const delay = 800 + Math.random() * 700;
    await new Promise((resolve) => setTimeout(resolve, delay));

    const tip = aiCoachService.getMatchSpecificTip();

    return {
      id: generateMessageId(),
      content: `${matchName} ile ilgili ipucu: ${tip}`,
      sender: 'ai',
      timestamp: new Date().toISOString(),
      scenario: 'ilk_mesaj',
    };
  },

  /** Reset used-response tracking for a scenario */
  resetScenario: (scenario: AICoachScenario): void => {
    usedIndices[scenario].clear();
  },
};
