/**
 * LUMA V1 — Centralized Configuration
 *
 * All environment variables are validated and typed here.
 * Import via NestJS ConfigService:
 *
 *   constructor(private config: ConfigService) {}
 *   const dbUrl = this.config.get<string>('database.url');
 *
 * Missing required variables throw a clear error at startup,
 * preventing the app from running with invalid configuration.
 */

export interface AppConfig {
  app: {
    name: string;
    env: string;
    port: number;
    corsOrigins: string[];
  };
  database: {
    url: string;
  };
  redis: {
    url: string;
  };
  elasticsearch: {
    url: string;
  };
  jwt: {
    secret: string;
    refreshSecret: string;
    accessExpiry: string;
    refreshExpiry: string;
    refreshExpiryDays: number;
  };
  throttle: {
    ttl: number;
    limit: number;
  };
  twilio: {
    accountSid: string | undefined;
    authToken: string | undefined;
    fromNumber: string | undefined;
  };
  netgsm: {
    usercode: string | undefined;
    password: string | undefined;
    msgheader: string | undefined;
  };
  firebase: {
    projectId: string | undefined;
    clientEmail: string | undefined;
    privateKey: string | undefined;
  };
  aws: {
    region: string;
    accessKeyId: string | undefined;
    secretAccessKey: string | undefined;
    s3BucketName: string | undefined;
    cloudfrontUrl: string | undefined;
  };
  sentry: {
    dsn: string | undefined;
    environment: string | undefined;
  };
  mixpanel: {
    token: string | undefined;
  };
  admin: {
    userIds: string[];
    moderatorIds: string[];
  };
}

/**
 * Reads a required environment variable. Throws with a clear message
 * if it is missing or empty in production.
 */
function required(key: string, env: string): string {
  const value = process.env[key];
  if (value !== undefined && value !== '') {
    return value;
  }
  if (env === 'production') {
    throw new Error(
      `[LUMA Config] Missing required environment variable: ${key}. ` +
        `Set it in your .env file or ECS task definition.`,
    );
  }
  return '';
}

/**
 * Reads an optional environment variable with a default value.
 */
function optional(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * NestJS ConfigModule factory function.
 * Used with: ConfigModule.forRoot({ load: [configuration] })
 */
export default (): AppConfig => {
  const env = optional('NODE_ENV', 'development');
  const isProduction = env === 'production';

  // ── Validate critical vars in production ──────────────
  if (isProduction) {
    const criticalVars = [
      'DATABASE_URL',
      'REDIS_URL',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
    ];
    const missing = criticalVars.filter(
      (v) => !process.env[v] || process.env[v] === '',
    );
    if (missing.length > 0) {
      throw new Error(
        `[LUMA Config] Missing critical environment variables for production: ${missing.join(', ')}. ` +
          `The application cannot start without these.`,
      );
    }

    // Warn about insecure JWT secrets
    const jwtSecret = process.env.JWT_SECRET || '';
    if (
      jwtSecret.includes('change-this') ||
      jwtSecret.includes('dev-key') ||
      jwtSecret.length < 32
    ) {
      throw new Error(
        '[LUMA Config] JWT_SECRET is insecure. Use a random 256-bit key in production. ' +
          'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
      );
    }
  }

  return {
    app: {
      name: optional('APP_NAME', 'luma'),
      env,
      port: parseInt(optional('PORT', '3000'), 10),
      corsOrigins: optional('CORS_ORIGINS', 'http://localhost:3000,http://localhost:8081')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    },
    database: {
      url: required('DATABASE_URL', env),
    },
    redis: {
      url: optional('REDIS_URL', 'redis://localhost:6379'),
    },
    elasticsearch: {
      url: optional('ELASTICSEARCH_URL', 'http://localhost:9200'),
    },
    jwt: {
      secret: required('JWT_SECRET', env),
      refreshSecret: required('JWT_REFRESH_SECRET', env),
      accessExpiry: optional('JWT_ACCESS_EXPIRY', '15m'),
      refreshExpiry: optional('JWT_REFRESH_EXPIRY', '7d'),
      refreshExpiryDays: parseInt(optional('JWT_REFRESH_EXPIRY_DAYS', '7'), 10),
    },
    throttle: {
      ttl: parseInt(optional('THROTTLE_TTL', '60'), 10),
      limit: parseInt(optional('THROTTLE_LIMIT', '100'), 10),
    },
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      fromNumber: process.env.TWILIO_FROM_NUMBER,
    },
    netgsm: {
      usercode: process.env.NETGSM_USERCODE,
      password: process.env.NETGSM_PASSWORD,
      msgheader: process.env.NETGSM_MSGHEADER,
    },
    firebase: {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    aws: {
      region: optional('AWS_REGION', 'eu-west-1'),
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      s3BucketName: process.env.S3_BUCKET_NAME,
      cloudfrontUrl: process.env.CLOUDFRONT_URL,
    },
    sentry: {
      dsn: process.env.SENTRY_DSN,
      environment: process.env.SENTRY_ENVIRONMENT || env,
    },
    mixpanel: {
      token: process.env.MIXPANEL_TOKEN,
    },
    admin: {
      userIds: (process.env.ADMIN_USER_IDS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      moderatorIds: (process.env.MODERATOR_USER_IDS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    },
  };
};
