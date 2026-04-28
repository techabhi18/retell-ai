import { Routes, Route, HashRouter as Router } from 'react-router-dom'

import Home from './pages/Home'
import CallList from './pages/CallList'
import Header from './components/Header'
import Chat from './pages/Chat'
import FeedbackCall from './pages/FeedbackCall'

const App = () => {
  return (
    <Router>
      <Header />
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/feedback-call' element={<FeedbackCall />} />
        <Route path='/call-list' element={<CallList />} />
        {/* <Route path='/chat' element={<Chat />} /> */}
      </Routes>
    </Router>
  )
}

export default App
