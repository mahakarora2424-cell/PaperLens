import React, { useState } from 'react';
import { IconSparkles, IconCopy, IconCheck, IconZap, IconInfo } from './Icons';

export const SummaryCard = ({ summary, takeaway }) => {
  const [copied, setCopied] = useState(false);

  if (!summary) return null;

  const handleCopy = () => {
    const textToCopy = `PaperLens Summary:\n${summary.plain_english}\n\nOne-Sentence Takeaway:\n${takeaway}\n\nReal-World Impact:\n${summary.real_world_impact}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card-academic">
      <div className="card-header">
        <div className="card-title-wrap">
          <div className="card-icon-bubble purple">
            <IconSparkles size={20} />
          </div>
          <div>
            <h3 className="card-heading">Executive Summary in Plain English</h3>
            <p className="card-subheading">Translated from academic jargon into intuitive concepts</p>
          </div>
        </div>
        <button 
          type="button" 
          className="btn-copy-card" 
          onClick={handleCopy}
          title="Copy Summary to Clipboard"
        >
          {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      {/* One-Sentence Takeaway Callout */}
      {takeaway && (
        <div className="takeaway-callout">
          <div className="takeaway-badge">
            <IconZap size={14} />
            <span>The Big Idea (1-Minute Takeaway)</span>
          </div>
          <p className="takeaway-quote">“{takeaway}”</p>
        </div>
      )}

      {/* Plain English Body */}
      <div className="summary-paragraphs">
        {summary.plain_english.split('\n\n').map((paragraph, index) => (
          <p key={index} className="summary-p">
            {paragraph}
          </p>
        ))}
      </div>

      {/* Real-World Impact & Target Audience */}
      <div className="summary-meta-grid">
        <div className="meta-subcard impact">
          <div className="meta-subcard-title">
            <IconZap size={16} className="meta-icon" />
            <span>Real-World Impact</span>
          </div>
          <p className="meta-subcard-text">{summary.real_world_impact || 'Enables practical technological advances across consumer applications and scientific research.'}</p>
        </div>

        <div className="meta-subcard audience">
          <div className="meta-subcard-title">
            <IconInfo size={16} className="meta-icon" />
            <span>Who Should Care</span>
          </div>
          <p className="meta-subcard-text">{summary.target_audience || 'Domain engineers, graduate students, and technical product builders.'}</p>
        </div>
      </div>
    </div>
  );
};
