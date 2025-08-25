"use client"
import { SignIn } from '@clerk/nextjs'
import Login from '@/components/Login'

export default function Page() {
  return (
    <Login>
      <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" />
    </Login>
  )
}
