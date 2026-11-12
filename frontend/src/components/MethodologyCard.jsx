import React from 'react';
import { IconLayers, IconCpu, IconShieldCheck, IconSparkles } from './Icons';

export const MethodologyCard = ({ methodology }) => {
  if (!methodology) return null;

  return (
    <div className="card-academic">
      <div className="card-header">
        <div className="card-title-wrap">
          <div className="card-icon-bubble indigo">
            <IconLayers size={20} />
          </div>
          <div>
            <h3 className="card-heading">Methodology & Technical Approach</h3>
            <p className="card-subheading">Architecture, technical innovations, and experimental setup</p>
          </div>
        </div>
      </div>

      {/* Approach Overview */}
      <div className="methodology-overview-box">
        <div className="approach-header">
          <span className="approach-badge">Approach</span>
          <h4 className="approach-name">{methodology.approach_name || 'Proposed Pipeline'}</h4>
        </div>
        <p className="approach-overview-text">{methodology.overview}</p>
      </div>

      {/* Step by Step Breakdown */}
      {methodology.steps && methodology.steps.length > 0 && (
        <div className="steps-container">
          <h4 className="steps-heading">Step-by-Step Architecture Pipeline</h4>
          <div className="steps-grid">
            {methodology.steps.map((step, idx) => (
              <div key={idx} className="step-card">
                <div className="step-number-bubble">{step.step_number || idx + 1}</div>
                <div className="step-content">
                  <h5 className="step-name">{step.name}</h5>
                  <p className="step-explanation">{step.explanation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Datasets & Benchmarks */}
      {methodology.datasets_and_benchmarks && methodology.datasets_and_benchmarks.length > 0 && (
        <div className="benchmarks-box">
          <div className="benchmarks-title">
            <IconCpu size={16} />
            <span>Datasets, Baselines & Benchmarks</span>
          </div>
          <div className="benchmarks-tags-row">
            {methodology.datasets_and_benchmarks.map((bench, idx) => (
              <span key={idx} className="benchmark-tag">
                {bench}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Methodology Citations */}
      {methodology.evidence && methodology.evidence.length > 0 && (
        <div className="evidence-section-box">
          <h4 className="evidence-section-title">
            <IconShieldCheck size={16} />
            <span>Methodology Citations & Verified Quotes</span>
          </h4>
          <div className="evidence-list">
            {methodology.evidence.map((ev, idx) => (
              <div key={idx} className={`evidence-item-card ${ev.is_verified ? 'verified' : 'unverified'}`}>
                <div className="evidence-badge-row">
                  <span className={ev.is_verified ? 'badge-direct-evidence' : 'badge-ai-interpretation'}>
                    {ev.is_verified ? '● Direct Paper Evidence' : '● AI Interpretation'}
                  </span>
                  {ev.page && <span className="citation-page-pill">Page {ev.page}</span>}
                  <span className="verification-status-note">{ev.verification_note}</span>
                </div>
                <div className="evidence-claim-text">
                  <strong>Claim:</strong> {ev.claim}
                </div>
                {ev.quote && (
                  <blockquote className="evidence-quote-snippet">
                    “{ev.quote}”
                  </blockquote>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
