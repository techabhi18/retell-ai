import React from 'react'
import { Routes, Route, BrowserRouter as Router } from 'react-router-dom'

import Home from './pages/Home'
import CallList from './pages/CallList'
import Header from './components/Header'

const App = () => {
  return (
    <Router>
      <Header />
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/call-list' element={<CallList />} />
      </Routes>
    </Router>
  )
}

export default App
