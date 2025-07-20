import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import CodeForgeLexer from '../src/Pages/Lexer'
import CodeAnalyzerApp from './Pages/GUI'
import CodeForge from '../src/Pages/Lexer'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
    <CodeForge />
    </>
  )
}

export default App
