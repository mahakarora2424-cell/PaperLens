import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { UploadSection } from './components/UploadSection';
import { StatsBanner } from './components/StatsBanner';
import { SummaryCard } from './components/SummaryCard';
import { ProblemCard } from './components/ProblemCard';
import { MethodologyCard } from './components/MethodologyCard';
import { FindingsCard } from './components/FindingsCard';
import { LimitationsCard } from './components/LimitationsCard';
import { GlossaryCard } from './components/GlossaryCard';
import { EvidenceInspector } from './components/EvidenceInspector';
import { 
  IconSparkles, 
  IconDownload, 
  IconRefreshCw, 
  IconCheckCircle, 
  IconLayers, 
  IconBookOpen, 
  IconShieldCheck, 
  IconCpu 
} from './components/Icons';

export function App() {
  const [backendHealth, setBackendHealth] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [activeViewTab, setActiveViewTab] = useState('ALL'); // 'ALL' | 'SUMMARY' | 'PROBLEM' | 'FINDINGS' | 'GLOSSARY' | 'INSPECTOR'

  // Fetch backend status on mount
  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setBackendHealth(data);
      } else {
        setBackendHealth({ status: 'offline' });
      }
    } catch (err) {
      console.warn('Backend currently unreachable at /api/health:', err);
      setBackendHealth({ status: 'offline' });
    }
  };

  const handleAnalyzePdf = async (file) => {
    setError(null);
    setIsAnalyzing(true);
    setAnalysisStep('Reading PDF & extracting text layers with PyMuPDF...');

    const stepTimer1 = setTimeout(() => {
      setAnalysisStep('Simplifying academic concepts & structuring findings...');
    }, 1200);

    const stepTimer2 = setTimeout(() => {
      setAnalysisStep('Verifying citations against document text & calculating match scores...');
    }, 2800);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/analyze-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(errData.detail || 'Failed to analyze PDF.');
      }

      const data = await res.json();
      setAnalysis(data);
      setActiveViewTab('ALL');
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err.message || 'An error occurred while processing the PDF.');
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setIsAnalyzing(false);
      setAnalysisStep('');
    }
  };

  const handleAnalyzeText = async (text, title) => {
    setError(null);
    setIsAnalyzing(true);
    setAnalysisStep('Tokenizing input abstract & extracting sections...');

    const stepTimer = setTimeout(() => {
      setAnalysisStep('Simplifying language & validating claims against source text...');
    }, 1500);

    try {
      const res = await fetch('/api/analyze-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, title }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(errData.detail || 'Failed to analyze text.');
      }

      const data = await res.json();
      setAnalysis(data);
      setActiveViewTab('ALL');
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err.message || 'An error occurred while analyzing the text.');
    } finally {
      clearTimeout(stepTimer);
      setIsAnalyzing(false);
      setAnalysisStep('');
    }
  };

  const handleLoadSample = async () => {
    setError(null);
    setIsAnalyzing(true);
    setAnalysisStep('Loading Attention Is All You Need sample...');

    try {
      const sampleRes = await fetch('/api/sample');
      if (!sampleRes.ok) throw new Error('Could not fetch sample paper.');
      const sample = await sampleRes.json();
      await handleAnalyzeText(sample.text, sample.title);
    } catch (err) {
      setError(err.message || 'Failed to load sample paper.');
      setIsAnalyzing(false);
    }
  };

  // Export Simplification Report as Markdown
  const handleExportMarkdown = () => {
    if (!analysis) return;
    
    let md = `# PaperLens Academic Simplification Report\n\n`;
    md += `**Title:** ${analysis.paper_title || 'Untitled'}\n`;
    md += `**Authors / Source:** ${analysis.authors_and_venue || 'N/A'}\n\n`;
    md += `## One-Sentence Takeaway\n> ${analysis.one_sentence_takeaway}\n\n`;
    md += `## Executive Summary\n${analysis.summary?.plain_english}\n\n`;
    md += `### Real-World Impact\n${analysis.summary?.real_world_impact}\n\n`;
    md += `## Research Problem\n**Core Bottleneck:** ${analysis.research_problem?.core_problem}\n`;
    md += `**Why It Matters:** ${analysis.research_problem?.motivation}\n\n`;
    md += `## Methodology\n**Approach:** ${analysis.methodology?.approach_name}\n`;
    md += `${analysis.methodology?.overview}\n\n`;
    
    if (analysis.key_findings) {
      md += `## Key Findings\n`;
      analysis.key_findings.forEach(f => {
        md += `- **${f.title}** (${f.result_metric || 'Observed'}): ${f.ai_interpretation}\n`;
      });
      md += `\n`;
    }
    
    if (analysis.limitations) {
      md += `## Limitations & Future Work\n`;
      analysis.limitations.forEach(l => {
        md += `- **${l.title}:** ${l.description}\n`;
      });
      md += `\n`;
    }
    
    md += `## Verification Audit\n`;
    md += `- Total Claims: ${analysis.verification_audit?.total_claims_evaluated || 0}\n`;
    md += `- Direct Verified Quotes: ${analysis.verification_audit?.verified_direct_quotes || 0}\n`;
    md += `- AI Interpretations: ${analysis.verification_audit?.ai_interpretations || 0}\n`;
    md += `- Direct Evidence Rate: ${analysis.verification_audit?.direct_evidence_rate_pct || 0}%\n`;

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(analysis.paper_title || 'PaperLens_Report').replace(/[^a-zA-Z0-9]/g, '_')}_Simplified.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-shell">
      {/* Top Navbar */}
      <Navbar 
        backendHealth={backendHealth} 
        onLoadSample={handleLoadSample} 
        isAnalyzing={isAnalyzing} 
      />

      <main className="main-content">
        {/* Hero & Intro */}
        <section className="hero-banner">
          <div className="hero-pill">
            <IconShieldCheck size={14} className="hero-pill-icon" />
            <span>Verifiable Academic Intelligence</span>
          </div>
          <h1 className="hero-title">
            Research Papers, <span className="text-gradient">Demystified.</span>
          </h1>
          <p className="hero-subtitle">
            Extract plain-English summaries, core methodology, key findings, and technical terms.
            Every claim is cross-checked and verified against verbatim document pages.
          </p>
        </section>

        {/* Upload & Input Section */}
        <UploadSection 
          onAnalyzePdf={handleAnalyzePdf} 
          onAnalyzeText={handleAnalyzeText} 
          isAnalyzing={isAnalyzing} 
          error={error} 
          clearError={() => setError(null)} 
        />

        {/* Progress Bar when analyzing */}
        {isAnalyzing && (
          <div className="analyzing-progress-card">
            <div className="progress-spinner-row">
              <IconRefreshCw size={24} className="spinner-icon" />
              <div className="progress-text-wrap">
                <h4 className="progress-heading">Deconstructing Research Paper</h4>
                <p className="progress-step-desc">{analysisStep || 'Processing document...'}</p>
              </div>
            </div>
            <div className="progress-track">
              <div className="progress-fill indeterminate"></div>
            </div>
          </div>
        )}

        {/* Analysis Dashboard Results */}
        {analysis && !isAnalyzing && (
          <div className="results-wrapper">
            {/* Header Banner & Stats */}
            <StatsBanner analysis={analysis} />

            {/* Dashboard Navigation Tabs & Export Toolbar */}
            <div className="results-toolbar">
              <div className="view-tabs">
                <button 
                  type="button" 
                  className={`view-tab-btn ${activeViewTab === 'ALL' ? 'active' : ''}`}
                  onClick={() => setActiveViewTab('ALL')}
                >
                  <IconLayers size={16} />
                  <span>Full Dashboard</span>
                </button>
                <button 
                  type="button" 
                  className={`view-tab-btn ${activeViewTab === 'SUMMARY' ? 'active' : ''}`}
                  onClick={() => setActiveViewTab('SUMMARY')}
                >
                  <IconSparkles size={16} />
                  <span>Executive Summary</span>
                </button>
                <button 
                  type="button" 
                  className={`view-tab-btn ${activeViewTab === 'PROBLEM' ? 'active' : ''}`}
                  onClick={() => setActiveViewTab('PROBLEM')}
                >
                  <IconBookOpen size={16} />
                  <span>Problem & Method</span>
                </button>
                <button 
                  type="button" 
                  className={`view-tab-btn ${activeViewTab === 'FINDINGS' ? 'active' : ''}`}
                  onClick={() => setActiveViewTab('FINDINGS')}
                >
                  <IconCheckCircle size={16} />
                  <span>Key Findings</span>
                </button>
                <button 
                  type="button" 
                  className={`view-tab-btn ${activeViewTab === 'GLOSSARY' ? 'active' : ''}`}
                  onClick={() => setActiveViewTab('GLOSSARY')}
                >
                  <IconCpu size={16} />
                  <span>Glossary & Limitations</span>
                </button>
                <button 
                  type="button" 
                  className={`view-tab-btn ${activeViewTab === 'INSPECTOR' ? 'active' : ''}`}
                  onClick={() => setActiveViewTab('INSPECTOR')}
                >
                  <IconShieldCheck size={16} />
                  <span>Evidence Inspector</span>
                </button>
              </div>

              {/* Export Button */}
              <button 
                type="button" 
                className="btn-export"
                onClick={handleExportMarkdown}
                title="Download complete report as Markdown"
              >
                <IconDownload size={16} />
                <span>Export Report (.md)</span>
              </button>
            </div>

            {/* Content Cards */}
            <div className="cards-stack">
              {(activeViewTab === 'ALL' || activeViewTab === 'SUMMARY') && (
                <SummaryCard 
                  summary={analysis.summary} 
                  takeaway={analysis.one_sentence_takeaway} 
                />
              )}

              {(activeViewTab === 'ALL' || activeViewTab === 'PROBLEM') && (
                <>
                  <ProblemCard problem={analysis.research_problem} />
                  <MethodologyCard methodology={analysis.methodology} />
                </>
              )}

              {(activeViewTab === 'ALL' || activeViewTab === 'FINDINGS') && (
                <FindingsCard findings={analysis.key_findings} />
              )}

              {(activeViewTab === 'ALL' || activeViewTab === 'GLOSSARY') && (
                <>
                  <GlossaryCard terms={analysis.technical_terms} />
                  <LimitationsCard limitations={analysis.limitations} />
                </>
              )}

              {(activeViewTab === 'ALL' || activeViewTab === 'INSPECTOR') && (
                <EvidenceInspector analysis={analysis} />
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="footer-wrap">
        <div className="footer-inner">
          <div className="footer-brand">
            <strong>PaperLens</strong> – Full-Stack Research Paper Simplifier & Citation Inspector
          </div>
          <div className="footer-meta">
            FastAPI • PyMuPDF • React + Vite • OpenAI GPT
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
