import React, { useState } from 'react';
import { IconCpu, IconSearch, IconSparkles } from './Icons';

export const GlossaryCard = ({ terms }) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!terms || terms.length === 0) return null;

  const filteredTerms = terms.filter(item => 
    item.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.simple_explanation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.everyday_analogy?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="card-academic">
      <div className="card-header">
        <div className="card-title-wrap">
          <div className="card-icon-bubble purple">
            <IconCpu size={20} />
          </div>
          <div>
            <h3 className="card-heading">Technical Terms & Everyday Analogies</h3>
            <p className="card-subheading">Jargon translated into memorable real-world concepts</p>
          </div>
        </div>

        {/* Search Input */}
        <div className="glossary-search-box">
          <IconSearch size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search terms or analogies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="glossary-search-input"
          />
        </div>
      </div>

      <div className="glossary-grid">
        {filteredTerms.map((item, idx) => (
          <div key={idx} className="glossary-card-item">
            <div className="glossary-top">
              <span className="term-badge">Technical Concept</span>
              <h4 className="glossary-term">{item.term}</h4>
            </div>

            {/* Everyday Analogy */}
            {item.everyday_analogy && (
              <div className="glossary-analogy-box">
                <div className="analogy-header">
                  <IconSparkles size={14} />
                  <span>Real-World Analogy</span>
                </div>
                <p className="analogy-text">{item.everyday_analogy}</p>
              </div>
            )}

            {/* Simple Definition */}
            <div className="glossary-def-block">
              <span className="def-label">In Simple Words:</span>
              <p className="def-text">{item.simple_explanation}</p>
            </div>

            {/* Scholarly Definition */}
            {item.academic_definition && (
              <div className="glossary-scholarly-block">
                <span className="scholarly-label">Scholarly Definition:</span>
                <p className="scholarly-text">{item.academic_definition}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
