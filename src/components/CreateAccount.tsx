import { useState, type FormEvent } from 'react'

interface CreateAccountProps {
  onCreated: () => void
  onSignIn: () => void
}

interface FormState {
  brideName: string
  groomName: string
  email: string
  password: string
  confirmPassword: string
  agreed: boolean
}

type FormErrors = Partial<Record<keyof FormState, string>>

const EMPTY_FORM: FormState = {
  brideName: '',
  groomName: '',
  email: '',
  password: '',
  confirmPassword: '',
  agreed: false,
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {}

  if (!form.brideName.trim()) errors.brideName = 'Required'
  if (!form.groomName.trim()) errors.groomName = 'Required'

  if (!form.email.trim()) errors.email = 'Required'
  else if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = 'Enter a valid email address'

  if (!form.password) errors.password = 'Required'
  else if (form.password.length < 8) errors.password = 'Must be at least 8 characters'

  if (!form.confirmPassword) errors.confirmPassword = 'Required'
  else if (form.confirmPassword !== form.password) errors.confirmPassword = 'Passwords do not match'

  if (!form.agreed) errors.agreed = 'You must agree to continue'

  return errors
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-red-600">{message}</p>
}

export default function CreateAccount({ onCreated, onSignIn }: CreateAccountProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const nextErrors = validate(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length === 0) onCreated()
  }

  return (
    <section className="flex justify-center bg-gray-50 px-6 py-14">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-10">
        <h1 className="mb-2 text-3xl font-bold">Create Your Account</h1>
        <p className="mb-8 text-sm text-gray-500">Join thousands of couples preserving their day.</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="brideName" className="mb-2 block text-sm">
                First Name (Bride)
              </label>
              <input
                id="brideName"
                type="text"
                value={form.brideName}
                onChange={(e) => updateField('brideName', e.target.value)}
                placeholder="Sarah"
                className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
              <FieldError message={errors.brideName} />
            </div>
            <div>
              <label htmlFor="groomName" className="mb-2 block text-sm">
                First Name (Groom)
              </label>
              <input
                id="groomName"
                type="text"
                value={form.groomName}
                onChange={(e) => updateField('groomName', e.target.value)}
                placeholder="James"
                className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
              <FieldError message={errors.groomName} />
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="email" className="mb-2 block text-sm">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="hello@example.com"
              className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
            />
            <FieldError message={errors.email} />
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="mb-2 block text-sm">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => updateField('password', e.target.value)}
              placeholder="········"
              className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
            />
            <FieldError message={errors.password} />
          </div>

          <div className="mb-6">
            <label htmlFor="confirmPassword" className="mb-2 block text-sm">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => updateField('confirmPassword', e.target.value)}
              placeholder="········"
              className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
            />
            <FieldError message={errors.confirmPassword} />
          </div>

          <div className="mb-6">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.agreed}
                onChange={(e) => updateField('agreed', e.target.checked)}
                className="mt-0.5"
              />
              <span>I agree to the terms and privacy policy.</span>
            </label>
            <FieldError message={errors.agreed} />
          </div>

          <button type="submit" className="mb-4 w-full rounded-md bg-black py-3 text-sm font-bold text-white">
            Get Started
          </button>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <button type="button" onClick={onSignIn} className="font-bold text-black hover:underline">
              Sign in
            </button>
          </p>
        </form>
      </div>
    </section>
  )
}
