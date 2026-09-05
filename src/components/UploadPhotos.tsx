import { useRef, useState } from 'react'
import { classifyPhoto } from '../lib/classifyPhoto'
import type { CategorizedPhoto } from '../lib/categories'

interface UploadPhotosProps {
  onContinue: (photos: CategorizedPhoto[]) => void
}

interface UploadedPhoto {
  id: string
  url: string
  category: string | null
  error: string | null
}

export default function UploadPhotos({ onContinue }: UploadPhotosProps) {
  const [photos, setPhotos] = useState<UploadedPhoto[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function addFiles(fileList: FileList | null) {
    if (!fileList) return
    const files = Array.from(fileList).filter((file) => file.type.startsWith('image/'))

    for (const file of files) {
      const id = `${file.name}-${file.size}-${Math.random()}`
      const url = URL.createObjectURL(file)
      setPhotos((prev) => [...prev, { id, url, category: null, error: null }])

      classifyPhoto(file)
        .then((category) => {
          setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, category } : p)))
        })
        .catch((err) => {
          const message = err instanceof Error ? err.message : 'Could not classify this photo.'
          setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, error: message } : p)))
        })
    }
  }

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const target = prev.find((photo) => photo.id === id)
      if (target) URL.revokeObjectURL(target.url)
      return prev.filter((photo) => photo.id !== id)
    })
  }

  const stillClassifying = photos.some((photo) => !photo.category && !photo.error)

  return (
    <section className="flex justify-center bg-gray-50 px-6 py-14">
      <div className="w-full max-w-2xl rounded-lg border border-gray-200 bg-white p-10">
        <h1 className="mb-2 text-3xl font-bold">Upload Your Photos</h1>
        <p className="mb-8 text-sm text-gray-500">
          Add any photos you already have — engagement shoots, save-the-dates, anything at all. We'll sort them into
          moments from the day automatically. You can always add more later.
        </p>

        <label
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragging(false)
            addFiles(e.dataTransfer.files)
          }}
          className={`mb-6 flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed px-4 py-10 text-center text-sm transition-colors ${
            isDragging ? 'border-black bg-gray-50' : 'border-gray-300 text-gray-500'
          }`}
        >
          <span className="mb-1 font-bold text-black">Click to upload or drag and drop</span>
          <span>PNG, JPG, or HEIC</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </label>

        {photos.length > 0 && (
          <div className="mb-6 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {photos.map((photo) => (
              <div key={photo.id} className="group relative overflow-hidden rounded-md border border-gray-200">
                <div className="aspect-square">
                  <img src={photo.url} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="px-2 py-1.5 text-xs">
                  {photo.category && <span className="text-gray-700">{photo.category}</span>}
                  {photo.error && <span className="text-red-600">Couldn't sort this one</span>}
                  {!photo.category && !photo.error && <span className="text-gray-400">Sorting…</span>}
                </div>
                <button
                  type="button"
                  onClick={() => removePhoto(photo.id)}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Remove photo"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          disabled={stillClassifying}
          onClick={() =>
            onContinue(
              photos.map((photo) => ({ url: photo.url, category: photo.category ?? 'Little Moments' })),
            )
          }
          className="w-full rounded-md bg-black py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          {stillClassifying
            ? 'Sorting your photos…'
            : photos.length > 0
              ? `Continue with ${photos.length} photo${photos.length === 1 ? '' : 's'}`
              : 'Continue'}
        </button>
      </div>
    </section>
  )
}
