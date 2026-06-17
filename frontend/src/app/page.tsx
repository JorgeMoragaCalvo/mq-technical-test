"use client"

import Link from "next/link"
import styled from "styled-components"

const Wrapper = styled.main`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
`

const Card = styled.section`
  width: min(640px, 100%);
  background: #ffffff;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
`

const Title = styled.h1`
  margin: 0 0 0.75rem;
  font-size: 1.75rem;
`

const Text = styled.p`
  margin: 0 0 1rem;
  line-height: 1.5;
  color: #3b4452;
`

const TasksLink = styled(Link)`
  display: inline-flex;
  background: #2563eb;
  color: #ffffff;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-weight: 600;
`

export default function HomePage(): JSX.Element {
  return (
    <Wrapper>
      <Card>
        <Title>Prueba Tecnica Junior Fullstack</Title>
        <Text>
          Este starter incluye setup minimo para backend y frontend. Tu trabajo inicia en la
          pantalla de tareas.
        </Text>
        <TasksLink href="/tasks">Ir a /tasks</TasksLink>
      </Card>
    </Wrapper>
  )
}
