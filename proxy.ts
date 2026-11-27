import { NextRequest, NextResponse } from "next/server";
import { validSellerCredential } from "./lib/operations/seller-access";
import { isLoopbackRequest } from "./lib/operations/request-origin";

export function proxy(request: NextRequest) {
  if (validSellerCredential(request)) return NextResponse.next();
  if (!process.env.RIP_VISION_ACCESS_TOKEN) {
    if (
      process.env.NODE_ENV === "development" &&
      isLoopbackRequest(request) &&
      !process.env.RAILWAY_ENVIRONMENT
    )
      return NextResponse.next();
    // The public hackathon dataset is fictional. Show the read-only demo until a seller code is configured.
    if (request.method === "GET" || request.method === "HEAD")
      return NextResponse.next();
    return NextResponse.json(
      {
        error:
          "Set RIP_VISION_ACCESS_TOKEN on the server to enable seller actions.",
      },
      { status: 503 },
    );
  }
  return NextResponse.json(
    {
      error:
        "Seller access required. Sign in as seller with the private access code.",
    },
    {
      status: 401,
      headers: {
        "WWW-Authenticate":
          'Basic realm="RIP seller workspace", charset="UTF-8"',
        "Cache-Control": "no-store",
      },
    },
  );
}
export const config = {
  matcher: [
    "/verification",
    "/inspection",
    "/delivery",
    "/tracking",
    "/matches",
    "/logistics",
    "/dashboard",
    "/analytics",
    "/api/verification",
    "/api/inspection",
    "/api/delivery",
    "/api/tracking",
    "/api/matches",
    "/api/logistics",
    "/api/reroute",
    "/api/dashboard",
    "/api/analytics",
  ],
};
