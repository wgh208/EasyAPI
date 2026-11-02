import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { dbErrorResponse } from "@/lib/server/api-helpers";
import { catchError, responseMessage } from "@/lib/utils";
import { RESPONSE } from "@/enums";

// 禁用 Vercel 缓存
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get("format");

    const supabase = await getSupabaseServerClient();
    
    // 从数据库随机取一条
    const { data, error } = await supabase.rpc("get_random_diary_poetry");

    if (error) {
      return dbErrorResponse(error, "get_random_diary_poetry");
    }

    if (!data) {
      return NextResponse.json(
        responseMessage(null, "暂无数据", RESPONSE.ERROR),
      );
    }

    // 返回 text 格式
    if (format === "text") {
      return new NextResponse(data.content, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      });
    }

    return NextResponse.json(responseMessage(data), {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  } catch (err) {
    return NextResponse.json(catchError(err));
  }
}
