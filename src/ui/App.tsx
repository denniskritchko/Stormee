import React from 'react'
import { SpinningCube } from './SpinningCube'

export function App() {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        // Make the div draggable
        WebkitAppRegion: 'drag',
      }}
    >
      <SpinningCube />
    </div>
  )
}

