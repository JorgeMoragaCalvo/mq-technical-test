"use client"

import { useServerInsertedHTML } from "next/navigation"
import { ReactNode, useState } from "react"
import { ServerStyleSheet, StyleSheetManager } from "styled-components"

import { GlobalStyles } from "@/lib/global-styles"

type Props = {
  readonly children: ReactNode
}

export default function StyledComponentsRegistry({ children }: Props): ReactNode {
  const [styledComponentsStyleSheet] = useState(() => new ServerStyleSheet())

  useServerInsertedHTML(() => {
    const styles = styledComponentsStyleSheet.getStyleElement()
    styledComponentsStyleSheet.instance.clearTag()
    return <>{styles}</>
  })

  if (typeof window !== "undefined") {
    return (
      <>
        <GlobalStyles />
        {children}
      </>
    )
  }

  return (
    <StyleSheetManager sheet={styledComponentsStyleSheet.instance}>
      <GlobalStyles />
      {children}
    </StyleSheetManager>
  )
}
