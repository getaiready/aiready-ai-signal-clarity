import type { NextAuthConfig } from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { getUserByEmail, createUser } from './db';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

// Extend the session type
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      accessToken?: string;
    };
  }
}

export const authConfig: NextAuthConfig = {
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: { params: { scope: 'read:user user:email repo' } },
      allowDangerousEmailAccountLinking: true,
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      id: 'credentials',
      name: 'Email',
      credentials: {
        email: {
          label: 'Email',
          type: 'email',
          placeholder: 'name@example.com',
        },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await getUserByEmail(email);
        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
    Credentials({
      id: 'magic-link',
      name: 'Magic Link',
      credentials: {
        userId: { label: 'User ID', type: 'text' },
        email: { label: 'Email', type: 'email' },
      },
      async authorize(credentials) {
        // This is called after magic link verification
        // The userId and email are passed from the verify page
        if (!credentials?.userId || !credentials?.email) {
          return null;
        }

        const user = await getUserByEmail(credentials.email as string);
        if (!user || user.id !== credentials.userId) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // For OAuth providers, just allow sign-in - we'll create the user lazily
      // The user will be created in the dashboard page if they don't exist
      return true;
    },
    async jwt({ token, account, user, trigger, session }) {
      // Initial sign in
      if (account && user) {
        token.accessToken = account.access_token;
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.image = user.image;

        // CRITICAL: Robust sync with database ID
        // This prevents the "missing repo" issue by ensuring the session ID
        // always matches the database ID from the moment of login.
        if (user.email) {
          const dbUser = await getUserByEmail(user.email);
          if (dbUser) {
            token.id = dbUser.id;
            console.log(
              `[NextAuth] Synced session ID with database ID for ${user.email}: ${dbUser.id}`
            );
          } else {
            // If user doesn't exist yet, use the provider ID (which is user.id here)
            // This ID will be used when we create the user in the dashboard.
            console.log(
              `[NextAuth] New user detected, using provider ID for ${user.email}: ${user.id}`
            );
          }
        }

        // Store provider info for lazy user creation
        if (account.provider === 'google' || account.provider === 'github') {
          token.provider = account.provider;
          token.providerAccountId = account.providerAccountId;
        }
      }

      // Update session
      if (trigger === 'update' && session) {
        token = { ...token, ...session };
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = (token.email as string) || session.user.email;
        session.user.name = token.name as string | null | undefined;
        session.user.image = token.image as string | null | undefined;
        session.user.accessToken = token.accessToken as string | undefined;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      const isOnApi = nextUrl.pathname.startsWith('/api');

      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login
      }

      // Allow API routes and public pages
      if (
        isOnApi ||
        nextUrl.pathname === '/' ||
        nextUrl.pathname === '/login' ||
        nextUrl.pathname === '/metrics' ||
        nextUrl.pathname === '/terms' ||
        nextUrl.pathname === '/privacy'
      ) {
        return true;
      }

      return isLoggedIn;
    },
  },
  pages: {
    signIn: '/login',
  },
};
