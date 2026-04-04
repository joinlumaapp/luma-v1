// AI Service — Smart matching explanations, icebreakers, profile tips, chat suggestions
// Offline-first: uses local templates with AI-quality output
// Ready for Claude API integration when backend is connected



// ─── Types ───────────────────────────────────────────────────────

export type IcebreakerTone = 'funny' | 'romantic' | 'casual' | 'flirty' | 'deep';

export interface AIIcebreaker {
  text: string;
  tone: IcebreakerTone;
  emoji: string;
}

export interface AIProfileTip {
  id: string;
  category: 'photo' | 'bio' | 'prompts' | 'interests' | 'general';
  tip: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
}

export interface AICompatExplanation {
  summary: string;
  strengths: string[];
  talkingPoints: string[];
}

export interface AIChatSuggestion {
  text: string;
  tone: IcebreakerTone;
}

// ─── Profile Context for AI ─────────────────────────────────────

interface ProfileContext {
  name: string;
  age?: number;
  city?: string;
  bio?: string;
  interests?: string[];
  intentionTag?: string;
  job?: string;
  zodiacSign?: string;
  photos?: number;
  prompts?: number;
}

// ─── Smart Matching Explanations ─────────────────────────────────

const MATCH_TEMPLATES = {
  highCompat: [
    '{name} ile iletişim tarzlarınız çok benzer — birbirinizi anlamak için fazla kelimeye ihtiyacınız yok.',
    '{name} ile yaşam hedefleriniz örtüşüyor, bu uzun vadeli uyumun göstergesi.',
    'Değerleriniz neredeyse aynı! {name} ile güçlü bir temel üzerine inşa edebilirsiniz.',
    '{name} ile duygusal zekanız birbirine yakın — birbirinizi hissedebilirsiniz.',
  ],
  sharedInterests: [
    '{interests} konusunda ortak tutkunuz var — ilk buluşma için harika bir konu!',
    'İkiniz de {interests} seviyorsunuz — bu uyumun güzel bir işareti.',
  ],
  sameIntention: [
    'İkiniz de aynı niyettesiniz — bu başlangıç için önemli.',
    'İlişkiden beklentileriniz örtüşüyor, bu nadir bulunan bir uyum.',
  ],
  sameCity: [
    'Aynı şehirdesiniz — buluşma planlamak çok kolay!',
    '{city} sizi bir araya getiriyor — belki yakınlardasınızdır.',
  ],
  complementary: [
    'Farklılıklarınız birbirinizi tamamlıyor — dengeyi seversiniz.',
    'Zıt kutuplar birbirini çeker — ikiniz de farklı bakış açıları sunuyorsunuz.',
  ],
};

export function generateSmartMatchExplanation(
  targetProfile: ProfileContext,
  compatPercent: number,
  sharedInterests: string[],
  sameIntention: boolean,
  sameCity: boolean,
): AICompatExplanation {
  const strengths: string[] = [];
  const talkingPoints: string[] = [];

  // High compatibility
  if (compatPercent >= 80) {
    const template = MATCH_TEMPLATES.highCompat[Math.floor(Math.random() * MATCH_TEMPLATES.highCompat.length)];
    strengths.push(template.replace('{name}', targetProfile.name));
  }

  // Shared interests
  if (sharedInterests.length > 0) {
    const interestStr = sharedInterests.slice(0, 2).join(' ve ');
    const template = MATCH_TEMPLATES.sharedInterests[Math.floor(Math.random() * MATCH_TEMPLATES.sharedInterests.length)];
    strengths.push(template.replace('{interests}', interestStr));
    talkingPoints.push(`${interestStr} hakkinda konusabilirsiniz.`);
  }

  // Same intention
  if (sameIntention) {
    strengths.push(MATCH_TEMPLATES.sameIntention[Math.floor(Math.random() * MATCH_TEMPLATES.sameIntention.length)]);
  }

  // Same city
  if (sameCity && targetProfile.city) {
    const template = MATCH_TEMPLATES.sameCity[Math.floor(Math.random() * MATCH_TEMPLATES.sameCity.length)];
    strengths.push(template.replace('{city}', targetProfile.city));
    talkingPoints.push(`${targetProfile.city}'deki en sevdiginiz mekanlari paylasabilirsiniz.`);
  }

  // Complementary if lower compat
  if (compatPercent < 70 && compatPercent >= 50) {
    strengths.push(MATCH_TEMPLATES.complementary[Math.floor(Math.random() * MATCH_TEMPLATES.complementary.length)]);
  }

  // Summary
  let summary: string;
  if (compatPercent >= 90) {
    summary = `${targetProfile.name} ile mükemmel bir uyumunuz var! Ortak değerleriniz ve yaşam tarzınız birbirine çok yakın.`;
  } else if (compatPercent >= 75) {
    summary = `${targetProfile.name} ile güçlü bir uyum görüyoruz. Birbirinizi tanıdıkça daha da yakınlaşabilirsiniz.`;
  } else if (compatPercent >= 60) {
    summary = `${targetProfile.name} ile ilginç bir potansiyel var. Farklılıklarınız sizi zenginleştirebilir.`;
  } else {
    summary = `${targetProfile.name} ile farklı bakış açılarınız olabilir ama bu yeni şeyler öğrenmeniz için bir fırsat!`;
  }

  // Default talking points
  if (talkingPoints.length === 0) {
    talkingPoints.push(
      'Hafta sonu planlarınızı paylaşarak başlayabilirsiniz.',
      'En sevdiğiniz seyahat anınızı sorun — harika bir sohbet başlangıcı!',
    );
  }

  return { summary, strengths: strengths.slice(0, 3), talkingPoints: talkingPoints.slice(0, 3) };
}

