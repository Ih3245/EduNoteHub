import { NextResponse } from 'next/server';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get('id');
  const fileName = searchParams.get('name') || 'downloaded_file';

  if (!fileId) {
    return NextResponse.json({ error: 'Missing file ID' }, { status: 400 });
  }

  try {
    // 1. Get file path from Telegram
    const pathRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`);
    const pathData = await pathRes.json();

    if (!pathData.ok) {
      return NextResponse.json({ error: 'File not found on Telegram (may exceed 20MB limit)' }, { status: 404 });
    }

    const filePath = pathData.result.file_path;

    // 2. Fetch the actual file from Telegram
    const fileRes = await fetch(`https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`);

    if (!fileRes.ok) {
      return NextResponse.json({ error: 'Failed to download file' }, { status: 500 });
    }

    // 3. Stream it to the client
    const headers = new Headers(fileRes.headers);
    headers.set('Content-Disposition', `attachment; filename="${fileName}"`);

    return new NextResponse(fileRes.body, {
      status: 200,
      headers: headers,
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Download failed' }, { status: 500 });
  }
}
