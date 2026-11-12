import React from 'react';
import { IconAlertTriangle, IconShieldCheck, IconFileText, IconSparkles } from './Icons';

export const ProblemCard = ({ problem }) => {
  if (!problem) return null;

  return (
    <div className="card-academic">
      <div className="card-header">
        <div className="card-title-wrap">
          <div className="card-icon-bubble blue">
            <IconAlertTriangle size={20} />
          </div>
          <div>
            <h3 className="card-heading">The Research Problem & Motivation</h3>
            <p className="card-subheading">What core bottleneck this paper tackles and why existing methods failed</p>
          </div>
        </div>
      </div>

      <div className="problem-grid">
        {/* Core Bottleneck */}
        <div className="problem-block core">
          <span className="block-tag">Core Bottleneck</span>
          <p className="block-body">{problem.core_problem}</p>
        </div>

        {/* Why It Matters */}
        <div className="problem-block motivation">
          <span className="block-tag">Why Solving This Matters</span>
          <p className="block-body">{problem.motivation}</p>
        </div>

        {/* Prior Work Flaws */}
        <div className="problem-block flaws">
          <span className="block-tag">Flaws in Prior Approaches</span>
          <p className="block-body">{problem.prior_work_flaws}</p>
        </div>
      </div>

      {/* Supporting Evidence Quotes */}
      {problem.evidence && problem.evidence.length > 0 && (
        <div className="evidence-section-box">
          <h4 className="evidence-section-title">
            <IconShieldCheck size={16} />
            <span>Problem Formulation Citations</span>
          </h4>
          <div className="evidence-list">
            {problem.evidence.map((ev, idx) => (
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