// ─── AI Icebreakers ──────────────────────────────────────────────

const ICEBREAKER_BANK: Record<IcebreakerTone, string[]> = {
  funny: [
    'Netflix şifreni paylaşmana kaç gün kaldı? Sadece merak 😄',
    'Eğer bir pizza malzemesi olsaydın ne olurdun? Ben kesinlikle ekstra peynir 🍕',
    'Profilini gördüm ve kahvemi döktüm — sorumluluk kabul ediyor musun? ☕',
    'Biri "merhaba" yazarsa sıradanlıktan ölürsün, ben farklı olmak istedim 🎯',
    'Dünyada en son kalan iki kişi olsak, ilk ne yapardık? (Doğru cevap: pizza sipariş etmek)',
  ],
  romantic: [
    'Gülümsemen gözlerinden bile belli oluyor, merak ettim seni tanıyabilir miyim? 🌹',
    'Bazı profiller görünce duraksarsın — seninki o profillerden biri ✨',
    'Sana "güzelsin" demek kolay, ama seni dinlemek istiyorum — anlat bakalım 💫',
    'Gözlerinde bir hikaye var, duymak isterim 📖',
  ],
  casual: [
    'Selam! Profilinde {interest} gördüm — ben de bayılıyorum! Favorin hangisi?',
    'Merhaba {name}! {city} en sevdiğin mekan neresi?',
    'Hey! Bio\'nu okuyunca yazmak istedim — çok samimi 😊',
    'Selam! Haftasonun nasıl geçiyor?',
  ],
  flirty: [
    'Profilini gördüm, geri dönüş yapma ihtimalin var mı? Çünkü ben şimdiden like\'ladım 😏',
    'Eğer güzellik suç olsaydı, sen çoktan müebbet alırdın 🔥',
    'Sola mı kaydıracaktım ama parmağım seni görmezden gelmeyi reddetti 💘',
  ],
  deep: [
    'Hayatta seni en çok heyecanlandıran şey ne? Gerçekten merak ediyorum.',
    'Kendini 3 kelimeyle anlatsan ne derdin? Ben: meraklı, hayalci, kararsız 😄',
    'En son ne zaman "vay be, hayat güzel" dedin?',
    'Eger zaman makinan olsa, nereye giderdin ve neden?',
  ],
};

export function generateIcebreakers(
  targetProfile: ProfileContext,
  count: number = 3,
): AIIcebreaker[] {
  const tones: IcebreakerTone[] = ['funny', 'casual', 'romantic', 'flirty', 'deep'];
  const results: AIIcebreaker[] = [];
  const usedTones = new Set<IcebreakerTone>();

  for (let i = 0; i < count; i++) {
    // Pick a unique tone for variety
    let tone = tones[i % tones.length];
    if (usedTones.has(tone)) {
      tone = tones.find((t) => !usedTones.has(t)) ?? 'casual';
    }
    usedTones.add(tone);

    const bank = ICEBREAKER_BANK[tone];
    const template = bank[Math.floor(Math.random() * bank.length)];
    const text = template
      .replace('{name}', targetProfile.name)
      .replace('{city}', targetProfile.city ?? 'sehrin')
      .replace('{interest}', targetProfile.interests?.[0] ?? 'hobilerini');

    const emojiMap: Record<IcebreakerTone, string> = {
      funny: '😄',
      romantic: '💫',
      casual: '👋',
      flirty: '😏',
      deep: '🤔',
    };

    results.push({ text, tone, emoji: emojiMap[tone] });
  }

  return results;
}

// ─── Profile Analysis & Tips ─────────────────────────────────────

