import { NextRequest, NextResponse } from 'next/server'

// 환경 변수에서 유효한 초대 코드 목록 가져오기
// INVITE_CODES=CODE1,CODE2,CODE3 형식
function getValidInviteCodes(): string[] {
  const codes = process.env.INVITE_CODES || ''
  return codes
    .split(',')
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean)
}

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { valid: false, error: '초대 코드를 입력해주세요.' },
        { status: 400 }
      )
    }

    const validCodes = getValidInviteCodes()

    // 환경 변수에 코드가 설정되지 않은 경우 (개발 환경 등)
    if (validCodes.length === 0) {
      return NextResponse.json(
        { valid: false, error: '초대 코드 시스템이 설정되지 않았습니다.' },
        { status: 500 }
      )
    }

    const normalizedCode = code.trim().toUpperCase()
    const isValid = validCodes.includes(normalizedCode)

    if (!isValid) {
      return NextResponse.json(
        { valid: false, error: '유효하지 않은 초대 코드입니다.' },
        { status: 400 }
      )
    }

    return NextResponse.json({ valid: true })
  } catch {
    return NextResponse.json(
      { valid: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
