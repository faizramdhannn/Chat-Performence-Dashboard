import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import googleSheets from '@/lib/googleSheets';
import bcrypt from 'bcryptjs';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          console.log('🔐 Attempting login for:', credentials.username);

          // Get user from Google Sheets
          const user = await googleSheets.getUserByUsername(credentials.username);

          if (!user) {
            console.log('❌ User not found:', credentials.username);
            return null;
          }

          // Verify password
          const isValidPassword = await bcrypt.compare(credentials.password, user.password);

          if (!isValidPassword) {
            console.log('❌ Invalid password for:', credentials.username);
            return null;
          }

          console.log('✅ Login successful for:', credentials.username);

          return {
            id: user.id,
            name: user.name || user.username,
            username: user.username,
            role: user.role,
          };
        } catch (error) {
          console.error('💥 Login error:', error);
          return null;
        }
      }
    })
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.username = user.username;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.username = token.username;
        session.user.role = token.role;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };