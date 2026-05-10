import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";
import connectToDatabase from "@/lib/mongoose";
import User from "@/models/User";
import ActivityLog from "@/models/ActivityLog";
import SessionLog from "@/models/SessionLog";
import bcrypt from "bcrypt";
import { UAParser } from "ua-parser-js";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    GithubProvider({
      clientId: process.env.GITHUB_ID || "",
      clientSecret: process.env.GITHUB_SECRET || "",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }
        await connectToDatabase();
        const user = await User.findOne({ email: credentials.email });
        if (!user) {
          return null;
        }
        if (!user.password && user.providers?.length) {
          return null;
        }
        if (!user.password) {
          return null;
        }
        if (user.isVerified === false) {
          return null;
        }
        const isPasswordCorrect = await bcrypt.compare(credentials.password, user.password);
        if (!isPasswordCorrect) {
          // Log failed attempt
          try {
             const ip = req.headers?.['x-forwarded-for'] || 'Unknown IP';
             await ActivityLog.create({
               userId: user._id,
               action: 'Failed login attempt',
               status: 'Warning',
               type: 'warning',
               ip
             });
          } catch(e) {}
          return null;
        }

        // Check 2FA if enabled
        if (user.twoFactorEnabled) {
          if (!credentials?.twoFactorCode) {
            throw new Error("2FA_REQUIRED");
          }
          if (user.twoFactorCode !== credentials.twoFactorCode || !user.twoFactorExpires || new Date() > user.twoFactorExpires) {
            throw new Error("Invalid or expired 2FA code");
          }
          // Clear the code after successful use
          user.twoFactorCode = undefined;
          user.twoFactorExpires = undefined;
          await user.save();
        }

        // Log success
        try {
           const ip = req.headers?.['x-forwarded-for'] || 'Unknown IP';
           const userAgentStr = req.headers?.['user-agent'] || '';
           const parser = new UAParser(userAgentStr);
           const result = parser.getResult();
           const device = result.device.type === 'mobile' ? 'Mobile App' : (result.os.name || 'Unknown Device');
           const browser = result.browser.name || 'Unknown Browser';
           
           await ActivityLog.create({
             userId: user._id,
             action: 'Logged in',
             status: 'Success',
             type: 'success',
             ip
           });

           await SessionLog.create({
             userId: user._id,
             device,
             browser,
             ip
           });
        } catch(e) {}

        return { id: user._id.toString(), name: user.name, email: user.email, role: user.role, profilePicture: user.profilePicture };
      }
    })
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" || account?.provider === "github") {
        await connectToDatabase();
        const existingUser = await User.findOne({ email: user.email });
        
        if (!existingUser) {
          // Auto-create user for OAuth
          await User.create({
            name: user.name,
            email: user.email,
            role: "user",
            providers: [account.provider],
          });
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        // If logged in via OAuth, we need to fetch role from DB if it exists
        if (account?.provider === "google" || account?.provider === "github") {
            await connectToDatabase();
            const dbUser = await User.findOne({ email: user.email });
            token.role = dbUser ? dbUser.role : "user";
        } else {
            token.role = (user as any).role || "user";
        }
        token.profilePicture = (user as any).profilePicture || "";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).profilePicture = token.profilePicture;
      }
      return session;
    }
  },
  pages: {
    signIn: "/signin",
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
