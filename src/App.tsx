import { useRete } from 'rete-react-plugin';
import reactLogo from './assets/react.svg'
import reteLogo from './assets/rete.svg'
import viteLogo from '/vite.svg'
import { createEditor } from './rete';
import './common.css';
import './customization/background.css';
import './App.css'
import './rete.css';

function App() {
  const [ref] = useRete(createEditor)

  return (
    <>
      <h1>Rete + Vite + React</h1>
      <div ref={ref} className="rete"></div>
    </>
  )
}

export default App
