import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://wezet-backend-staging-499942741847.us-central1.run.app";

function buildTargetUrl(path: string[], search: string) {
  const joined = path.join("/");

  const targetPath =
    path[0] === "dashboard"
      ? `/api/${joined}`
      : `/${joined}`;

  return `${BACKEND_URL}${targetPath}${search}`;
}

async function handler(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const { path } = await ctx.params;
  const url = new URL(req.url);
  const targetUrl = buildTargetUrl(path, url.search);

  const headers = new Headers();
  const contentType = req.headers.get("content-type");
  const cookie = req.headers.get("cookie");

  if (contentType) headers.set("content-type", contentType);
  if (cookie) headers.set("cookie", cookie);

  const method = req.method.toUpperCase();
  const body =
    method === "GET" || method === "HEAD"
      ? undefined
      : await req.text();

  const backendRes = await fetch(targetUrl, {
    method,
    headers,
    body,
    redirect: "manual",
    cache: "no-store",
  });

  const responseHeaders = new Headers();

  const backendContentType = backendRes.headers.get("content-type");
  if (backendContentType) {
    responseHeaders.set("content-type", backendContentType);
  }

  const setCookie = backendRes.headers.get("set-cookie");
  if (setCookie) {
    responseHeaders.append("set-cookie", setCookie);
  }

  const buffer = await backendRes.arrayBuffer();

  return new NextResponse(buffer, {
    status: backendRes.status,
    headers: responseHeaders,
  });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;