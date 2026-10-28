import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    const noIndex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    return [
      { source: "/dashboard/:path*", headers: noIndex },
      { source: "/api/:path*", headers: noIndex },
      { source: "/unauthorized", headers: noIndex },
    ];
  },
};

export default nextConfig;
