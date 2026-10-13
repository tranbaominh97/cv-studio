export const letterFields = ['name', 'contact', 'date', 'recipient', 'subject', 'salutation', 'body', 'closing', 'signature'];
export const letterMarker = '<!-- cv-studio:cover-letter -->';

export function createCoverLetter(cv) {
  return {
    type: 'cover-letter', name: cv?.name || 'Họ và tên', contact: cv?.contact || 'Email • Số điện thoại • Địa chỉ',
    date: new Date().toLocaleDateString('vi-VN'), recipient: 'Hiring Manager\nCompany name',
    subject: 'Application for [Position]', salutation: 'Dear Hiring Manager,',
    body: '[Giới thiệu vị trí ứng tuyển và lý do bạn quan tâm.]\n\n[Kinh nghiệm, thành tựu và kỹ năng phù hợp từ CV.]\n\n[Lý do muốn làm việc tại công ty và lời cảm ơn.]',
    closing: 'Sincerely,', signature: cv?.name || 'Họ và tên',
  };
}
