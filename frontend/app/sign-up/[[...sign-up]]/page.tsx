"use client"
import { SignUp } from '@clerk/nextjs'

export default function Page() {
  return (
    <div className="container py-10 flex justify-center">
      <SignUp routing="path" signInUrl="/sign-in" />
    </div>
  )
}
