import React from 'react';
import { IconCheckCircle, IconShieldCheck, IconSparkles, IconZap } from './Icons';

export const FindingsCard = ({ findings }) => {
  if (!findings || findings.length === 0) return null;

  return (
    <div className="card-academic">
      <div className="card-header">
        <div className="card-title-wrap">
          <div className="card-icon-bubble emerald">
            <IconCheckCircle size={20} />
          </div>
          <div>
            <h3 className="card-heading">Key Findings & Empirical Results</h3>
            <p className="card-subheading">Core discoveries, quantitative benchmarks, and plain-language interpretations</p>
          </div>
        </div>
      </div>

      <div className="findings-grid">
        {findings.map((item, idx) => {
          const ev = item.evidence || {};
          return (
            <div key={idx} className="finding-entry-card">
              <div className="finding-top-bar">
                <h4 className="finding-title">{item.title}</h4>
                {item.result_metric && (
                  <span className="finding-metric-pill">
                    <IconZap size={14} />
                    <span>{item.result_metric}</span>
                  </span>
                )}
              </div>

              {/* AI Interpretation */}
              <div className="finding-interpretation-box">
                <span className="interpretation-label">
                  <IconSparkles size={14} />
                  <span>AI Interpretation:</span>
                </span>
                <p className="interpretation-body">{item.ai_interpretation}</p>
              </div>

              {/* Direct Evidence / Quote */}
              {ev.quote && (
                <div className={`finding-evidence-strip ${ev.is_verified ? 'verified' : 'unverified'}`}>
                  <div className="strip-header">
                    <span className={ev.is_verified ? 'badge-direct-evidence' : 'badge-ai-interpretation'}>
                      {ev.is_verified ? '● Direct Evidence' : '● AI Synthesized Claim'}
                    </span>
                    {ev.page && <span className="citation-page-pill">Page {ev.page}</span>}
                    <span className="strip-note">{ev.verification_note}</span>
                  </div>
                  <blockquote className="strip-quote">
                    “{ev.quote}”
                  </blockquote>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
