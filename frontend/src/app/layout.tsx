import type { Metadata } from "next"
import { ReactNode } from "react"

import StyledComponentsRegistry from "@/lib/styled-components-registry"

type Props = {
  readonly children: ReactNode
}

export const metadata: Metadata = {
  title: "Prueba Técnica Junior",
  description: "Starter frontend para prueba técnica junior fullstack",
}

export default function RootLayout({ children }: Props): ReactNode {
  return (
    <html lang="es">
      <body>
        <StyledComponentsRegistry>{children}</StyledComponentsRegistry>
      </body>
    </html>
  )
}
