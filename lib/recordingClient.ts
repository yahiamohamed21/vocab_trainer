// lib/recordingClient.ts
import { post, del } from '@/lib/api/httpClient';

export async function saveWordRecording(
  wordId: string,
  base64Audio: string,
  fileExt = 'webm'
) {
  return await post('/api/words/recording/save', {
    wordId,
    base64Audio,
    fileExt,
  });
}

export async function getWordRecording(wordId: string): Promise<Blob> {
  // endpoint بيرجع File(bytes, contentType)
  return await post<Blob>(
    '/api/words/recording/get',
    { wordId },
    { responseType: 'blob' }
  );
}

export async function deleteWordRecording(wordId: string) {
  // DELETE + body { wordId }
  return await del('/api/words/recording/delete', { wordId });
}
