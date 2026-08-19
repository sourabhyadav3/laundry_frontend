import React from 'react';
import LoginForm from '../../Components/LoginForm';
import './Login.css';
import loginHero from '../../assets/laundry_login_hero.png';

const Login = () => {
  // Generate random sizes and left coordinates for background laundry bubbles
  const bubbles = [
    { size: '20px', left: '10%', delay: '0s', duration: '14s' },
    { size: '40px', left: '25%', delay: '2s', duration: '18s' },
    { size: '15px', left: '40%', delay: '1s', duration: '12s' },
    { size: '30px', left: '55%', delay: '4s', duration: '16s' },
    { size: '25px', left: '70%', delay: '0s', duration: '15s' },
    { size: '50px', left: '85%', delay: '3s', duration: '20s' },
    { size: '18px', left: '95%', delay: '5s', duration: '13s' },
    { size: '35px', left: '15%', delay: '6s', duration: '17s' },
  ];

  return (
    <div className="login-page-wrapper">
      {/* Dynamic Animated Blobs in the background */}
      <div className="bg-glow-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      {/* Floating bubbles rising behind the login card */}
      <div className="bubbles-container">
        {bubbles.map((bubble, i) => (
          <div
            key={i}
            className="bubble"
            style={{
              width: bubble.size,
              height: bubble.size,
              left: bubble.left,
              animationDelay: bubble.delay,
              animationDuration: bubble.duration,
            }}
          ></div>
        ))}
      </div>

      {/* Main Centered Login Card Container */}
      <div className="login-card-container">
        <div className="login-split-card">
          
          {/* Left Side: Side Image Panel inside the card */}
          <div className="card-image-side">
            <div className="side-image-overlay"></div>
            <img src={loginHero} alt="Laundry Operations Hero" className="side-bg-image" />
            
            <div className="side-hero-content" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
              {/* Brand Header */}
              <div className="side-brand" style={{ flexDirection: 'column', gap: '1.25rem', display: 'flex', alignItems: 'center', margin: 'auto 0' }}>
                <div className="side-logo-box" style={{ width: '100px', height: '100px', padding: '12px', background: '#fff', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)' }}>
                  <img src="/logo.png" alt="Tuhama Logo" className="w-full h-full object-contain rounded-xl" />
                </div>
                <div className="side-brand-text" style={{ textAlign: 'center' }}>
                  <h2 className="side-brand-name" style={{ fontSize: '1.75rem', fontWeight: '800', color: '#fff', margin: 0, justifyContent: 'center', display: 'flex' }}>
                    Tuhama laundry co.
                  </h2>
                </div>
              </div>

              {/* Card Footer */}
              <div className="side-hero-footer" style={{ textAlign: 'center' }}>
                <p>&copy; {new Date().getFullYear()} Tuhama Operations Inc.</p>
              </div>
            </div>
          </div>

          {/* Right Side: Form Panel inside the card */}
          <div className="card-form-side">
            <div className="card-form-content">
              {/* Brand Header for Mobile View (Hidden when side image is visible) */}
              <div className="mobile-card-brand">
                <div className="logo-wrapper" style={{ width: '80px', height: '80px', padding: '10px', background: '#fff', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px -4px rgba(0, 0, 0, 0.2)', margin: '0 auto' }}>
                  <img src="/logo.png" alt="Tuhama Logo" className="w-full h-full object-contain rounded-xl" />
                </div>
                <h2 className="brand-title" style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fff', margin: '0.75rem 0 0 0', textAlign: 'center' }}>Tuhama laundry co.</h2>
              </div>

              {/* Login Title */}
              <div className="form-header-title">
                <h2 className="form-title">Welcome Back</h2>
                <p className="form-subtitle">Please login to your account</p>
              </div>

              {/* Login Form Component */}
              <LoginForm />

              {/* Mobile-only footer */}
              <footer className="mobile-form-footer">
                <p>&copy; {new Date().getFullYear()} Tuhama Operations Inc.</p>
                <p>v2.4.0 • Authorized Personnel Only</p>
              </footer>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;
