export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/markets/:path*",
    "/portfolio/:path*",
    "/activity/:path*",
    "/leaderboard/:path*",
    "/settings/:path*",
    "/admin/:path*",
  ],
};
