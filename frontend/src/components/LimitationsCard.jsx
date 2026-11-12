import React from 'react';
import { IconAlertTriangle, IconShieldCheck, IconArrowRight } from './Icons';

export const LimitationsCard = ({ limitations }) => {
  if (!limitations || limitations.length === 0) return null;

  return (
    <div className="card-academic">
      <div className="card-header">
        <div className="card-title-wrap">
          <div className="card-icon-bubble amber">
            <IconAlertTriangle size={20} />
          </div>
          <div>
            <h3 className="card-heading">Limitations & Open Questions</h3>
            <p className="card-subheading">Author-acknowledged constraints, edge cases, and future directions</p>
          </div>
        </div>
      </div>

      <div className="limitations-grid">
        {limitations.map((item, idx) => {
          const ev = item.evidence || {};
          return (
            <div key={idx} className="limitation-entry-card">
              <div className="limitation-head">
                <span className="limitation-number">0{idx + 1}</span>
                <h4 className="limitation-title">{item.title}</h4>
              </div>

              <p className="limitation-desc">{item.description}</p>

              {item.future_direction && (
                <div className="future-direction-callout">
                  <span className="future-label">Future Work:</span>
                  <p className="future-text">{item.future_direction}</p>
                </div>
              )}

              {ev.quote && (
                <div className={`limitation-evidence ${ev.is_verified ? 'verified' : 'unverified'}`}>
                  <div className="limitation-badge-row">
                    <span className={ev.is_verified ? 'badge-direct-evidence' : 'badge-ai-interpretation'}>
                      {ev.is_verified ? '● Direct Evidence' : '● AI Interpretation'}
                    </span>
                    {ev.page && <span className="citation-page-pill">Page {ev.page}</span>}
                  </div>
                  <blockquote className="limitation-quote">“{ev.quote}”</blockquote>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
