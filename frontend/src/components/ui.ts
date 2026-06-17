"use client"

import styled, { css } from "styled-components"

export const Card = styled.section`
  background: #ffffff;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
`

export const SectionTitle = styled.h2`
  margin: 0 0 1rem;
  font-size: 1.15rem;
`

export const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #3b4452;
`

export const Input = styled.input`
  padding: 0.55rem 0.7rem;
  border: 1px solid #d4d9e2;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 400;
`

export const Select = styled.select`
  padding: 0.55rem 0.7rem;
  border: 1px solid #d4d9e2;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 400;
  background: #ffffff;
`

export const Button = styled.button<{ $variant?: "primary" | "ghost" }>`
  border: none;
  border-radius: 8px;
  padding: 0.6rem 1rem;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: opacity 0.15s ease;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  ${({ $variant }) =>
    $variant === "ghost"
      ? css`
          background: #eef1f6;
          color: #1f2733;
        `
      : css`
          background: #2563eb;
          color: #ffffff;
        `}
`

export const Row = styled.div`
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: flex-end;
`

export const ErrorText = styled.p`
  margin: 0.5rem 0 0;
  color: #b91c1c;
  font-size: 0.85rem;
`

export const Muted = styled.span`
  color: #6b7280;
  font-size: 0.85rem;
`

export const Badge = styled.span<{ $status: string }>`
  display: inline-block;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  ${({ $status }) => {
    if ($status === "paid") {
      return css`
        background: #dcfce7;
        color: #166534;
      `
    }
    if ($status === "partially_paid") {
      return css`
        background: #fef9c3;
        color: #854d0e;
      `
    }
    return css`
      background: #fee2e2;
      color: #991b1b;
    `
  }}
`

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;

  th,
  td {
    text-align: left;
    padding: 0.5rem 0.6rem;
    border-bottom: 1px solid #eef1f6;
  }

  th {
    color: #6b7280;
    font-weight: 600;
  }
`