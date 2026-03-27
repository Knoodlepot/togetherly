import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Lazy singleton — throws at call time (not module load) when env vars are missing
let _client = null;

export const supabase = new Proxy(
  {},
  {
    get(_, prop) {
      if (!_client) {
        if (!url || !key) {
          throw new Error(
            'Supabase is not configured. Copy .env.local.example to .env.local and add your keys.'
          );
        }
        _client = createClient(url, key);
      }
      const val = _client[prop];
      return typeof val === 'function' ? val.bind(_client) : val;
    },
  }
);
