import React, { useState } from 'react';
import { IconShieldCheck, IconCheckCircle, IconAlertTriangle, IconSparkles, IconFilter, IconCopy, IconCheck } from './Icons';

export const EvidenceInspector = ({ analysis }) => {
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'VERIFIED' | 'UNVERIFIED'
  const [copiedIdx, setCopiedIdx] = useState(null);

  if (!analysis) return null;

  // Aggregate all evidence claims from problem, methodology, findings, limitations
  const allClaims = [];

  // Problem claims
  if (analysis.research_problem?.evidence) {
    analysis.research_problem.evidence.forEach((ev) => {
      allClaims.push({
        section: 'Research Problem',
        claim: ev.claim,
        quote: ev.quote,
        page: ev.page,
        is_verified: ev.is_verified,
        match_score: ev.match_score,
        note: ev.verification_note
      });
    });
  }

  // Methodology claims
  if (analysis.methodology?.evidence) {
    analysis.methodology.evidence.forEach((ev) => {
      allClaims.push({
        section: 'Methodology',
        claim: ev.claim,
        quote: ev.quote,
        page: ev.page,
        is_verified: ev.is_verified,
        match_score: ev.match_score,
        note: ev.verification_note
      });
    });
  }

  // Findings claims
  if (analysis.key_findings) {
    analysis.key_findings.forEach((f) => {
      if (f.evidence) {
        allClaims.push({
          section: 'Key Findings',
          claim: f.title + ': ' + (f.evidence.claim || f.result_metric),
          quote: f.evidence.quote,
          page: f.evidence.page,
          is_verified: f.evidence.is_verified,
          match_score: f.evidence.match_score,
          note: f.evidence.verification_note
        });
      }
    });
  }

  // Limitations claims
  if (analysis.limitations) {
    analysis.limitations.forEach((l) => {
      if (l.evidence) {
        allClaims.push({
          section: 'Limitations',
          claim: l.title + ': ' + (l.evidence.claim || l.description),
          quote: l.evidence.quote,
          page: l.evidence.page,
          is_verified: l.evidence.is_verified,
          match_score: l.evidence.match_score,
          note: l.evidence.verification_note
        });
      }
    });
  }

  const filteredClaims = allClaims.filter((c) => {
    if (filter === 'VERIFIED') return c.is_verified;
    if (filter === 'UNVERIFIED') return !c.is_verified;
    return true;
  });

  const handleCopyQuote = (quote, idx) => {
    navigator.clipboard.writeText(quote);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="card-academic">
      <div className="card-header">
        <div className="card-title-wrap">
          <div className="card-icon-bubble emerald">
            <IconShieldCheck size={20} />
          </div>
          <div>
            <h3 className="card-heading">Evidence Verification Inspector</h3>
            <p className="card-subheading">
              Algorithmic verification of AI citations against original paper text
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="inspector-filter-group">
          <button
            type="button"
            className={`filter-btn ${filter === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilter('ALL')}
          >
            All Citations ({allClaims.length})
          </button>
          <button
            type="button"
            className={`filter-btn ${filter === 'VERIFIED' ? 'active' : ''}`}
            onClick={() => setFilter('VERIFIED')}
          >
            Verified Direct Evidence ({allClaims.filter(c => c.is_verified).length})
          </button>
          <button
            type="button"
            className={`filter-btn ${filter === 'UNVERIFIED' ? 'active' : ''}`}
            onClick={() => setFilter('UNVERIFIED')}
          >
            AI Interpretations ({allClaims.filter(c => !c.is_verified).length})
          </button>
        </div>
      </div>

      {/* Audit Table */}
      <div className="audit-table-wrap">
        <table className="audit-table">
          <thead>
            <tr>
              <th style={{ width: '15%' }}>Section</th>
              <th style={{ width: '25%' }}>Claim / Assertion</th>
              <th style={{ width: '35%' }}>Cited Source Text</th>
              <th style={{ width: '10%' }}>Page Citation</th>
              <th style={{ width: '15%' }}>Verification Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredClaims.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-audit-state">
                  No citations match the selected filter.
                </td>
              </tr>
            ) : (
              filteredClaims.map((claim, idx) => (
                <tr key={idx} className={claim.is_verified ? 'row-verified' : 'row-unverified'}>
                  <td>
                    <span className="audit-section-badge">{claim.section}</span>
                  </td>
                  <td>
                    <div className="audit-claim-desc">{claim.claim}</div>
                  </td>
                  <td>
                    {claim.quote ? (
                      <div className="audit-quote-box">
                        <span className="audit-quote-text">“{claim.quote}”</span>
                        <button
                          type="button"
                          className="btn-copy-inline-quote"
                          onClick={() => handleCopyQuote(claim.quote, idx)}
                          title="Copy Quote"
                        >
                          {copiedIdx === idx ? <IconCheck size={13} /> : <IconCopy size={13} />}
                        </button>
                      </div>
                    ) : (
                      <span className="no-quote-tag">No verbatim quote cited</span>
                    )}
                  </td>
                  <td>
                    {claim.page ? (
                      <span className="audit-page-tag">Page {claim.page}</span>
                    ) : (
                      <span className="audit-page-na">N/A</span>
                    )}
                  </td>
                  <td>
                    <div className="audit-status-cell">
                      <span className={claim.is_verified ? 'badge-direct-evidence' : 'badge-ai-interpretation'}>
                        {claim.is_verified ? '● Verified Direct' : '● AI Interpretation'}
                      </span>
                      <span className="audit-note-micro">{claim.note}</span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
