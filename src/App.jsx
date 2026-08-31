import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import ContactForm from './components/ContactForm';
import FeedbackForm from './components/FeedbackForm';

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <header>
          <h1>Playwright Demo App</h1>
          <nav>
            <NavLink to="/">Login</NavLink>
            <NavLink to="/contact">Contact</NavLink>
            <NavLink to="/feedback">Feedback</NavLink>
          </nav>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<LoginForm />} />
            <Route path="/contact" element={<ContactForm />} />
            <Route path="/feedback" element={<FeedbackForm />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
