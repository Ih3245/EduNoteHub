import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return NextResponse.json({ error: 'Credentials missing' }, { status: 500 });
    }

    // 1. Upload to Telegram
    const tgFormData = new FormData();
    tgFormData.append('chat_id', TELEGRAM_CHAT_ID);
    tgFormData.append('document', file);

    const tgResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
      method: 'POST',
      body: tgFormData,
    });

    const tgResult = await tgResponse.json();

    if (!tgResult.ok) {
      return NextResponse.json({ error: tgResult.description }, { status: 500 });
    }

    // Extract file info from Telegram
    const document = tgResult.result.document;
    const fileId = document.file_id;
    const fileName = document.file_name || file.name;
    let fileType = 'file';
    if (fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i)) fileType = 'image';
    else if (fileName.match(/\.(zip|rar|7z)$/i)) fileType = 'zip';

    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1) + ' MB';

    // 2. Save metadata to Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data, error } = await supabase.from('notes').insert([
      {
        file_name: fileName,
        file_size: sizeInMb,
        file_type: fileType,
        telegram_file_id: fileId
      }
    ]).select();

    if (error) {
      console.error('Supabase Error:', error);
      return NextResponse.json({ error: 'Failed to save to database' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      note: data[0]
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
