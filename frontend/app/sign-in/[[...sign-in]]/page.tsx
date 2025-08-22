"use client"
import { SignIn } from '@clerk/nextjs'

export default function Page() {
  return (
    <div className="container py-10 flex justify-center">
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
    </div>
  )
}
