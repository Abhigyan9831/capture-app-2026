"use client"

import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      style={
        {
          "--normal-bg": "#111118",
          "--normal-text": "#e4e4e7",
          "--normal-border": "rgba(255,255,255,0.08)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
