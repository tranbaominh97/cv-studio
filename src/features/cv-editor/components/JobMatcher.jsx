import React, { useState, useMemo } from 'react';
import { Target, CheckCircle2, AlertCircle } from 'lucide-react';

const COMMON_SKILLS = [
  'operations', 'administration', 'customer service', 'excel', 'scheduling',
  'compliance', 'safety', 'facility', 'procurement', 'vendor', 'billing',
  'contracts', 'interpreter', 'parent relations', 'management', 'leadership',
  'training', 'recruitment', 'retention', 'budget', 'database', 'logistics'
];

export default function JobMatcher({ cvData }) {
  const [jdText, setJdText] = useState('');
  const [matchResult, setMatchResult] = useState(null);
  const [matching, setMatching] = useState(false);

  const handleMatch = () => {
    if (!jdText.trim() || !cvData) return;
    setMatching(true);

    setTimeout(() => {
      const cvText = JSON.stringify(cvData).toLowerCase();
      const jdLower = jdText.toLowerCase();

      // Extract skills present in JD
      const jdKeywords = COMMON_SKILLS.filter(skill => jdLower.includes(skill));

      // Separate into matched and missing
      const matched = [];
      const missing = [];

      jdKeywords.forEach(keyword => {
        if (cvText.includes(keyword)) {
          matched.push(keyword);
        } else {
          missing.push(keyword);
        }
      });

      const totalCount = jdKeywords.length;
      const matchPercentage = totalCount > 0 ? Math.round((matched.length / totalCount) * 100) : 0;

      setMatchResult({
        matchPercentage,
        matched,
        missing
      });
      setMatching(false);
    }, 800);
  };

  return (
    <div className="job-matcher-widget">
      <h3 className="panel-subtitle">Match Resume with Job Opening</h3>
      <p className="widget-caption">
        Paste the job description below to scan for keyword gaps and optimize your resume for this specific opening.
      </p>

      <textarea
        className="jd-textarea"
        placeholder="Enter the job description here..."
        value={jdText}
        onChange={(e) => setJdText(e.target.value)}
        rows={6}
      />

      <button
        className="match-btn"
        disabled={matching || !jdText.trim()}
        onClick={handleMatch}
      >
        {matching ? 'Matching...' : 'Match Resume'}
      </button>

      {matchResult && (
        <div className="match-results-box">
          {/* Match Score Badge */}
          <div className="match-summary-header">
            <span className="match-label">Keyword Match Rate</span>
            <span className={`match-pct ${matchResult.matchPercentage >= 75 ? 'success' : 'warn'}`}>
              {matchResult.matchPercentage}%
            </span>
          </div>

          <div className="keyword-lists">
            {/* Matched Keywords */}
            <div className="keyword-section">
              <h4 className="kw-section-title">Matched Keywords ({matchResult.matched.length})</h4>
              <div className="kw-tags-container">
                {matchResult.matched.map(kw => (
                  <span key={kw} className="kw-tag matched">
                    <CheckCircle2 size={10} className="kw-icon" /> {kw}
                  </span>
                ))}
                {matchResult.matched.length === 0 && <p className="no-kw-text">No matching keywords found yet.</p>}
              </div>
            </div>

            {/* Missing Keywords */}
            <div className="keyword-section">
              <h4 className="kw-section-title">Missing Keywords ({matchResult.missing.length})</h4>
              <div className="kw-tags-container">
                {matchResult.missing.map(kw => (
                  <span key={kw} className="kw-tag missing">
                    <AlertCircle size={10} className="kw-icon" /> {kw}
                  </span>
                ))}
                {matchResult.missing.length === 0 && (
                  <p className="no-kw-text success-text">Great! You have all keywords present.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}