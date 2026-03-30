export declare const APP_NAME = "LUMA";
export declare const APP_VERSION = "1.0.0";
export declare const V1_LOCKED: {
    readonly mainCategories: 19;
    readonly subsystems: 48;
    readonly totalQuestions: 45;
    readonly coreQuestions: 20;
    readonly premiumQuestions: 25;
    readonly intentionTags: 3;
    readonly packages: 4;
    readonly menuTabs: 5;
    readonly matchAnimations: 2;
    readonly compatibilityLevels: 2;
    readonly badges: 8;
};
export declare const MENU_TABS: {
    readonly FEED: {
        readonly index: 0;
        readonly key: "feed";
        readonly label: "Feed";
        readonly icon: "home";
    };
    readonly DISCOVER: {
        readonly index: 1;
        readonly key: "discover";
        readonly label: "Keşfet";
        readonly icon: "compass";
    };
    readonly ACTIVITIES: {
        readonly index: 2;
        readonly key: "activities";
        readonly label: "Etkinlik";
        readonly icon: "calendar";
    };
    readonly MATCHES: {
        readonly index: 3;
        readonly key: "matches";
        readonly label: "Eşleşmeler";
        readonly icon: "heart";
    };
    readonly PROFILE: {
        readonly index: 4;
        readonly key: "profile";
        readonly label: "Profil";
        readonly icon: "user";
    };
};
export declare const INTENTION_TAG_LABELS: {
    readonly serious_relationship: {
        readonly en: "Looking for long-term compatibility";
        readonly tr: "Uzun vadeli uyumluluk arıyorum";
    };
    readonly exploring: {
        readonly en: "Open to a natural connection";
        readonly tr: "Doğal bir bağlantıya açığım";
    };
    readonly not_sure: {
        readonly en: "Exploring for now";
        readonly tr: "Şimdilik keşfediyorum";
    };
};
export declare const BADGE_DEFINITIONS: {
    readonly FIRST_SPARK: {
        readonly key: "first_spark";
        readonly tr: "İlk Kıvılcım";
        readonly en: "First Spark";
    };
    readonly CHAT_MASTER: {
        readonly key: "chat_master";
        readonly tr: "Sohbet Ustası";
        readonly en: "Chat Master";
    };
    readonly QUESTION_EXPLORER: {
        readonly key: "question_explorer";
        readonly tr: "Merak Uzmanı";
        readonly en: "Question Explorer";
    };
    readonly SOUL_MATE: {
        readonly key: "soul_mate";
        readonly tr: "Ruh İkizi";
        readonly en: "Soul Mate";
    };
    readonly VERIFIED_STAR: {
        readonly key: "verified_star";
        readonly tr: "Doğrulanmış Yıldız";
        readonly en: "Verified Star";
    };
    readonly COUPLE_GOAL: {
        readonly key: "couple_goal";
        readonly tr: "Çift Hedefi";
        readonly en: "Couple Goal";
    };
    readonly EXPLORER: {
        readonly key: "explorer";
        readonly tr: "Kaşif";
        readonly en: "Explorer";
    };
    readonly DEEP_MATCH: {
        readonly key: "deep_match";
        readonly tr: "Derin Uyum";
        readonly en: "Deep Match";
    };
};
export declare const PHOTO_LIMITS: {
    readonly minRequired: 2;
    readonly maxAllowed: 6;
    readonly maxFileSizeMB: 10;
    readonly allowedFormats: readonly ["image/jpeg", "image/png", "image/webp"];
    readonly thumbnailWidth: 200;
    readonly mediumWidth: 600;
    readonly fullWidth: 1200;
};
export declare const BIO_LIMITS: {
    readonly minLength: 10;
    readonly maxLength: 500;
};
export declare const AGE_LIMITS: {
    readonly minimum: 18;
    readonly maximum: 99;
};
export declare const DISCOVERY_LIMITS: {
    readonly FREE: 999999;
    readonly GOLD: 999999;
    readonly PRO: 999999;
    readonly RESERVED: 999999;
};
//# sourceMappingURL=app.d.ts.map