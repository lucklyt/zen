import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import ZenPage from './zen.jsx'
import SceneList from "./scene_list.jsx";
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <Router>
            <Routes>
                <Route path="/zen" element={<ZenPage />} />
                <Route path="/" element={<SceneList />} />
            </Routes>
        </Router>
    </React.StrictMode>,
)