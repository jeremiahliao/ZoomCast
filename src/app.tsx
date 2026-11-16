import { createRoot } from 'react-dom/client';
import { HashRouter, Route, Routes } from "react-router-dom";
import { Home } from './pages/home';
import { SignIn } from './pages/signin';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Settings } from './pages/settings';


function App() {
    return (
       <HashRouter>
            <AuthProvider>
                <Routes>
                    <Route path="/signin" element={<SignIn />} />
                    <Route path="/" element={
                        <ProtectedRoute>
                            <Home />
                        </ProtectedRoute>
                    } />
                    <Route path="/settings" element={
                        <ProtectedRoute>
                            <Settings />
                        </ProtectedRoute>
                    } />
                </Routes>
            </AuthProvider>
       </HashRouter>
    )
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
