// AI Service — Smart matching explanations, icebreakers, profile tips, chat suggestions
// Offline-first: uses local templates with AI-quality output
// Ready for Claude API integration when backend is connected

import { storage } from '../utils/storage';

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
    '{name} ile iletisim tarzlariniz cok benzer — birbirinizi anlamak icin fazla kelimeye ihtiyaciniz yok.',
    '{name} ile yasam hedefleriniz ortusiyor, bu uzun vadeli uyumun gostergesi.',
    'Degerleriniz neredeyse ayni! {name} ile guclu bir temel uzerine insa edebilirsiniz.',
    '{name} ile duygusal zekaniz birbirine yakin — birbirinizi hissedebilirsiniz.',
  ],
  sharedInterests: [
    '{interests} konusunda ortak tutkunuz var — ilk bulusma icin harika bir konu!',
    'Ikiniz de {interests} seviyorsunuz — bu uyumun guzel bir isareti.',
  ],
  sameIntention: [
    'Ikiniz de ayni niyettesiniz — bu baslangic icin onemli.',
    'Iliskiden beklentileriniz ortusiyor, bu nadir bulunan bir uyum.',
  ],
  sameCity: [
    'Ayni sehirdesiniz — bulusma planlamak cok kolay!',
    '{city} sizi bir araya getiriyor — belki yakinlardasinizdir.',
  ],
  complementary: [
    'Farkliklariniz birbirinizi tamamliyor — dengeyi seversiniz.',
    'Zit kutuplar birbirini ceker — ikiniz de farkli bakis acilari sunuyorsunuz.',
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
    summary = `${targetProfile.name} ile mukemmel bir uyumunuz var! Ortak degerleriniz ve yasam tarziniz birbirine cok yakin.`;
  } else if (compatPercent >= 75) {
    summary = `${targetProfile.name} ile guclu bir uyum goruyoruz. Birbirinizi tanidikca daha da yakinlasabilirsiniz.`;
  } else if (compatPercent >= 60) {
    summary = `${targetProfile.name} ile ilginc bir potansiyel var. Farkliklariniz sizi zenginlestirebilir.`;
  } else {
    summary = `${targetProfile.name} ile farkli bakis acilariniz olabilir ama bu yeni seyler ogrenmeniz icin bir firsat!`;
  }

  // Default talking points
  if (talkingPoints.length === 0) {
    talkingPoints.push(
      'Hafta sonu planlarinizi paylasarak baslayabilirsiniz.',
      'En sevdiginiz seyahat aninizisorun — harika bir sohbet baslangici!',
    );
  }

  return { summary, strengths: strengths.slice(0, 3), talkingPoints: talkingPoints.slice(0, 3) };
}

// ─── AI Icebreakers ──────────────────────────────────────────────

