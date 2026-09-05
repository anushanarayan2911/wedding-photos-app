interface PhotoGalleryProps {
  photos: string[]
  onContinue: () => void
}

export default function PhotoGallery({ photos, onContinue }: PhotoGalleryProps) {
  return (
    <section className="flex justify-center bg-gray-50 px-6 py-14">
      <div className="w-full max-w-4xl rounded-lg border border-gray-200 bg-white p-10">
        <h1 className="mb-2 text-3xl font-bold">Your Photos</h1>
        <p className="mb-8 text-sm text-gray-500">
          {photos.length > 0
            ? `Here${photos.length === 1 ? "'s" : ' are'} the ${photos.length} photo${photos.length === 1 ? '' : 's'} you uploaded.`
            : "You haven't uploaded any photos yet — you can always add some later."}
        </p>

        {photos.length > 0 && (
          <div className="mb-8 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {photos.map((url, i) => (
              <div key={i} className="aspect-square overflow-hidden rounded-md border border-gray-200">
                <img src={url} alt="" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        )}

        <button type="button" onClick={onContinue} className="w-full rounded-md bg-black py-3 text-sm font-bold text-white">
          Continue to Memory Board →
        </button>
      </div>
    </section>
  )
}
