import { compare } from "bcryptjs";
import type { UserRole } from "@prisma/client";
import type { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { redirect } from "next/navigation";

import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations";

type AuthUser = {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  name?: string | null;
  image?: string | null;
};

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            email: parsed.data.email,
          },
        });

        if (!user) {
          return null;
        }

        const passwordMatches = await compare(parsed.data.password, user.passwordHash);

        if (!passwordMatches) {
          return null;
        }

        const authUser: AuthUser = {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          name: user.displayName ?? user.username,
          image: user.avatarUrl ?? null,
        };

        return authUser;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.username = user.username;
        token.role = user.role;
        token.name = user.name;
        token.picture = user.image;
      }

      if (trigger === "update" && session?.user) {
        token.username = session.user.username;
        token.role = session.user.role;
        token.name = session.user.name;
        token.picture = session.user.image;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.username = token.username;
        session.user.role = token.role;
        session.user.name = token.name;
        session.user.image = token.picture ?? null;
      }

      return session;
    },
  },
  secret: getEnv().NEXTAUTH_SECRET,
};

export const authHandler = NextAuth(authOptions);

export async function auth() {
  return getServerSession(authOptions);
}

export async function requireSession() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return session;
}

export async function requireAdminSession() {
  const session = await requireSession();

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return session;
}
