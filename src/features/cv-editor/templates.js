export const defaultLayout = { fontSize: 11, lineHeight: 1.45, sectionGap: 10, margin: 10 };

export const templates = [
  { id: 'minimal', name: 'Tối giản', description: 'Một cột, đen trắng. Tập trung vào nội dung.', photo: false },
  { id: 'executive', name: 'Điều hành', description: 'Xanh navy, tên serif và đường kẻ đôi trang trọng.', photo: true },
  { id: 'ivory', name: 'Sắc kem', description: 'Cột hồ sơ màu kem, ảnh tròn và chữ serif mềm mại.', photo: true, columns: true, sidebarIdentity: true },
  { id: 'slate', name: 'Tương phản', description: 'Hồ sơ trên nền than, nội dung sáng và gọn.', photo: true, columns: true, sidebarIdentity: true },
  { id: 'editorial', name: 'Biên tập', description: 'Tên lớn, nhãn mục bên lề như một trang tạp chí.', photo: false },
  { id: 'timeline', name: 'Dòng thời gian', description: 'Các mốc kinh nghiệm nối dọc, điểm nhấn xanh ngọc.', photo: true },
  { id: 'swiss', name: 'Thụy Sĩ', description: 'Bố cục hình học, đánh số mục và sắc đỏ gạch.', photo: false },
  { id: 'studio', name: 'Sáng tạo', description: 'Hai cột, ảnh tròn, hồng đất và tiêu đề thanh thoát.', photo: true, columns: true },
  { id: 'metro', name: 'Đô thị', description: 'Cột phụ bên trái, khối tên xanh và đường nét rõ.', photo: true, columns: true },
  { id: 'academic', name: 'Học thuật', description: 'Serif đen trắng, tên căn giữa và mục kiểu cổ điển.', photo: false },
  { id: 'compact', name: 'Tinh gọn', description: 'Tên và liên hệ song song, nhãn mục nền xám nhẹ.', photo: false },
  { id: 'elegant', name: 'Thanh lịch', description: 'Tiêu đề serif, đường kẻ nhẹ và khoảng thở.', photo: false },
  { id: 'portrait', name: 'Chân dung', description: 'Ảnh cạnh tên, bố cục một cột rõ ràng.', photo: true },
  { id: 'modern', name: 'Hiện đại', description: 'Hai cột, kỹ năng và liên hệ ở cột phụ.', photo: true, columns: true },
  { id: 'bold', name: 'Nổi bật', description: 'Khối tiêu đề nổi bật với màu xanh nhấn.', photo: true },
];

export const getTemplate = id => templates.find(template => template.id === id) || templates[0];

export function createCVDocument(source, templateId) {
  if (!templates.some(template => template.id === templateId)) throw new Error('Mẫu CV không hợp lệ.');
  if (source?.data.type === 'cover-letter') throw new Error('Hãy chọn một CV làm nội dung nguồn.');
  return {
    data: source ? structuredClone(source.data) : {
      name: 'Họ và tên', contact: 'Email • Số điện thoại • Địa chỉ', summary: '',
      sections: { 'WORK EXPERIENCE': [], EDUCATION: [], SKILLS: [] },
    },
    layout: { ...(source?.layout || defaultLayout), templateId },
  };
}

export function letterLayout(layout = defaultLayout) {
  return Object.fromEntries(Object.keys(defaultLayout).map(key => [key, layout[key]]));
}

export function validateAppearance(layout) {
  if (layout.templateId !== undefined && !templates.some(template => template.id === layout.templateId)) {
    throw new Error('Mẫu CV không hợp lệ.');
  }
  if (layout.photo !== undefined && layout.photo !== null &&
      (typeof layout.photo !== 'string' || layout.photo.length > 2_000_000 ||
       !/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(layout.photo))) {
    throw new Error('Ảnh chân dung không hợp lệ. Hãy chọn lại ảnh.');
  }
}
