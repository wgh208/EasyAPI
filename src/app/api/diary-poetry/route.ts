import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const supabase = await createClient()
    
    // 使用数据库随机函数
    const { data, error } = await supabase.rpc('get_random_diary_poetry')
    
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: '获取诗词失败' },
        { status: 500 }
      )
    }
    
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: '暂无诗词数据' },
        { status: 404 }
      )
    }
    
    // 返回随机结果，禁用所有缓存
    return NextResponse.json(data[0], {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
