import React, { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

function Cube() {
  const meshRef = useRef<THREE.Mesh>(null!)

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.005
      meshRef.current.rotation.y += 0.005
    }
  })

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={'#4f8cff'} metalness={0.2} roughness={0.3} />
    </mesh>
  )
}

export function SpinningCube() {
  return (
    <Canvas gl={{ alpha: true }}>
      <ambientLight intensity={0.3} />
      <directionalLight color="white" position={[2, 2, 4]} intensity={1.2} />
      <Cube />
      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={5} />
    </Canvas>
  )
}

