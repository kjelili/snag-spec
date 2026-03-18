const GOOGLE_UPLOAD_ENDPOINT = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart'
const GOOGLE_DOWNLOAD_ENDPOINT = 'https://www.googleapis.com/drive/v3/files'
const ONEDRIVE_UPLOAD_ENDPOINT = 'https://graph.microsoft.com/v1.0/me/drive/root'
const ONEDRIVE_DOWNLOAD_ENDPOINT = 'https://graph.microsoft.com/v1.0/me/drive/items'

const assertOk = async (response: Response, context: string) => {
  if (response.ok) {
    return
  }
  const body = await response.text()
  throw new Error(`${context} failed (${response.status}): ${body || 'No details'}`)
}

export const uploadToGoogleDrive = async (
  accessToken: string,
  filename: string,
  content: string
): Promise<{ fileId: string; webViewLink?: string }> => {
  const metadata = {
    name: filename,
    mimeType: 'application/json',
  }
  const boundary = `snagspec-${crypto.randomUUID()}`
  const multipartBody = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: application/json',
    '',
    content,
    `--${boundary}--`,
  ].join('\r\n')

  const response = await fetch(GOOGLE_UPLOAD_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  })

  await assertOk(response, 'Google Drive upload')
  const json = await response.json() as { id: string; webViewLink?: string }
  return { fileId: json.id, webViewLink: json.webViewLink }
}

export const downloadFromGoogleDrive = async (accessToken: string, fileId: string): Promise<string> => {
  const response = await fetch(`${GOOGLE_DOWNLOAD_ENDPOINT}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  await assertOk(response, 'Google Drive download')
  return response.text()
}

export const uploadToOneDrive = async (
  accessToken: string,
  filename: string,
  content: string
): Promise<{ itemId: string; webUrl?: string }> => {
  const encodedName = encodeURIComponent(filename)
  const response = await fetch(`${ONEDRIVE_UPLOAD_ENDPOINT}:/${encodedName}:/content`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: content,
  })

  await assertOk(response, 'OneDrive upload')
  const json = await response.json() as { id: string; webUrl?: string }
  return { itemId: json.id, webUrl: json.webUrl }
}

export const downloadFromOneDrive = async (accessToken: string, itemId: string): Promise<string> => {
  const response = await fetch(`${ONEDRIVE_DOWNLOAD_ENDPOINT}/${itemId}/content`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  await assertOk(response, 'OneDrive download')
  return response.text()
}
