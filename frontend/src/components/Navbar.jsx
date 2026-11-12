import React from 'react';
import { IconBookOpen, IconSparkles, IconShieldCheck, IconZap } from './Icons';

export const Navbar = ({ backendHealth, onLoadSample, isAnalyzing }) => {
  const isConnected = backendHealth?.status === 'healthy';
  const hasOpenAI = backendHealth?.openai_configured;

  return (
    <header className="navbar-container">
      <div className="navbar-inner">
        {/* Brand */}
        <div className="navbar-brand">
          <div className="brand-logo-glow">
            <IconBookOpen size={22} className="brand-icon" />
          </div>
          <div>
            <div className="brand-title-wrap">
              <span className="brand-title">PaperLens</span>
              <span className="brand-badge">Academic 2.0</span>
            </div>
            <p className="brand-subtitle">AI Research Simplifier & Evidence Verifier</p>
          </div>
        </div>

        {/* Status Indicators & Actions */}
        <div className="navbar-actions">
          {/* Engine Status */}
          <div className={`status-pill ${hasOpenAI ? 'status-openai' : 'status-demo'}`}>
            <span className="status-dot"></span>
            <span className="status-text">
              {hasOpenAI ? `OpenAI (${backendHealth?.model || 'gpt-4o-mini'})` : 'Active Engine: Verified Demo'}
            </span>
          </div>

          {/* Backend Connection Indicator */}
          <div className="backend-indicator" title={isConnected ? "FastAPI backend reachable" : "Backend connecting..."}>
            <span className={`connection-bullet ${isConnected ? 'connected' : 'disconnected'}`}></span>
            <span className="connection-label">{isConnected ? 'API Live' : 'Connecting'}</span>
          </div>

          {/* Quick Sample Button */}
          <button 
            type="button" 
            className="btn-sample-nav"
            onClick={onLoadSample}
            disabled={isAnalyzing}
          >
            <IconZap size={15} />
            <span>Load Sample Paper</span>
          </button>
        </div>
      </div>
    </header>
  );
};
