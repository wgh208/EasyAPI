import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { RESPONSE } from "@/enums";
import { catchError, responseMessage } from "@/lib/utils";

// 你的 Hitokoto API 地址
const HITOKOTO_API = "https://hitokotov2.wgh.me/";

// 类型白名单
const ALLOWED_TYPES = new Set([
  "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l",
]);

const MAX_LENGTH = 1000;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // 解析参数
    const typeList = searchParams.get("type")?.split(",") || null;
    const minLength = searchParams.get("minLength") ? Number(searchParams.get("minLength")) : null;
    const maxLength = searchParams.get("maxLength") ? Number(searchParams.get("maxLength")) : null;
    const format = searchParams.get("format");

    // 参数校验
    if (
      (minLength !== null && Number.isNaN(minLength)) ||
      (maxLength !== null && Number.isNaN(maxLength))
    ) {
      return NextResponse.json(
        responseMessage(null, "minLength/maxLength 必须是数字", RESPONSE.ERROR),
      );
    }

    if (
      (minLength !== null && (minLength < 0 || minLength > MAX_LENGTH)) ||
      (maxLength !== null && (maxLength < 0 || maxLength > MAX_LENGTH))
    ) {
      return NextResponse.json(
        responseMessage(
          null,
          `minLength/maxLength 必须在 0 ~ ${MAX_LENGTH} 之间`,
          RESPONSE.ERROR,
        ),
      );
    }

    if (minLength !== null && maxLength !== null && minLength > maxLength) {
      return NextResponse.json(
        responseMessage(null, "minLength 不能大于 maxLength", RESPONSE.ERROR),
      );
    }

    // 构建请求 URL
    const apiUrl = new URL(HITOKOTO_API);
    if (typeList) {
      if (!typeList.every((type) => ALLOWED_TYPES.has(type))) {
        return NextResponse.json(
          responseMessage(
            null,
            `type 参数不合法，可选值：${[...ALLOWED_TYPES].join("、")}`,
            RESPONSE.ERROR,
          ),
        );
      }
      // Hitokoto API 支持单个 type 参数，随机选一个
      apiUrl.searchParams.set("c", typeList[Math.floor(Math.random() * typeList.length)]);
    }

    // 调用外部 API
    const response = await fetch(apiUrl.toString(), {
      headers: {
        "Accept": "application/json",
      },
      next: { revalidate: 60 }, // 缓存 60 秒
    });

    if (!response.ok) {
      throw new Error(`Hitokoto API 请求失败: ${response.status}`);
    }

    const rawData = await response.json();

    // 长度过滤（如果 API 不支持）
    if (
      (minLength !== null && rawData.length < minLength) ||
      (maxLength !== null && rawData.length > maxLength)
    ) {
      // 不符合条件，返回暂无数据
      return NextResponse.json(
        responseMessage(null, "暂无符合条件的数据", RESPONSE.ERROR),
      );
    }

    // 转换字段格式
    const data = {
      id: rawData.uuid || rawData.id,
      content: rawData.hitokoto,
      from: rawData.from || null,
      from_who: rawData.from_who || null,
      type: rawData.type,
      length: rawData.length,
      creator: rawData.creator || null,
      commit_from: rawData.commit_from || null,
    };

    // 返回纯文本格式
    if (format === "text") {
      return new NextResponse(data.content, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }

    return NextResponse.json(responseMessage(data));
  } catch (err) {
    return NextResponse.json(catchError(err));
  }
}
