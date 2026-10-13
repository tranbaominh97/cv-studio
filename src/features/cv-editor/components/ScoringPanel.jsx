import React, { useState } from 'react';
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Info } from 'lucide-react';

export default function ScoringPanel({ scoring }) {
  const [openSections, setOpenSections] = useState({
    important: true,
    recommended: true,
    niceToHave: false
  });

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const { score, important, recommended, niceToHave } = scoring;

  // Determine score color class
  const getScoreColor = (val) => {
    if (val >= 80) return 'text-emerald-400';
    if (val >= 60) return 'text-orange-400';
    return 'text-rose-400';
  };

  // Determine stroke dashoffset for radial SVG progress
  const strokeDashoffset = 251.2 - (251.2 * score) / 100;

  return (
    <div className="scoring-panel">
      {/* ATS SCORE CIRCLE */}
      <div className="score-container">
        <h3 className="panel-subtitle">Resume Score</h3>
        <div className="score-gauge-box">
          <svg className="score-gauge-svg" viewBox="0 0 100 100">
            <circle
              className="gauge-bg"
              cx="50"
              cy="50"
              r="40"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="8"
              fill="transparent"
            />
            <circle
              className="gauge-progress"
              cx="50"
              cy="50"
              r="40"
              stroke={score >= 80 ? '#10b981' : score >= 60 ? '#fb923c' : '#f43f5e'}
              strokeWidth="8"
              fill="transparent"
              strokeDasharray="251.2"
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
          </svg>
          <div className="score-number-overlay">
            <span className="score-val">{score}</span>
            <span className="score-total">/100</span>
          </div>
        </div>
        <p className="score-caption">Benchmarked against millions of resumes</p>
      </div>

      {/* ISSUES & CHECKLIST */}
      <div className="checklist-container">
        
        {/* IMPORTANT SECTION */}
        <div className="checklist-group">
          <button 
            className="group-header" 
            onClick={() => toggleSection('important')}
          >
            <div className="group-title">
              <span className={`badge important-badge`}>Important</span>
              <span className="group-count">{important.length} items to fix</span>
            </div>
            {openSections.important ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {openSections.important && (
            <div className="group-content">
              {important.length === 0 ? (
                <div className="empty-checklist">
                  <CheckCircle2 size={16} className="success-icon" />
                  <span>No critical issues found!</span>
                </div>
              ) : (
                important.map((issue) => (
                  <div key={issue.id} className="issue-card important-card">
                    <div className="issue-header">
                      <AlertCircle size={14} className="error-icon" />
                      <span className="issue-title">{issue.title}</span>
                      <span className="issue-pts">+{issue.points}pts</span>
                    </div>
                    <p className="issue-msg">{issue.message}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* RECOMMENDED SECTION */}
        <div className="checklist-group">
          <button 
            className="group-header" 
            onClick={() => toggleSection('recommended')}
          >
            <div className="group-title">
              <span className="badge recommended-badge">Recommended</span>
              <span className="group-count">{recommended.length} suggestions</span>
            </div>
            {openSections.recommended ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {openSections.recommended && (
            <div className="group-content">
              {recommended.length === 0 ? (
                <div className="empty-checklist">
                  <CheckCircle2 size={16} className="success-icon" />
                  <span>All recommendations met!</span>
                </div>
              ) : (
                recommended.map((issue) => (
                  <div key={issue.id} className="issue-card recommended-card">
                    <div className="issue-header">
                      <Info size={14} className="info-icon" />
                      <span className="issue-title">{issue.title}</span>
                      <span className="issue-pts">+{issue.points}pts</span>
                    </div>
                    <p className="issue-msg">{issue.message}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* NICE TO HAVE SECTION */}
        <div className="checklist-group">
          <button 
            className="group-header" 
            onClick={() => toggleSection('niceToHave')}
          >
            <div className="group-title">
              <span className="badge nice-badge">Nice to Have</span>
              <span className="group-count">{niceToHave.length} improvements</span>
            </div>
            {openSections.niceToHave ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {openSections.niceToHave && (
            <div className="group-content">
              {niceToHave.length === 0 ? (
                <div className="empty-checklist">
                  <CheckCircle2 size={16} className="success-icon" />
                  <span>Perfect scores on nice-to-haves!</span>
                </div>
              ) : (
                niceToHave.map((issue) => (
                  <div key={issue.id} className="issue-card nice-card">
                    <div className="issue-header">
                      <Info size={14} className="info-icon" />
                      <span className="issue-title">{issue.title}</span>
                      <span className="issue-pts">+{issue.points}pts</span>
                    </div>
                    <p className="issue-msg">{issue.message}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}