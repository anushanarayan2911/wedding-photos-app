function fileToBase64(file: File): Promise<{ mediaType: string; data: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const [header, data] = result.split(',')
      const mediaType = header.match(/data:(.*);base64/)?.[1] ?? file.type
      resolve({ mediaType, data })
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export async function classifyPhoto(file: File): Promise<string> {
  const { mediaType, data } = await fileToBase64(file)

  const response = await fetch('/api/classify-photo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mediaType, data }),
    signal: AbortSignal.timeout(30000),
  })
  const json = await response.json()

  if (!response.ok) {
    throw new Error(json.error ?? 'Could not classify this photo.')
  }
  return json.category as string
}
