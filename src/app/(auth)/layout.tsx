import { ReactNode } from 'react'

export default function AuthLayoutWrapper({
  children,
}: {
  children: ReactNode
}) {
  return <>{children}</>
}
