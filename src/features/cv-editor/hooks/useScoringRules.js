import { useMemo } from 'react';

const ACTION_VERBS = new Set([
  'managed', 'led', 'coordinated', 'optimized', 'scaled', 'developed', 
  'spearheaded', 'achieved', 'executed', 'implemented', 'supervised', 
  'administered', 'designed', 'built', 'analyzed', 'created', 'improved', 
  'increased', 'reduced', 'saved', 'resolved', 'partnered', 'prepared', 
  'translated', 'conducted', 'delivered', 'facilitated', 'established'
]);

export function useScoringRules(cvData) {
  return useMemo(() => {
    if (!cvData) return { score: 0, important: [], recommended: [], niceToHave: [] };

    let score = 40; // Base score for correct layout structure
    const important = [];
    const recommended = [];
    const niceToHave = [];

    // 1. Summary Word Count Rule
    const summaryText = cvData.summary || '';
    const summaryWords = summaryText.trim().split(/\s+/).filter(Boolean);
    const summaryWordCount = summaryWords.length;

    if (summaryWordCount > 50) {
      important.push({
        id: 'summary-too-long',
        title: 'Summary is too long',
        message: `Shorten it to be between 20 to 50 words. Right now you use ${summaryWordCount} words.`,
        points: 5,
        type: 'summary'
      });
    } else if (summaryWordCount < 20 && summaryWordCount > 0) {
      important.push({
        id: 'summary-too-short',
        title: 'Summary is too short',
        message: `Elaborate slightly to make it between 20 to 50 words. Right now you use ${summaryWordCount} words.`,
        points: 5,
        type: 'summary'
      });
    } else if (summaryWordCount === 0) {
      important.push({
        id: 'summary-missing',
        title: 'Summary is missing',
        message: 'Add a professional summary at the top of your resume.',
        points: 10,
        type: 'summary'
      });
    } else {
      score += 10;
    }

    // 2. Metrics & Action Verbs in Work Experience
    const jobs = cvData.sections['WORK EXPERIENCE'] || [];
    let jobsWithMetrics = 0;
    let jobsWithActionVerbs = 0;

    jobs.forEach((job, index) => {
      const company = job.company || 'Work Experience';
      let hasMetric = false;
      let hasActionVerb = false;

      job.bullets.forEach(bullet => {
        // Look for numbers or percentages, eg. 100%, $5k, 50+, 20
        if (/\b\d+[%$kM+]*\b/.test(bullet)) {
          hasMetric = true;
        }

        // Clean bullet to find the first word
        const cleanBullet = bullet.replace(/^\*\*(.*?)\*\*:\s*/, '').trim(); // strip bold title
        const firstWord = cleanBullet.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '');
        if (ACTION_VERBS.has(firstWord)) {
          hasActionVerb = true;
        }
      });

      // Limit checking to top 3 jobs to prevent score inflation
      if (index < 3) {
        if (hasMetric) {
          jobsWithMetrics++;
          score += 5;
        } else {
          important.push({
            id: `metric-missing-${index}`,
            title: `Outcome is missing in ${company}`,
            message: 'Add measurable outcomes (numbers, % or currency) to highlight the impact of your actions.',
            points: 3,
            type: 'metric',
            jobIndex: index
          });
        }

        if (hasActionVerb) {
          jobsWithActionVerbs++;
          score += 5;
        } else {
          recommended.push({
            id: `action-missing-${index}`,
            title: `Action words are missing in ${company}`,
            message: 'Start bullet points with strong, ATS-friendly action verbs (e.g. Managed, Led, Optimized).',
            points: 3,
            type: 'action',
            jobIndex: index
          });
        }
      }
    });

    // 3. Skills Section Check
    const skills = cvData.sections['SKILLS'] || [];
    if (skills.length > 0) {
      score += 10;
    } else {
      important.push({
        id: 'skills-missing',
        title: 'Skills section is empty',
        message: 'Add categorized professional skills (e.g. Tools, Systems, Core Competencies).',
        points: 10,
        type: 'skills'
      });
    }

    // 4. Languages check
    const languages = cvData.sections['LANGUAGES'] || [];
    if (languages.length > 0) {
      score += 5;
    } else {
      niceToHave.push({
        id: 'languages-missing',
        title: 'Languages are missing',
        message: 'Explicitly state your language proficiencies to stand out to international employers.',
        points: 2,
        type: 'languages'
      });
    }

    // Nice to have formatting / portfolio checks
    const contactText = cvData.contact || '';
    if (contactText.includes('http') || contactText.includes('linkedin.com')) {
      score += 5;
    } else {
      niceToHave.push({
        id: 'linkedin-missing',
        title: 'LinkedIn profile is missing',
        message: 'Add your LinkedIn or online portfolio link to your contact information.',
        points: 3,
        type: 'portfolio'
      });
    }

    // Clamp score between 0 and 100
    score = Math.min(100, Math.max(0, score));

    return {
      score,
      important,
      recommended,
      niceToHave
    };
  }, [cvData]);
}