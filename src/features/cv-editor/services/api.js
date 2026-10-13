export const cvApi = {
  async fetchCVs() {
    const res = await fetch('/api/cvs');
    if (!res.ok) throw new Error('Failed to fetch CV list');
    return res.json();
  },

  async fetchCV(filename) {
    const res = await fetch(`/api/cv?file=${encodeURIComponent(filename)}`);
    if (!res.ok) throw new Error('Failed to fetch CV data');
    return res.json();
  },

  async saveCV(filename, cvData) {
    const res = await fetch(`/api/cv?file=${encodeURIComponent(filename)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cvData),
    });
    if (!res.ok) throw new Error('Failed to save CV data');
    return res.json();
  },

  async generatePDF(filename, cvData) {
    const res = await fetch(`/api/pdf?file=${encodeURIComponent(filename)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cvData),
    });
    if (!res.ok) throw new Error('Failed to generate PDF');
    return res.json();
  }
};