export function analyzeProfile(profile: ProfileContext): AIProfileTip[] {
  const tips: AIProfileTip[] = [];

  // Photo tips
  if (!profile.photos || profile.photos < 3) {
    tips.push({
      id: 'photos_count',
      category: 'photo',
      tip: 'En az 3 fotoğraf ekle — profiller 3+ fotoğrafla %70 daha fazla etkileşim alıyor.',
      priority: 'high',
      icon: 'camera-outline',
    });
  }
  if (profile.photos && profile.photos < 5) {
    tips.push({
      id: 'photos_variety',
      category: 'photo',
      tip: 'Farklı ortamlarda fotoğraflar ekle: dış mekan, hobilerini gösterir, gülümsediğin bir kare.',
      priority: 'medium',
      icon: 'images-outline',
    });
  }

  // Bio tips
  if (!profile.bio || profile.bio.length < 20) {
    tips.push({
      id: 'bio_short',
      category: 'bio',
      tip: 'Biyografin çok kısa! Kendini 2-3 cümleyle tanıt — insanlar sana mesaj atabilecek bir kapı arar.',
      priority: 'high',
      icon: 'create-outline',
    });
  } else if (profile.bio && profile.bio.length < 80) {
    tips.push({
      id: 'bio_expand',
      category: 'bio',
      tip: 'Biyografine bir espri veya ilginç bir detay ekle — dikkat çekici profiller %40 daha fazla eşleşme alıyor.',
      priority: 'medium',
      icon: 'bulb-outline',
    });
  }

  // Interest tips
  if (!profile.interests || profile.interests.length < 3) {
    tips.push({
      id: 'interests_few',
      category: 'interests',
      tip: 'En az 5 ilgi alanı ekle — ortak hobileri olan insanlarla eşleşmek çok daha kolay.',
      priority: 'high',
      icon: 'heart-outline',
    });
  }

  // Prompt tips
  if (!profile.prompts || profile.prompts < 2) {
    tips.push({
      id: 'prompts_add',
      category: 'prompts',
      tip: 'Profil sorularını yanıtla! İnsanların sana ilk mesaj atmasını kolaylaştırır.',
      priority: 'medium',
      icon: 'chatbubble-ellipses-outline',
    });
  }

  // Job tip
  if (!profile.job) {
    tips.push({
      id: 'job_missing',
      category: 'general',
      tip: 'Mesleği belirtmek güven oluşturur — insanlar ciddi profillere daha çok ilgi gösteriyor.',
      priority: 'low',
      icon: 'briefcase-outline',
    });
  }

  // Intention tag
  if (!profile.intentionTag) {
    tips.push({
      id: 'intention_missing',
      category: 'general',
      tip: 'Ne aradığını belirt — aynı niyetteki insanlarla eşleşmek %30 daha kolay.',
      priority: 'medium',
      icon: 'flag-outline',
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  tips.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return tips;
}

// ─── Chat Reply Suggestions ──────────────────────────────────────

const REPLY_TEMPLATES: Record<string, string[]> = {
  greeting: [
    'Merhaba! Nasılsın? 😊',
    'Selaam! Profilini çok beğendim, tanışmak isterim 🌟',
    'Hey! Günün nasıl geçiyor?',
  ],
  question: [
    'İyi soru! Benim için {topic} çok önemli, sen ne düşünüyorsun?',
    'Hmm, düşünmem lazım ama ilk aklıma gelen... 😄',
    'Çok güzel bir soru sordun! Sana detaylı anlatmak isterim.',
  ],
  compliment: [
    'Çok tatlısın, teşekkür ederim! 😊',
    'Aww, bu çok güzel bir şey! Sen de çok kibarsın 💫',
    'Bu beni çok mutlu etti, sağol! ☺️',
  ],
  hobby: [
    'Ben de bayiliyorum! En son ne zaman yaptin?',
    'Gerçekten mi? Bu konuda çok tutkulum! Anlatsana 🎯',
    'Harika! Belki birlikte deneyebiliriz? 😊',
  ],
  plan: [
    'Kulaga harika geliyor! Ne zaman musait olursun?',
    'Olur! Hafta sonu nasil sana?',
    'Çok isterim! Mekan önerisi var mı?',
  ],
  general: [
    'Anlat bakalim, merak ettim 😊',
    'Haha çok iyi! 😄',
    'Aynen öyle, katılıyorum!',
    'Vay be, bunu bilmiyordum!',
  ],
};

export function generateChatSuggestions(
  _lastMessage: string,
  context: 'greeting' | 'question' | 'compliment' | 'hobby' | 'plan' | 'general' = 'general',
): AIChatSuggestion[] {
  const templates = REPLY_TEMPLATES[context] ?? REPLY_TEMPLATES.general;

  return templates.slice(0, 3).map((text) => ({
    text,
    tone: 'casual' as IcebreakerTone,
  }));
}

// ─── Detect message context ──────────────────────────────────────

export function detectMessageContext(message: string): 'greeting' | 'question' | 'compliment' | 'hobby' | 'plan' | 'general' {
  const lower = message.toLowerCase();

  if (lower.includes('merhaba') || lower.includes('selam') || lower.includes('hey') || lower.includes('nasilsin')) {
    return 'greeting';
  }
  if (lower.includes('?') || lower.includes('mi ') || lower.includes('musun') || lower.includes('misin')) {
    return 'question';
  }
  if (lower.includes('guzel') || lower.includes('tatli') || lower.includes('harika') || lower.includes('muhtesem')) {
    return 'compliment';
  }
  if (lower.includes('bulusmak') || lower.includes('gorusmek') || lower.includes('kahve') || lower.includes('yemek')) {
    return 'plan';
  }
  if (lower.includes('hobi') || lower.includes('spor') || lower.includes('muzik') || lower.includes('film') || lower.includes('kitap')) {
    return 'hobby';
  }

  return 'general';
}
