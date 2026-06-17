"use client"

import { createGlobalStyle } from "styled-components"

export const GlobalStyles = createGlobalStyle`
  * {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    padding: 0;
    font-family: Inter, Arial, sans-serif;
    background: #f8f9fb;
    color: #151a23;
  }

  a {
    color: inherit;
    text-decoration: none;
  }
`
