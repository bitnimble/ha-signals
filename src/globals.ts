import 'dotenv/config';

type DeepNonNullable<T> = { [P in keyof T]-?: DeepNonNullable<NonNullable<T[P]>> };

function loadEnv() {
  console.log('Loading env');
  const env = {
    hassUrl: process.env.HOME_ASSISTANT_URL,
    authToken: process.env.AUTH_TOKEN,
  };

  for (const [key, value] of Object.entries(env)) {
    if (value == null || (typeof value === 'string' && value.trim() === '')) {
      throw new Error(`Missing env var ${key} - did you forget to set up your .env file?`);
    }
  }

  return env as DeepNonNullable<typeof env>;
}

export const globals = loadEnv();