const ICEBREAKER_BANK: Record<IcebreakerTone, string[]> = {
  funny: [
    'Netflix sifreni paylasmana kac gun kaldi? Sadece merak 😄',
    'Eger bir pizza malzemesi olsaydin ne olurdun? Ben kesinlikle ekstra peynir 🍕',
    'Profilini gordum ve kahvemi doktum — sorumluluk kabul ediyor musun? ☕',
    'Biri "merhaba" yazarsa siradanliktan olursun, ben farkli olmak istedim 🎯',
    'Dunyada en son kalan iki kisi olsak, ilk ne yapardik? (Dogru cevap: pizza siparis etmek)',
  ],
  romantic: [
    'Gulumsemen gozlerinden bile belli oluyor, merak ettim seni taniyabilir miyim? 🌹',
    'Bazi profiller gorunce duraksarsin — seninki o profillerden biri ✨',
    'Sana "guzelsin" demek kolay, ama seni dinlemek istiyorum — anlat bakalim 💫',
    'Gozlerinde bir hikaye var, duymak isterim 📖',
  ],
  casual: [
    'Selam! Profilinde {interest} gordum — ben de bayiliyorum! Favorin hangisi?',
    'Merhaba {name}! {city} en sevdigin mekan neresi?',
    'Hey! Bio\'nu okuyunca yazmak istedim — cok samimi 😊',
    'Selam! Haftasonun nasil geciyor?',
  ],
  flirty: [
    'Profilini gordum, geri donus yapma ihtimalin var mi? Cunku ben simdiden like\'ladim 😏',
    'Eger guzellik suc olsaydi, sen coktan muebbet alirdin 🔥',
    'Sol mi kaydiracaktim ama parmagim seni gormezden gelmeyi reddetti 💘',
  ],
  deep: [
    'Hayatta seni en cok heyecanlandiran sey ne? Gercekten merak ediyorum.',
    'Kendini 3 kelimeyle anlatsan ne derdin? Ben: merakli, hayalci, kararsiz 😄',
    'En son ne zaman "vay be, hayat guzel" dedin?',
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
      tip: 'En az 3 fotograf ekle — profiller 3+ fotografla %70 daha fazla etkilesim aliyor.',
      priority: 'high',
      icon: 'camera-outline',
    });
  }
  if (profile.photos && profile.photos < 5) {
    tips.push({
      id: 'photos_variety',
      category: 'photo',
      tip: 'Farkli ortamlarda fotograflar ekle: dis mekan, hobilerini gosterir, gulumsedigin bir kare.',
      priority: 'medium',
      icon: 'images-outline',
    });
  }

  // Bio tips
  if (!profile.bio || profile.bio.length < 20) {
    tips.push({
      id: 'bio_short',
      category: 'bio',
      tip: 'Biyografin cok kisa! Kendini 2-3 cumleyle tanit — insanlar sana mesaj atabilecek bir kapı arar.',
      priority: 'high',
      icon: 'create-outline',
    });
  } else if (profile.bio && profile.bio.length < 80) {
    tips.push({
      id: 'bio_expand',
      category: 'bio',
      tip: 'Biyografine bir espri veya ilginc bir detay ekle — dikkat cekici profiller %40 daha fazla eslesme aliyor.',
      priority: 'medium',
      icon: 'bulb-outline',
    });
  }

  // Interest tips
  if (!profile.interests || profile.interests.length < 3) {
    tips.push({
      id: 'interests_few',
      category: 'interests',
      tip: 'En az 5 ilgi alani ekle — ortak hobileri olan insanlarla eslesmek cok daha kolay.',
      priority: 'high',
      icon: 'heart-outline',
    });
  }

  // Prompt tips
  if (!profile.prompts || profile.prompts < 2) {
    tips.push({
      id: 'prompts_add',
      category: 'prompts',
      tip: 'Profil sorularini yanitla! Insanlarin sana ilk mesaj atmasini kolaylastirir.',
      priority: 'medium',
      icon: 'chatbubble-ellipses-outline',
    });
  }

  // Job tip
  if (!profile.job) {
    tips.push({
      id: 'job_missing',
      category: 'general',
      tip: 'Meslegi belirtmek guven olusturur — insanlar ciddi profillere daha cok ilgi gosteriyor.',
      priority: 'low',
      icon: 'briefcase-outline',
    });
  }

  // Intention tag
  if (!profile.intentionTag) {
    tips.push({
      id: 'intention_missing',
      category: 'general',
      tip: 'Ne aradigini belirt — ayni niyetteki insanlarla eslesmek %30 daha kolay.',
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
    'Merhaba! Nasilsin? 😊',
    'Selaam! Profilini cok begendim, tanismak isterim 🌟',
    'Hey! Gunun nasil geciyor?',
  ],
  question: [
    'Iyi soru! Benim icin {topic} cok onemli, sen ne dusunuyorsun?',
    'Hmm, dusunmem lazim ama ilk aklima gelen... 😄',
    'Cok guzel bir soru sordun! Sana detayli anlatmak isterim.',
  ],
  compliment: [
    'Cok tatlisin, tesekkur ederim! 😊',
    'Aww, bu cok guzel bir sey! Sen de cok kibarsin 💫',
    'Bu beni cok mutlu etti, sagol! ☺️',
  ],
  hobby: [
    'Ben de bayiliyorum! En son ne zaman yaptin?',
    'Gercekten mi? Bu konuda cok tutkulum! Anlatsana 🎯',
    'Harika! Belki birlikte deneyebiliriz? 😊',
  ],
  plan: [
    'Kulaga harika geliyor! Ne zaman musait olursun?',
    'Olur! Hafta sonu nasil sana?',
    'Cok isterim! Mekan onerisi var mi?',
  ],
  general: [
    'Anlat bakalim, merak ettim 😊',
    'Haha cok iyi! 😄',
    'Aynen oyle, katiliyorum!',
    'Vay be, bunu bilmiyordum!',
  ],
};

export function generateChatSuggestions(
  lastMessage: string,
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
