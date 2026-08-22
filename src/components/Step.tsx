interface StepProps {
  number: number
  title: string
  description: string
}

export default function Step({ number, title, description }: StepProps) {
  return (
    <div className="flex gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-black font-bold">
        {number}
      </div>
      <div>
        <h3 className="font-bold">{title}</h3>
        <p className="text-gray-500">{description}</p>
      </div>
    </div>
  )
}
