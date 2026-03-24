import { Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
import Home from './pages/Home'
import UploadPage from './pages/UploadPage'
import AnnotatePage from './pages/AnnotatePage'
import DatasetsPage from './pages/DatasetsPage'
import TrainPage from './pages/TrainPage'
import OptimizePage from './pages/OptimizePage'
import EvaluatePage from './pages/EvaluatePage'

function App() {
  return (
    <ThemeProvider defaultTheme="dark" enableSystem>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/annotate/:versionId" element={<AnnotatePage />} />
        <Route path="/datasets" element={<DatasetsPage />} />
        <Route path="/train" element={<TrainPage />} />
        <Route path="/optimize" element={<OptimizePage />} />
        <Route path="/evaluate" element={<EvaluatePage />} />
      </Routes>
    </ThemeProvider>
  )
}

export default App
