import { SvelteKitAuth } from '@auth/sveltekit';
import GitHub from '@auth/sveltekit/providers/github';
import Google from '@auth/sveltekit/providers/google';

export const { handle } = SvelteKitAuth({
  providers: [
    GitHub({
      clientId: import.meta.env.VITE_GITHUB_ID,
      clientSecret: import.meta.env.VITE_GITHUB_SECRET
    }),
    Google({
      clientId: import.meta.env.VITE_GOOGLE_ID,
      clientSecret: import.meta.env.VITE_GOOGLE_SECRET
    })
  ],
  secret: import.meta.env.VITE_AUTH_SECRET,
  trustHost: true
});
