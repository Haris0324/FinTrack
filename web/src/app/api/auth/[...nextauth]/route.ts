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
import { headers } from "next/headers";

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
        password: { label: "Password", type: "password" },
        twoFactorCode: { label: "2FA Code", type: "text" }
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
          throw new Error("ACCOUNT_NOT_VERIFIED");
        }
        const isPasswordCorrect = await bcrypt.compare(credentials.password, user.password);
        if (!isPasswordCorrect) {
          // Log failed attempt manually since events.signIn won't trigger
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

        return { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
      }
    })
  ],
  session: { 
    strategy: "jwt",
    maxAge: 3 * 60 * 60, // 3 hours absolute expiry
    updateAge: 30 * 60, // Refresh every 30 mins
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" || account?.provider === "github") {
        await connectToDatabase();
        const existingUser = await User.findOne({ email: user.email });
        
        const name = user.name || (profile as any)?.login || user.email?.split('@')[0] || "User";
        const profilePicture = user.image || "";

        if (!existingUser) {
          // Auto-create user for OAuth
          await User.create({
            name,
            email: user.email,
            role: "user",
            profilePicture,
            providers: [account.provider],
            isVerified: true, // OAuth emails are verified
          });
        } else {
            // Update existing user with name/picture if they are missing
            let updated = false;
            if (!existingUser.name) {
                existingUser.name = name;
                updated = true;
            }
            if (!existingUser.profilePicture) {
                existingUser.profilePicture = profilePicture;
                updated = true;
            }
            if (!existingUser.providers.includes(account.provider)) {
                existingUser.providers.push(account.provider);
                updated = true;
            }
            if (!existingUser.isVerified) {
                existingUser.isVerified = true;
                updated = true;
            }
            if (updated) await existingUser.save();
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        await connectToDatabase();
        const dbUser = await User.findOne({ email: token.email });
        
        if (dbUser) {
          token.id = dbUser._id.toString();
          token.role = dbUser.role;
          token.image = dbUser.profilePicture;

          // If it's a fresh sign in (user object is present), create a session log
          if (!(user as any).sessionId) {
            try {
              const headerList = await headers();
              const ip = headerList.get('x-forwarded-for') || 'Unknown IP';
              const userAgentStr = headerList.get('user-agent') || '';
              const parser = new UAParser(userAgentStr);
              const result = parser.getResult();
              const device = result.device.type === 'mobile' ? 'Mobile App' : (result.os.name || 'Unknown Device');
              const browser = result.browser.name || 'Unknown Browser';

              const sessionLog = await SessionLog.create({
                userId: dbUser._id,
                device,
                browser,
                ip
              });
              token.sessionId = sessionLog._id.toString();
            } catch (e) {
              console.error("Failed to create session log in JWT callback", e);
            }
          } else {
            token.sessionId = (user as any).sessionId;
          }
        }
      }

      if (trigger === "update") {
        await connectToDatabase();
        const dbUser = await User.findById(token.id);
        if (dbUser) {
          token.image = dbUser.profilePicture;
          token.name = dbUser.name;
          token.role = dbUser.role;
        }
      }
      
      // Verify session exists in DB
      if (token.sessionId) {
        await connectToDatabase();
        const activeSession = await SessionLog.findById(token.sessionId);
        if (!activeSession) {
          return { ...token, error: "SessionRevoked" };
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token.error === "SessionRevoked") {
        return { ...session, error: "SessionRevoked" };
      }
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).sessionId = token.sessionId;
        session.user.image = token.image as string;
      }
      return session;
    }
  },
  events: {
    async signIn({ user, account }) {
      try {
        await connectToDatabase();
        const dbUser = await User.findOne({ email: user.email });
        if (!dbUser) return;

        const headerList = await headers();
        const ip = headerList.get('x-forwarded-for') || 'Unknown IP';

        // Log Activity (This creates the "Logged in" notification)
        await ActivityLog.create({
          userId: dbUser._id,
          action: 'Logged in',
          status: 'Success',
          type: 'success',
          ip
        });
      } catch (err) {
        console.error("Error in signIn event:", err);
      }
    }
  },
  pages: {
    signIn: "/signin",
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
